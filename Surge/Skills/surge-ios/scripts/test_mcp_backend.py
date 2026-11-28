#!/usr/bin/env python3
"""Offline regression tests: never connect to Surge or modify its profile."""
import base64
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import surge_cli as cli
import surge_mcp as mcp


class MappingTests(unittest.TestCase):
    def mapped(self, argv):
        return mcp.route(cli.normalize(argv))

    def test_speed_normalization_preserves_event(self):
        tool, args, _ = self.mapped(['watch', 'speed', '2'])
        self.assertEqual((tool, args), ('watch_events', {'events': ['real-time-speed'], 'seconds': 2}))

    def test_log_watch_uses_subscription(self):
        tool, args, _ = self.mapped(['log', 'watch', '2'])
        self.assertEqual((tool, args), ('watch_events', {'events': ['log'], 'seconds': 2}))

    def test_explicit_watch_events(self):
        tool, args, _ = self.mapped(['watch', 'dns,request-update', '3'])
        self.assertEqual(args, {'events': ['dns', 'request-update'], 'seconds': 3})

    def test_watch_rejects_unknown_event(self):
        with self.assertRaises(mcp.BackendError):
            self.mapped(['watch', 'invented-event', '2'])

    def test_section_keeps_revision_and_whitespace(self):
        raw = {'result': 'Section: [General]\nFile: Test.conf\nEditable: yes\nRevision: abc123\nLines: 2\n\n  # comment\nfoo = bar\n'}
        result = mcp._section_content(raw, None)
        self.assertEqual(result['content'], '  # comment\nfoo = bar\n')
        self.assertEqual(result['revision'], 'abc123')
        self.assertEqual(result['section'], 'General')
        self.assertEqual(result['file'], 'Test.conf')
        self.assertIs(result['editable'], True)
        self.assertEqual(result['lines'], 2)

    def test_empty_section_stays_empty(self):
        raw = {'result': 'Section: [Rule]\nFile: Test.conf\nEditable: yes\nRevision: abc\nLines: 0\n\n'}
        self.assertEqual(mcp._section_content(raw, None)['content'], '')

    def test_script_context_survives_normalization(self):
        with tempfile.TemporaryDirectory() as tmp:
            script = Path(tmp) / 'test.js'
            script.write_text('$done({ok:true});')
            for kind in ('generic', 'http-response', 'http-request', 'cron', 'event', 'rule', 'dns'):
                with self.subTest(kind=kind):
                    tool, args, _ = self.mapped(['script', 'evaluate', str(script), kind, '5'])
                    self.assertEqual(args['type'], kind)
                    self.assertEqual(args['code'], '$done({ok:true});')

    def test_rule_ports_and_cli_hyphen_flags(self):
        _, args, _ = self.mapped(['rule', 'explain', 'example.com', '8443', 'source-port=1234', 'listen_port=8080', 'http-host=www.example.com', 'is-local=false'])
        self.assertEqual(args['port'], 8443)
        self.assertEqual(args['source_port'], 1234)
        self.assertEqual(args['listen_port'], 8080)
        self.assertEqual(args['http_host'], 'www.example.com')
        self.assertIs(args['is_local'], False)

    def test_runtime_breakdown_preserves_both_dimensions(self):
        _, args, _ = self.mapped(['dump', 'traffic-stat-breakdown', 'policy', 'host'])
        self.assertEqual(args['argument'], 'policy host')

    def test_feature_returns_reported_state(self):
        _, _, adapt = self.mapped(['feature', 'set', 'mitm', 'on'])
        result = {'enabled': False, 'feature': 'mitm', 'detail': 'reported by controller'}
        self.assertEqual(adapt(result, None) if adapt else result, result)

    def test_capture_get_does_not_invent_filter_scope_parameter(self):
        tool, args, adapt = self.mapped(['capture-filter', 'get', 'on-disk'])
        self.assertEqual((tool, args), ('get_capture_filters', {}))

    def test_invalid_boolean_is_not_false(self):
        with self.assertRaises(mcp.BackendError):
            self.mapped(['feature', 'set', 'mitm', 'typo'])

    def test_section_set_passes_revision(self):
        encoded = base64.b64encode(b'foo = bar\n').decode()
        tool, args, _ = mcp.route(['profile', 'section', 'set', 'General', encoded, 'rev'])
        self.assertEqual(args, {'section': 'General', 'content': 'foo = bar\n', 'revision': 'rev'})

    def test_restart_ponte_server_maps_to_mcp_tool(self):
        tool, args, _ = self.mapped(['restart-ponte-server'])
        self.assertEqual((tool, args), ('restart_ponte_server', {}))

    def test_original_profile_is_not_lost_in_normalize(self):
        self.assertEqual(cli.normalize(['dump', 'profile', 'original'], http_backend=True), ['dump', 'profile', 'original'])

    def test_http_profile_diff_fetches_both_variants(self):
        controller = mcp.McpController('http://127.0.0.1:6171', 'test-only')
        calls = []
        def fake(name, args):
            calls.append((name, args))
            return {'result': args['variant'] + '\n'}
        controller.call = fake
        result = controller.run(['profile', 'diff'])[0]
        self.assertEqual(result, {'originalProfile': 'original\n', 'profile': 'effective\n'})
        self.assertEqual([args['variant'] for _, args in calls], ['original', 'effective'])

    def test_http_current_uses_status(self):
        tool, args, _ = mcp.route(['profile', 'current'])
        self.assertEqual(tool, 'get_status')

    def test_list_tools_pagination(self):
        controller = mcp.McpController('http://127.0.0.1:6171', 'test-only')
        controller._ready = True
        with patch.object(controller, '_rpc', side_effect=[{'tools': [{'name': 'one'}], 'nextCursor': 'next'}, {'tools': [{'name': 'two'}]}]) as rpc:
            self.assertEqual([t['name'] for t in controller.list_tools()], ['one', 'two'])
            self.assertEqual(rpc.call_args_list[1].args, ('tools/list', {'cursor': 'next'}))

    def test_mcp_call_reads_json_file(self):
        controller = mcp.McpController('http://127.0.0.1:6171', 'test-only')
        with tempfile.TemporaryDirectory() as tmp:
            argsfile = Path(tmp) / 'args.json'
            argsfile.write_text('{"domain":"example.com","trace":true}')
            with patch.object(controller, 'call', return_value={'ok': True}) as call:
                self.assertEqual(controller.run(['mcp', 'call', 'dns_lookup', str(argsfile)]), [{'ok': True}])
                call.assert_called_once_with('dns_lookup', {'domain': 'example.com', 'trace': True})

    def test_mcp_schema_is_metadata_only(self):
        controller = mcp.McpController('http://127.0.0.1:6171', 'test-only')
        with patch.object(controller, 'list_tools', return_value=[{'name': 'get_status', 'inputSchema': {'type': 'object'}}]), patch.object(controller, 'call') as call:
            self.assertEqual(controller.run(['mcp', 'schema', 'get_status'])[0]['name'], 'get_status')
            call.assert_not_called()

    def test_mcp_bad_json_is_rejected(self):
        controller = mcp.McpController('http://127.0.0.1:6171', 'test-only')
        with tempfile.TemporaryDirectory() as tmp:
            argsfile = Path(tmp) / 'args.json'
            argsfile.write_text('[]')
            with self.assertRaises(mcp.BackendError):
                controller.run(['mcp', 'call', 'get_status', str(argsfile)])

    def test_script_engine_and_argument(self):
        encoded = base64.b64encode(b'$done({});').decode()
        _, args, _ = mcp.route(['script', 'evaluate', encoded, '3', '9', 'webview', 'mode=test'])
        self.assertEqual((args['engine'], args['argument']), ('webview', 'mode=test'))

    def test_capture_offset_without_part(self):
        _, args, _ = self.mapped(['capture', 'session-body', 'S', 'K', '--offset', '524288'])
        self.assertNotIn('part', args)
        self.assertEqual(args['offset'], 524288)

    def test_invalid_bandwidth_direction(self):
        with self.assertRaises(mcp.BackendError):
            self.mapped(['test-policy-bandwidth', 'bogus', 'DIRECT'])

    def test_nil_alias(self):
        _, args, _ = self.mapped(['set', 'AutoPolicyGroupOverride.Test=(null)'])
        self.assertIsNone(args['values']['AutoPolicyGroupOverride.Test'])

    def test_official_module_and_avoid_spelling(self):
        self.assertEqual(self.mapped(['module', 'show', 'test'])[:2], ('get_module', {'name': 'test'}))
        self.assertEqual(self.mapped(['policy-avoid', 'list'])[:2], ('set_policy_avoidance', {'action': 'list'}))

    def test_official_capture_spelling(self):
        self.assertEqual(self.mapped(['capture-session', 'list', 'include-size'])[:2], ('list_capture_sessions', {'include_size': True}))
        self.assertEqual(self.mapped(['capture-session', 'dump', 'S', 'limit=20', 'offset=5', 'filter=example.com'])[:2], ('list_capture_session_requests', {'session': 'S', 'limit': 20, 'offset': 5, 'filter': 'example.com'}))
        self.assertEqual(self.mapped(['capture-session', 'data', 'S', 'K', 'response', 'offset=100'])[:2], ('get_capture_session_body', {'session': 'S', 'key': 'K', 'part': 'response', 'offset': 100}))

    def test_capture_length_must_not_be_silently_ignored(self):
        with self.assertRaises(mcp.BackendError):
            self.mapped(['capture-session', 'data', 'S', 'K', 'response', 'length=100'])

    def test_dest_port_alias(self):
        _, args, _ = self.mapped(['rule', 'match', 'example.com', 'dest-port=8443'])
        self.assertEqual(args['port'], 8443)

    def test_capture_filter_get_selects_local_scope(self):
        _, _, adapt = self.mapped(['capture-filter', 'get', 'on-disk'])
        value = {'active': 'in-memory', 'filters': {'on-disk': {'httpOnly': True}}}
        self.assertEqual(adapt(value, None), {'scope': 'on-disk', 'active': False, 'filter': {'httpOnly': True}})


if __name__ == '__main__':
    unittest.main()
