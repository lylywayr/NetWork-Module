#!/bin/sh
# Sync the Surge-bundled official skill without a Mac.
# The official skill has no standalone download: it ships inside Surge for Mac,
# which is published as a zip. This pulls that zip, extracts Skills/surge and
# compares it with this skill.
#
#   sync_upstream_zip.sh            download + diff, changes nothing
#   sync_upstream_zip.sh --apply    also replace references/command-reference.md
#                                   (upstream text, §1.1 swapped for the Minis note)
#                                   and references/plugin-authoring.md
#
# Upstream SKILL.md is never applied automatically: read it and merge by hand.
set -eu
APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1
URL=https://dl.nssurge.com/mac/v6/Surge-latest.zip
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
OUT=/tmp/surge-upstream-zip
ZIP="$OUT/Surge-latest.zip"
mkdir -p "$OUT"; rm -rf "$OUT/Surge.app"

if [ -s "$ZIP" ] && unzip -tq "$ZIP" >/dev/null 2>&1; then
  echo "reusing $ZIP"
else
  echo "downloading $URL"
  # -C - resumes a partial file; a failed transfer leaves the partial in place.
  curl -L --fail --retry 3 --retry-delay 3 -C - --max-time 1800 "$URL" -o "$ZIP"
fi
echo "size: $(wc -c < "$ZIP") bytes"

cd "$OUT"
unzip -q -o "$ZIP" 'Surge.app/Contents/Resources/Skills/*' 'Surge.app/Contents/Info.plist'
SRC="$OUT/Surge.app/Contents/Resources/Skills/surge"
VER="$(unzip -p "$ZIP" Surge.app/Contents/Info.plist | tr -d '\n' | sed -n 's|.*<key>CFBundleShortVersionString</key>[[:space:]]*<string>\([^<]*\)</string>.*<key>CFBundleVersion</key>[[:space:]]*<string>\([^<]*\)</string>.*|\1 (\2)|p')"
[ -n "$VER" ] || VER=unknown

python3 - "$SRC/references/command-reference.md" "$OUT/adapted.md" <<'PY'
import sys
t = open(sys.argv[1]).read()
s = t.index("### 1.1 Basic format")
e = t.index("### 1.2 Response envelope", s)
note = '''### 1.1 Basic format (Minis)

> Synced from the Surge-bundled skill; only this subsection is Minis-specific.
> `/usr/local/bin/surge-cli` is a Python client talking to the Surge iOS External Controller.

```bash
surge-cli [--remote host:port] [--password-stdin] [--raw] <command> [args...]
```

- Default `http://127.0.0.1:6171` (HTTP API / MCP). `-r 127.0.0.1:6170` uses the Mac Controller line protocol; `--remote` works for other instances too.
- MCP: iOS 6.0.0+ / Mac 6.11.0+, requires `http-api-mcp = true`; stateless Streamable HTTP, every POST returns one JSON body.
- On the HTTP/MCP backend, `tools/call` returns `content` text plus optional `structuredContent`; `isError` marks a failed tool call and a result is capped at about 256 KiB (a large dump may be truncated into invalid JSON). There is no `hasMore` stream — `watch` is a bounded 1–60 s window. Use `mcp schema <tool>` for the authoritative parameters.
- Password from `--password-stdin` or `SURGE_CLI_PASSWORD`; never in argv.
- Prefer `--raw` for exact JSON; human formatting exists only for common commands. The HTTP/MCP backend has a fixed route table, so unsupported commands fail explicitly instead of being passed through.
- `mcp tools`, `mcp schema <tool>` and `mcp call <tool> <args.json|->` expose the exact official tool schema and any parameter the CLI mapping lacks.
- `--check <path>` uploads that file to Surge's online validator (`services.nssurge.com`); there is no local parser in iSH. Redact secrets first; never upload the active profile implicitly.
- `lsp`, interactive mode, `plugin validate|pack`, `vmnet`, `device` are macOS-only and not available here.

'''
open(sys.argv[2], 'w').write(t[:s] + note + t[e:])
PY

diff -u "$SKILL/references/command-reference.md" "$OUT/adapted.md" > "$OUT/command-reference.diff" || true
echo "upstream: $VER"
echo "command-reference.md: $(grep -c '^[+-][^+-]' "$OUT/command-reference.diff" || true) changed lines (see $OUT/command-reference.diff)"
if [ "$APPLY" = 1 ]; then
  cp "$OUT/adapted.md" "$SKILL/references/command-reference.md"
  cp "$SRC/references/plugin-authoring.md" "$SKILL/references/plugin-authoring.md"
  printf 'Surge %s, synced %s\n' "$VER" "$(date +%F)" > "$SKILL/references/UPSTREAM_VERSION"
  echo "applied command-reference.md + plugin-authoring.md"
fi
echo "SKILL.md: not applied; read $SRC/SKILL.md and merge new workflows by hand"
