var API_URL = "https://api.kuaimiaov4.com/appV4api/manusAi/applyLogin";

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

var deviceKey = getRandomInt(10000000, 99999999);
console.log("🔑 deviceKey: " + deviceKey);

$httpClient.post({
    url: API_URL,
    headers: {
        "Content-Type": "application/json",
        "User-Agent": "Dart/3.12 (dart:io)"
    },
    body: JSON.stringify({ deviceKey: deviceKey })
}, function(error, response, data) {
    if (error) {
        console.log("❌ 请求失败: " + error);
        $notification.post("获取失败", "网络错误", error);
        $done();
        return;
    }

    console.log("📡 状态码: " + response.status);
    console.log("📄 返回数据: " + data);

    try {
        var json = JSON.parse(data);
        var ymlUrl = json.data && json.data.ymlUrl ? json.data.ymlUrl : null;
        if (ymlUrl) {
            console.log("✅ 成功获取 ymlUrl: " + ymlUrl);
            $notification.post("获取成功", "ymlUrl 已提取", ymlUrl);
        } else {
            console.log("⚠️ 未找到 ymlUrl");
            $notification.post("获取失败", "未找到 ymlUrl", data.substring(0, 100));
        }
    } catch (e) {
        console.log("❌ 解析 JSON 失败: " + e);
        $notification.post("获取失败", "解析出错", e);
    }

    $done();
});