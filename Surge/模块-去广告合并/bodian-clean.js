/*
 * 波点音乐 · 应用配置净化（开屏广告开关）
 * 仅处理 /api/service/conf/all，删除广告相关开关并关闭 P2P。
 */
(function () {
  var raw = ($response && $response.body) || '';
  var DROP = [
    ['data', 'groupSign', 'adStartAppDialog'],
    ['data', 'groupSign', 'adGuideTest'],
    ['data', 'groupSign', 'playTips'],
    ['data', 'groupSign', 'adExitChange'],
    ['data', 'conf', 'adGuidePopCount'],
    ['data', 'conf', 'adDownListOpen']
  ];

  function drop(obj, path) {
    var cur = obj;
    for (var i = 0; i < path.length - 1; i++) {
      if (!cur || typeof cur !== 'object') return;
      cur = cur[path[i]];
    }
    if (cur && typeof cur === 'object') delete cur[path[path.length - 1]];
  }

  try {
    var obj = JSON.parse(raw);
    for (var i = 0; i < DROP.length; i++) drop(obj, DROP[i]);
    var fc = obj && obj.data && obj.data.conf && obj.data.conf.flowControlConfig;
    if (fc && typeof fc === 'object') {
      fc.uploadEnable = false;
      fc.p2pEnable = false;
    }
    raw = JSON.stringify(obj);
  } catch (e) {
    /* 非 JSON 或结构变更时原样放行 */
  }

  $done({ body: raw });
})();
