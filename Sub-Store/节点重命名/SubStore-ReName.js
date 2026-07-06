/**
 * =============================================================================
 * 脚本名称：Sub-Store 节点重命名脚本 (SubStore-ReName.js)
 * 版本：4.5.2
 * 更新日期：2026-06-30
 *
 * 适用环境：Sub-Store 脚本操作（包括通过 Surge 模块运行的 Sub-Store）。
 *
 * 功能：
 * - 节点去重、地区识别、统一重命名、国旗、前缀、连续编号。
 * - 提取自定义关键词、倍率、测速、解锁标签及固定线路标识。
 * - 清理订阅提示节点，按需过滤中国大陆节点。
 * - pcgn=1 时删除所有大陆节点；但“沪港、沪日、深新、北京-日本”等
 *   明确的大陆入口 + 境外目的地中转节点会保留，并在最终名称末尾追加“中转”。
 *
 * 使用方式：
 * 在 Sub-Store 的“脚本操作”中引用本脚本，并以 URL # 片段传参：
 * https://raw.githubusercontent.com/你的用户名/仓库名/SubStore-ReName.js#参数1=值&参数2=值
 *
 * 布尔参数：1 / true 为启用；0 或不传为关闭。
 *
 * 参数说明：
 * - in=zh|en|quan|flag：输入地区格式；默认自动识别。
 * - out=zh|en|quan|flag：输出地区格式；默认 zh（中文）。
 * - fgf=分隔符：默认空格；0 为无分隔符；其他值原样使用。
 * - name=机场名称：最终名称前缀。
 * - one=1：某地区只有一个节点时移除 01 序号。
 * - blkey=A+B>C：保留关键词；支持“原词>新词”。
 * - blgd=1：保留 IPLC、IEPL、核心、边缘、家宽等固定标识。
 * - bl=1：倍率显示为 2×；blbz=1：倍率显示为 2倍率（优先于 bl）。
 * - blcs=1：提取测速信息，例如 89.10Mbps。
 * - blnx=1：只保留高倍率节点；nx=1：过滤 1x 或无倍率节点。
 * - blpx=1：按原规则调整倍率 / 特殊标识节点排序。
 * - jsjd=1：提取 GPT、Netflix、Disney、YouTube 等解锁标签。
 * - clear=1：清理套餐、到期、官网、流量、公告、订阅提示等非节点项目。
 * - pcgn=1：删除大陆节点；保留明确跨境中转节点，并在名称末尾添加“中转”。
 * - key=1：启用原有内部额外过滤规则。
 * - nm=1：保留未识别地区节点，仅加前缀；否则删除。
 * - jdqc=1：按 server + port + type 去重。
 * - jdqcyg=1：同 server 仅保留一个，按协议优先级选择。
 * - jjdqc=1：仅去重，其他参数均不执行。
 * - flag=1：节点名最前添加国旗。
 * - blockquic=on|off：写入 block-quic 值；不传则删除该字段。
 * - debug=1：预留调试参数，当前不输出日志。
 * =============================================================================
 */

const inArg = $arguments || {};
const parseBool = (value) => value === true || value === 1 || value === "1" || value === "true";

const nx = parseBool(inArg.nx);
const bl = parseBool(inArg.bl);
const blbz = parseBool(inArg.blbz);
const blcs = parseBool(inArg.blcs);
const key = parseBool(inArg.key);
const blgd = parseBool(inArg.blgd);
const blpx = parseBool(inArg.blpx);
const blnx = parseBool(inArg.blnx);
const numone = parseBool(inArg.one);
const clear = parseBool(inArg.clear);
const addflag = parseBool(inArg.flag);
const nm = parseBool(inArg.nm);
const pcgn = parseBool(inArg.pcgn);
const jdqc = parseBool(inArg.jdqc);
const jdqcyg = parseBool(inArg.jdqcyg);
const jjdqc = parseBool(inArg.jjdqc);
const jsjd = parseBool(inArg.jsjd);
const debug = parseBool(inArg.debug);

const FGF = inArg.fgf === undefined ? " " : (String(inArg.fgf) === "0" ? "" : String(inArg.fgf));
const FNAME = inArg.name === undefined ? "" : String(inArg.name);
const BLKEY = inArg.blkey === undefined ? "" : String(inArg.blkey);
const blockquic = inArg.blockquic === undefined ? "" : String(inArg.blockquic).toLowerCase();

const nameMap = {
  cn: "cn", zh: "cn",
  us: "us", en: "us",
  quan: "quan",
  gq: "gq", flag: "gq"
};

const inname = nameMap[String(inArg.in || "").toLowerCase()] || "";
const outputName = nameMap[String(inArg.out || "").toLowerCase()] || "";

// ==========================================================================
// 地区映射数据
// ==========================================================================

const FG = "🇭🇰|🇲🇴|🇹🇼|🇯🇵|🇰🇷|🇸🇬|🇺🇸|🇬🇧|🇫🇷|🇩🇪|🇦🇺|🇦🇪|🇦🇫|🇦🇱|🇩🇿|🇦🇴|🇦🇷|🇦🇲|🇦🇹|🇦🇿|🇧🇭|🇧🇩|🇧🇾|🇧🇪|🇧🇿|🇧🇯|🇧🇹|🇧🇴|🇧🇦|🇧🇼|🇧🇷|🇻🇬|🇧🇳|🇧🇬|🇧🇫|🇧🇮|🇰🇭|🇨🇲|🇨🇦|🇨🇻|🇰🇾|🇨🇫|🇹🇩|🇨🇱|🇨🇴|🇰🇲|🇨🇬|🇨🇩|🇨🇷|🇭🇷|🇨🇾|🇨🇿|🇩🇰|🇩🇯|🇩🇴|🇪🇨|🇪🇬|🇸🇻|🇬🇶|🇪🇷|🇪🇪|🇪🇹|🇫🇯|🇫🇮|🇬🇦|🇬🇲|🇬🇪|🇬🇭|🇬🇷|🇬🇱|🇬🇹|🇬🇳|🇬🇾|🇭🇹|🇭🇳|🇭🇺|🇮🇸|🇮🇳|🇮🇩|🇮🇷|🇮🇶|🇮🇪|🇮🇲|🇮🇱|🇮🇹|🇨🇮|🇯🇲|🇯🇴|🇰🇿|🇰🇪|🇰🇼|🇰🇬|🇱🇦|🇱🇻|🇱🇧|🇱🇸|🇱🇷|🇱🇾|🇱🇹|🇱🇺|🇲🇰|🇲🇬|🇲🇼|🇲🇾|🇲🇻|🇲🇱|🇲🇹|🇲🇷|🇲🇺|🇲🇽|🇲🇩|🇲🇨|🇲🇳|🇲🇪|🇲🇦|🇲🇿|🇲🇲|🇳🇦|🇳🇵|🇳🇱|🇳🇿|🇳🇮|🇳🇪|🇳🇬|🇰🇵|🇳🇴|🇴🇲|🇵🇰|🇵🇦|🇵🇾|🇵🇪|🇵🇭|🇵🇹|🇵🇷|🇶🇦|🇷🇴|🇷🇺|🇷🇼|🇸🇲|🇸🇦|🇸🇳|🇷🇸|🇸🇱|🇸🇰|🇸🇮|🇸🇴|🇿🇦|🇪🇸|🇱🇰|🇸🇩|🇸🇷|🇸🇿|🇸🇪|🇨🇭|🇸🇾|🇹🇯|🇹🇿|🇹🇭|🇹🇬|🇹🇴|🇹🇹|🇹🇳|🇹🇷|🇹🇲|🇻🇮|🇺🇬|🇺🇦|🇺🇾|🇺🇿|🇻🇪|🇻🇳|🇾🇪|🇿🇲|🇿🇼|🇦🇩|🇷🇪|🇵🇱|🇬🇺|🇻🇦|🇱🇮|🇨🇼|🇸🇨|🇦🇶|🇬🇮|🇨🇺|🇫🇴|🇦🇽|🇧🇲|🇹🇱".split("|");

const EN = "HK|MO|TW|JP|KR|SG|US|GB|FR|DE|AU|AE|AF|AL|DZ|AO|AR|AM|AT|AZ|BH|BD|BY|BE|BZ|BJ|BT|BO|BA|BW|BR|VG|BN|BG|BF|BI|KH|CM|CA|CV|KY|CF|TD|CL|CO|KM|CG|CD|CR|HR|CY|CZ|DK|DJ|DO|EC|EG|SV|GQ|ER|EE|ET|FJ|FI|GA|GM|GE|GH|GR|GL|GT|GN|GY|HT|HN|HU|IS|IN|ID|IR|IQ|IE|IM|IL|IT|CI|JM|JO|KZ|KE|KW|KG|LA|LV|LB|LS|LR|LY|LT|LU|MK|MG|MW|MY|MV|ML|MT|MR|MU|MX|MD|MC|MN|ME|MA|MZ|MM|NA|NP|NL|NZ|NI|NE|NG|KP|NO|OM|PK|PA|PY|PE|PH|PT|PR|QA|RO|RU|RW|SM|SA|SN|RS|SL|SK|SI|SO|ZA|ES|LK|SD|SR|SZ|SE|CH|SY|TJ|TZ|TH|TG|TO|TT|TN|TR|TM|VI|UG|UA|UY|UZ|VE|VN|YE|ZM|ZW|AD|RE|PL|GU|VA|LI|CW|SC|AQ|GI|CU|FO|AX|BM|TL".split("|");

const ZH = "香港|澳门|台湾|日本|韩国|新加坡|美国|英国|法国|德国|澳大利亚|阿联酋|阿富汗|阿尔巴尼亚|阿尔及利亚|安哥拉|阿根廷|亚美尼亚|奥地利|阿塞拜疆|巴林|孟加拉国|白俄罗斯|比利时|伯利兹|贝宁|不丹|玻利维亚|波斯尼亚和黑塞哥维那|博茨瓦纳|巴西|英属维京群岛|文莱|保加利亚|布基纳法索|布隆迪|柬埔寨|喀麦隆|加拿大|佛得角|开曼群岛|中非共和国|乍得|智利|哥伦比亚|科摩罗|刚果(布)|刚果(金)|哥斯达黎加|克罗地亚|塞浦路斯|捷克|丹麦|吉布提|多米尼加共和国|厄瓜多尔|埃及|萨尔瓦多|赤道几内亚|厄立特里亚|爱沙尼亚|埃塞俄比亚|斐济|芬兰|加蓬|冈比亚|格鲁吉亚|加纳|希腊|格陵兰|危地马拉|几内亚|圭亚那|海地|洪都拉斯|匈牙利|冰岛|印度|印尼|伊朗|伊拉克|爱尔兰|马恩岛|以色列|意大利|科特迪瓦|牙买加|约旦|哈萨克斯坦|肯尼亚|科威特|吉尔吉斯斯坦|老挝|拉脱维亚|黎巴嫩|莱索托|利比里亚|利比亚|立陶宛|卢森堡|马其顿|马达加斯加|马拉维|马来|马尔代夫|马里|马耳他|毛利塔尼亚|毛里求斯|墨西哥|摩尔多瓦|摩纳哥|蒙古|黑山共和国|摩洛哥|莫桑比克|缅甸|纳米比亚|尼泊尔|荷兰|新西兰|尼加拉瓜|尼日尔|尼日利亚|朝鲜|挪威|阿曼|巴基斯坦|巴拿马|巴拉圭|秘鲁|菲律宾|葡萄牙|波多黎各|卡塔尔|罗马尼亚|俄罗斯|卢旺达|圣马力诺|沙特阿拉伯|塞内加尔|塞尔维亚|塞拉利昂|斯洛伐克|斯洛文尼亚|索马里|南非|西班牙|斯里兰卡|苏丹|苏里南|斯威士兰|瑞典|瑞士|叙利亚|塔吉克斯坦|坦桑尼亚|泰国|多哥|汤加|特立尼达和多巴哥|突尼斯|土耳其|土库曼斯坦|美属维尔京群岛|乌干达|乌克兰|乌拉圭|乌兹别克斯坦|委内瑞拉|越南|也门|赞比亚|津巴布韦|安道尔|留尼汪|波兰|关岛|梵蒂冈|列支敦士登|库拉索|塞舌尔|南极|直布罗陀|古巴|法罗群岛|奥兰群岛|百慕达|东帝汶".split("|");

const QC = "Hong Kong|Macao|Taiwan|Japan|Korea|Singapore|United States|United Kingdom|France|Germany|Australia|Dubai|Afghanistan|Albania|Algeria|Angola|Argentina|Armenia|Austria|Azerbaijan|Bahrain|Bangladesh|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia and Herzegovina|Botswana|Brazil|British Virgin Islands|Brunei|Bulgaria|Burkina-faso|Burundi|Cambodia|Cameroon|Canada|CapeVerde|CaymanIslands|Central African Republic|Chad|Chile|Colombia|Comoros|Congo-Brazzaville|Congo-Kinshasa|CostaRica|Croatia|Cyprus|Czech Republic|Denmark|Djibouti|Dominican Republic|Ecuador|Egypt|EISalvador|Equatorial Guinea|Eritrea|Estonia|Ethiopia|Fiji|Finland|Gabon|Gambia|Georgia|Ghana|Greece|Greenland|Guatemala|Guinea|Guyana|Haiti|Honduras|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Isle of Man|Israel|Italy|Ivory Coast|Jamaica|Jordan|Kazakstan|Kenya|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Lithuania|Luxembourg|Macedonia|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Mauritania|Mauritius|Mexico|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar(Burma)|Namibia|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|NorthKorea|Norway|Oman|Pakistan|Panama|Paraguay|Peru|Philippines|Portugal|PuertoRico|Qatar|Romania|Russia|Rwanda|SanMarino|SaudiArabia|Senegal|Serbia|SierraLeone|Slovakia|Slovenia|Somalia|SouthAfrica|Spain|SriLanka|Sudan|Suriname|Swaziland|Sweden|Switzerland|Syria|Tajikstan|Tanzania|Thailand|Togo|Tonga|TrinidadandTobago|Tunisia|Turkey|Turkmenistan|U.S.Virgin Islands|Uganda|Ukraine|Uruguay|Uzbekistan|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe|Andorra|Reunion|Poland|Guam|Vatican|Liechtensteins|Curacao|Seychelles|Antarctica|Gibraltar|Cuba|Faroe Islands|Ahvenanmaa|Bermuda|Timor-Leste".split("|");

// ==========================================================================
// 过滤与提取规则
// ==========================================================================

const specialRegex = [
  /(\d\.)?\d+×/,
  /IPLC|IEPL|Kern|Edge|Pro|Std|Exp|Biz|Fam|Game|Buy|Zx|LB|Game/
];

const nameclear = /套餐|到期|有效期|剩余(?:流量|时间)?|版本|已用|过期|失联|测试|官方|官网|网址|备用|客服|网站|获取|订阅(?:地址|链接)?|流量(?:包|已用|剩余|重置)?|机场|下次|官址|联系|邮箱|工单|学术|回国|更新通知|公告|频道|入口|教程|使用说明|购买|续费|充值|邀请(?:码)?|返利|余额|过期时间|总流量|使用流量|每月重置|维护(?:中)?|失效|不可用|防失联|QQ群|微信群|Telegram(?:群)?|(?:\bTG\b|TG群)|USE(?:D)?|TOTAL|EXPIRE|EMAIL|TEST|TRAFFIC|RESET|SUBSCRIBE|OFFICIAL|NOTICE|CHANNEL|GROUP|RENEW|BUY|PAY|INVITE|BALANCE|HOME|WEB|URL|HTTPS?:\/\/|[-—_ ]*以下为.+?区[-—_ ]*/i;
const regexArray = [
  /ˣ²/, /ˣ³/, /ˣ⁴/, /ˣ⁵/, /ˣ⁶/, /ˣ⁷/, /ˣ⁸/, /ˣ⁹/, /ˣ¹⁰/,
  /ˣ²⁰/, /ˣ³⁰/, /ˣ⁴⁰/, /ˣ⁵⁰/,
  /IPLC/i, /IEPL/i, /核心/, /边缘/, /高级/, /标准/, /实验/, /商宽/, /家宽/,
  /游戏|game/i, /购物/, /专线/, /LB/, /cloudflare/i, /\budp\b/i, /\bgpt\b/i, /udpn\b/
];

const valueArray = [
  "2×", "3×", "4×", "5×", "6×", "7×", "8×", "9×", "10×",
  "20×", "30×", "40×", "50×",
  "IPLC", "IEPL", "Kern", "Edge", "Pro", "Std", "Exp", "Biz", "Fam", "Game",
  "Buy", "Zx", "LB", "CF", "UDP", "GPT", "UDPN"
];

const superscriptDigits = "¹²³⁴⁵⁶⁷⁸⁹⁰";
const superscriptRateRegex = `(?:[${superscriptDigits}]+ˣ|ˣ[${superscriptDigits}]+)`;
const nameblnx = new RegExp(`(高倍|(?!1)\\d+[x×倍]|${superscriptRateRegex})`, "i");
const namenx = new RegExp(`(高倍|(?!1)(0\\.\\d+|\\d+)[x×倍]|${superscriptRateRegex})`, "i");

const keya = /港|Hong|HK|新加坡|SG|Singapore|日本|Japan|JP|美国|United States|US|韩|土耳其|TR|Turkey|Korea|KR|🇸🇬|🇭🇰|🇯🇵|🇺🇸|🇰🇷|🇹🇷/i;
const keyb = /(((1|2|3|4)\d)|(香港|Hong|HK) 0[5-9]|((新加坡|SG|Singapore|日本|Japan|JP|美国|United States|US|韩|土耳其|TR|Turkey|Korea|KR) 0[3-9]))/i;

const unlockRegex = /\b(?:Netflix|Disney(?:\+)?|HBO|Prime\s*Video|YouTube|YouTube\s*Premium|OpenAI|ChatGPT|GPT(?!\w)|Claude|Gemini|Copilot|Bard|DeepSeek|Kimi)\b|奈飞|智谱|讯飞|通义|千问|流媒体|解锁/i;

// ==========================================================================
// 地区别名
// ==========================================================================

const regionRules = [
  ["美国", /美国|美西|美东|洛杉矶|圣何塞|硅谷|俄勒冈|西雅图|达拉斯|亚特兰大|迈阿密|纽约|芝加哥|凤凰城|丹佛|拉斯维加斯|休斯顿|华盛顿|旧金山|\bUSA\b|\bUS\b|America|United States|美利坚|波特兰|哥伦布|Los Angeles|San Jose|Silicon Valley|Michigan|(深|沪|呼|京|广|杭)美/gi],
  ["加拿大", /加拿大|温哥华|多伦多|蒙特利尔|卡尔加里|渥太华|\bCA\b|Canada/gi],
  ["墨西哥", /墨西哥|墨西哥城|\bMX\b|Mexico/gi],
  ["巴西", /巴西|圣保罗|里约热内卢|巴西利亚|\bBR\b|Brazil|\bBRA\b/gi],
  ["阿根廷", /阿根廷|布宜诺斯艾利斯|\bAR\b|Argentina/gi],
  ["智利", /智利|圣地亚哥|\bCL\b|Chile/gi],
  ["哥伦比亚", /哥伦比亚|波哥大|\bCO\b|Colombia/gi],
  ["秘鲁", /秘鲁|利马|\bPE\b|Peru/gi],
  ["委内瑞拉", /委内瑞拉|加拉加斯|\bVE\b|Venezuela/gi],

  ["英国", /英国|伦敦|曼彻斯特|伯明翰|\bUK\b|\bGB\b|United Kingdom|Britain|Great Britain|大不列颠|英伦|\bGBR\b/gi],
  ["德国", /德国|法兰克福|柏林|慕尼黑|杜塞尔多夫|\bDE\b|Germany|德意志|\bDEU\b|Frankfurt|(深|沪|呼|京|广|杭)德(?!.*(I|线))|滬德/gi],
  ["法国", /法国|巴黎|马赛|里昂|\bFR\b|France|法兰西|\bFRA\b/gi],
  ["荷兰", /荷兰|阿姆斯特丹|鹿特丹|\bNL\b|Netherlands/gi],
  ["瑞典", /瑞典|斯德哥尔摩|哥德堡|\bSE\b|Sweden/gi],
  ["挪威", /挪威|奥斯陆|卑尔根|\bNO\b|Norway/gi],
  ["芬兰", /芬兰|赫尔辛基|\bFI\b|Finland/gi],
  ["丹麦", /丹麦|哥本哈根|\bDK\b|Denmark/gi],
  ["波兰", /波兰|华沙|克拉科夫|\bPL\b|Poland/gi],
  ["意大利", /意大利|米兰|罗马|都灵|\bIT\b|Italy/gi],
  ["西班牙", /西班牙|马德里|巴塞罗那|\bES\b|Spain/gi],
  ["葡萄牙", /葡萄牙|里斯本|波尔图|\bPT\b|Portugal/gi],
  ["比利时", /比利时|布鲁塞尔|\bBE\b|Belgium/gi],
  ["瑞士", /瑞士|苏黎世|日内瓦|\bCH\b|Switzerland|Zurich/gi],
  ["奥地利", /奥地利|维也纳|\bAT\b|Austria/gi],
  ["爱尔兰", /爱尔兰|都柏林|\bIE\b|Ireland/gi],
  ["捷克", /捷克|布拉格|\bCZ\b|Czech|捷克共和国/gi],
  ["匈牙利", /匈牙利|布达佩斯|\bHU\b|Hungary/gi],
  ["罗马尼亚", /罗马尼亚|布加勒斯特|\bRO\b|Romania/gi],
  ["乌克兰", /乌克兰|基辅|\bUA\b|Ukraine/gi],
  ["俄罗斯", /俄罗斯|莫斯科|圣彼得堡|\bRU\b|Russia|Moscow/gi],
  ["土耳其", /土耳其|伊斯坦布尔|安卡拉|\bTR\b|Turkey|\bTUR\b/gi],
  ["希腊", /希腊|雅典|\bGR\b|Greece/gi],
  ["白俄罗斯", /白俄罗斯|明斯克|\bBY\b|Belarus/gi],
  ["保加利亚", /保加利亚|索非亚|\bBG\b|Bulgaria/gi],
  ["爱沙尼亚", /爱沙尼亚|塔林|\bEE\b|Estonia/gi],
  ["拉脱维亚", /拉脱维亚|里加|\bLV\b|Latvia/gi],
  ["立陶宛", /立陶宛|维尔纽斯|\bLT\b|Lithuania/gi],
  ["卢森堡", /卢森堡|卢森堡市|\bLU\b|Luxembourg/gi],
  ["马耳他", /马耳他|瓦莱塔|\bMT\b|Malta/gi],
  ["塞浦路斯", /塞浦路斯|尼科西亚|\bCY\b|Cyprus/gi],
  ["斯洛伐克", /斯洛伐克|布拉迪斯拉发|\bSK\b|Slovakia/gi],
  ["斯洛文尼亚", /斯洛文尼亚|卢布尔雅那|\bSI\b|Slovenia/gi],
  ["克罗地亚", /克罗地亚|萨格勒布|\bHR\b|Croatia/gi],
  ["塞尔维亚", /塞尔维亚|贝尔格莱德|\bRS\b|Serbia/gi],
  ["黑山共和国", /黑山共和国|黑山|波德戈里察|\bME\b|Montenegro/gi],
  ["马其顿", /北马其顿|马其顿|斯科普里|\bMK\b|Macedonia/gi],
  ["阿尔巴尼亚", /阿尔巴尼亚|地拉那|\bAL\b|Albania/gi],
  ["格鲁吉亚", /格鲁吉亚|第比利斯|\bGE\b|Georgia/gi],
  ["亚美尼亚", /亚美尼亚|埃里温|\bAM\b|Armenia/gi],
  ["阿塞拜疆", /阿塞拜疆|巴库|\bAZ\b|Azerbaijan/gi],
  ["摩尔多瓦", /摩尔多瓦|基希讷乌|\bMD\b|Moldova/gi],

  ["香港", /香港|Hongkong|Hong\s*Kong|\bHK\b|\bHKG\b|(深|沪|呼|京|广|杭)港(?!.*(I|线))/gi],
  ["澳门", /澳门|Macao|Macau|\bMO\b/gi],
  ["台湾", /台湾|台北|新北|台中|高雄|台南|Taipei|Taiwan|\bTW\b|\bTWN\b|新台|台(?!.*线)/gi],
  ["日本", /日本|东京|大阪|名古屋|福冈|札幌|\bJP\b|Japan|东瀛|\bJPN\b|Tokyo|Osaka|(深|沪|呼|京|广|杭|中|辽)日(?!.*(I|线))|大坂/gi],
  ["韩国", /韩国|首尔|春川|\bKR\b|Korea|南韩|\bKOR\b|Seoul|Chuncheon|韩/gi],
  ["新加坡", /新加坡|狮城|\bSG\b|Singapore|\bSGP\b|(深|沪|呼|京|广|杭)新/gi],
  ["马来", /马来西亚|马来|吉隆坡|\bMY\b|Malaysia|\bMYS\b/gi],
  ["菲律宾", /菲律宾|马尼拉|\bPH\b|Philippines|\bPHL\b/gi],
  ["泰国", /泰国|泰國|曼谷|\bTH\b|Thailand|\bTHA\b/gi],
  ["越南", /越南|河内|胡志明|\bVN\b|Vietnam|\bVNM\b/gi],
  ["印尼", /印尼|印度尼西亚|雅加达|\bID\b|Indonesia|\bIDN\b/gi],
  ["印度", /印度|孟买|新德里|班加罗尔|\bIN\b|India|Mumbai/gi],
  ["巴基斯坦", /巴基斯坦|卡拉奇|拉合尔|\bPK\b|Pakistan/gi],
  ["孟加拉国", /孟加拉国|孟加拉|达卡|\bBD\b|Bangladesh/gi],
  ["斯里兰卡", /斯里兰卡|科伦坡|\bLK\b|Sri Lanka/gi],
  ["尼泊尔", /尼泊尔|加德满都|\bNP\b|Nepal/gi],
  ["缅甸", /缅甸|仰光|内比都|\bMM\b|Myanmar/gi],
  ["老挝", /老挝|万象|\bLA\b|Laos/gi],
  ["柬埔寨", /柬埔寨|金边|\bKH\b|Cambodia/gi],
  ["阿联酋", /阿联酋|迪拜|阿布扎比|\bAE\b|UAE|阿拉伯联合酋长国|\bARE\b|Dubai|United Arab Emirates/gi],
  ["沙特阿拉伯", /沙特阿拉伯|利雅得|吉达|\bSA\b|Saudi/gi],
  ["以色列", /以色列|特拉维夫|耶路撒冷|\bIL\b|Israel/gi],
  ["伊朗", /伊朗|德黑兰|\bIR\b|Iran/gi],
  ["伊拉克", /伊拉克|巴格达|\bIQ\b|Iraq/gi],
  ["科威特", /科威特|科威特城|\bKW\b|Kuwait/gi],
  ["卡塔尔", /卡塔尔|多哈|\bQA\b|Qatar/gi],
  ["阿曼", /阿曼|马斯喀特|\bOM\b|Oman/gi],
  ["巴林", /巴林|麦纳麦|\bBH\b|Bahrain/gi],
  ["哈萨克斯坦", /哈萨克斯坦|阿斯塔纳|阿拉木图|\bKZ\b|Kazakhstan|Kazakstan/gi],
  ["乌兹别克斯坦", /乌兹别克斯坦|塔什干|\bUZ\b|Uzbekistan/gi],
  ["土库曼斯坦", /土库曼斯坦|阿什哈巴德|\bTM\b|Turkmenistan/gi],
  ["吉尔吉斯斯坦", /吉尔吉斯斯坦|比什凯克|\bKG\b|Kyrgyzstan/gi],
  ["塔吉克斯坦", /塔吉克斯坦|杜尚别|\bTJ\b|Tajikistan/gi],

  ["澳大利亚", /澳大利亚|澳洲|悉尼|墨尔本|布里斯班|珀斯|阿德莱德|土澳|\bAU\b|Australia|(深|沪|呼|京|广|杭)澳/gi],
  ["新西兰", /新西兰|奥克兰|惠灵顿|\bNZ\b|New Zealand/gi],
  ["南非", /南非|约翰内斯堡|开普敦|比勒陀利亚|\bZA\b|South Africa/gi],
  ["埃及", /埃及|开罗|亚历山大|\bEG\b|Egypt/gi],
  ["尼日利亚", /尼日利亚|拉各斯|阿布贾|\bNG\b|Nigeria/gi],
  ["肯尼亚", /肯尼亚|内罗毕|蒙巴萨|\bKE\b|Kenya/gi],
  ["摩洛哥", /摩洛哥|卡萨布兰卡|拉巴特|\bMA\b|Morocco/gi]
];

// ==========================================================================
// 大陆节点与中转节点识别
// ==========================================================================

const MAINLAND_ROUTE_PREFIX =
  "(?:北京|上海|广州|深圳|杭州|成都|重庆|天津|武汉|南京|厦门|福州|郑州|西安|宁波|青岛|大连|昆明|长沙|济南|合肥|南昌|" +
  "Beijing|Peking|Shanghai|Guangzhou|Canton|Shenzhen|Hangzhou|Chengdu|Chongqing|Tianjin|Wuhan|Nanjing|Xiamen|Fuzhou|Zhengzhou|Xi(?:[' -]?)an|Xian|Ningbo|Qingdao|Dalian|Kunming|Changsha|Jinan|Hefei|Nanchang|" +
  "京|沪|广|深|杭|蓉|渝|津|汉|宁|厦|福|郑|西|冀|晋|辽|吉|黑|苏|浙|皖|闽|赣|鲁|豫|鄂|湘|粤|琼|川|蜀|黔|滇|陕|秦|甘|陇|青|蒙|桂|藏)";

const TRANSIT_DESTINATIONS = [
  ["香港", "(?:香港|Hong\\s*Kong|Hongkong|HKG|HK|港(?![一-龥]))"],
  ["澳门", "(?:澳门|Macao|Macau|MAC|MO)"],
  ["台湾", "(?:台湾|Taiwan|Taipei|TWN|TW|台(?![一-龥]))"],
  ["日本", "(?:日本|Japan|Tokyo|Osaka|JPN|JP|日(?![一-龥]))"],
  ["韩国", "(?:韩国|Korea|Seoul|KOR|KR|韩(?![一-龥]))"],
  ["新加坡", "(?:新加坡|Singapore|SGP|SG|新(?![一-龥]))"],
  ["美国", "(?:美国|United\\s*States|America|USA|US|美(?![一-龥]))"],
  ["英国", "(?:英国|United\\s*Kingdom|Britain|UK|GB|英(?![一-龥]))"],
  ["法国", "(?:法国|France|FR|法(?![一-龥]))"],
  ["德国", "(?:德国|Germany|DE|德(?![一-龥]))"],
  ["荷兰", "(?:荷兰|Netherlands|NL|荷(?![一-龥]))"],
  ["俄罗斯", "(?:俄罗斯|Russia|RU|俄(?![一-龥]))"],
  ["土耳其", "(?:土耳其|Turkey|TR|土(?![一-龥]))"],
  ["加拿大", "(?:加拿大|Canada|CA|加(?![一-龥]))"],
  ["澳大利亚", "(?:澳大利亚|Australia|AU|澳(?![一-龥]))"],
  ["新西兰", "(?:新西兰|New\\s*Zealand|NZ)"]
];

const TRANSIT_ROUTE_REGEX = new RegExp(
  `${MAINLAND_ROUTE_PREFIX}[\\s_-]*(?:${TRANSIT_DESTINATIONS.map((item) => item[1]).join("|")})`,
  "i"
);

const TRANSIT_NORMALIZE_RULES = TRANSIT_DESTINATIONS.map((item) => {
  return [item[0], new RegExp(`${MAINLAND_ROUTE_PREFIX}[\\s_-]*${item[1]}`, "gi")];
});

const KEEP_HMT_REGEX = /香港|澳门|台湾|台北|新北|台中|高雄|台南|Hong\s*Kong|Hongkong|Macao|Macau|Taiwan|Taipei|\bHKG?\b|\bMO\b|\bTWN?\b|🇭🇰|🇲🇴|🇹🇼/i;

const MAINLAND_FULL_REGEX =
  /中国大陆|中国|大陆(?:节点|线路|入口)?|内地|国内|回国|\bCHN\b|\bChina\b|\bCN(?:\d|[-_\s]|$)|北京|上海|广州|深圳|杭州|成都|重庆|天津|武汉|南京|厦门|福州|郑州|西安|宁波|青岛|大连|昆明|长沙|济南|合肥|南昌|Beijing|Peking|Shanghai|Guangzhou|Canton|Shenzhen|Hangzhou|Chengdu|Chongqing|Tianjin|Wuhan|Nanjing|Xiamen|Fuzhou|Zhengzhou|Xi(?:['\s-]?)an|Xian|Ningbo|Qingdao|Dalian|Kunming|Changsha|Jinan|Hefei|Nanchang|Hebei|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|内蒙古|新疆|西藏|宁夏|广西|电信|联通|移动|广电|鹏博士|教育网|国内BGP|BGP国内|BGP中转/i;

const MAINLAND_SHORT_CODE_REGEX =
  /(?:京|沪|广|深|杭|蓉|渝|津|汉|宁|厦|福|郑|西|冀|晋|辽|吉|黑|苏|浙|皖|闽|赣|鲁|豫|鄂|湘|粤|琼|川|蜀|黔|滇|陕|秦|甘|陇|青|蒙|桂|藏)(?=\d|[-_\s]|BGP|CN|电信|联通|移动|广电|$)/i;

// ==========================================================================
// 辅助函数
// ==========================================================================

function getList(arg) {
  if (arg === "us") return EN;
  if (arg === "gq") return FG;
  if (arg === "quan") return QC;
  return ZH;
}

function getPriority(type) {
  const protocol = String(type || "").toLowerCase();

  if (!protocol) return 10;
  if (protocol.includes("snell")) return 1;
  if (protocol.includes("hy2") || protocol.includes("hysteria2") || protocol.includes("tuic")) return 2;
  if (protocol.includes("anytls")) return 3;
  if (protocol.includes("trojan")) return 4;
  if (protocol.includes("vmess")) return 5;
  if (protocol.includes("ss") && !protocol.includes("vless")) return 6;
  if (protocol.includes("vless")) return 7;
  if (protocol.includes("wireguard") || protocol.includes("hysteria") || protocol.includes("quic") || protocol.includes("udp")) return 8;

  return 9;
}

function dedupeByServer(proxies) {
  const bestByServer = new Map();

  proxies.forEach((node) => {
    const server = node.server || "";
    const current = bestByServer.get(server);

    if (!current || getPriority(node.type) < getPriority(current.type)) {
      bestByServer.set(server, node);
    }
  });

  return Array.from(bestByServer.values());
}

function dedupeByEndpoint(proxies) {
  const seen = new Set();

  return proxies.filter((node) => {
    const identity = `${node.server || ""}:${node.port || ""}:${node.type || ""}`;

    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function isAsciiLetter(character) {
  if (!character) return false;

  const code = character.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function containsCountryCode(name, code) {
  const text = String(name || "");
  const source = text.toUpperCase();
  const target = String(code || "").toUpperCase();
  let index = source.indexOf(target);

  while (index !== -1) {
    const before = source.charAt(index - 1);
    const after = source.charAt(index + target.length);

    if (!isAsciiLetter(before) && !isAsciiLetter(after)) return true;
    index = source.indexOf(target, index + 1);
  }

  return false;
}

function buildRegionMap(outList) {
  const map = {};
  const inputLists = inname ? [getList(inname)] : [ZH, FG, QC, EN];

  inputLists.forEach((inputList) => {
    inputList.forEach((value, index) => {
      if (value) map[value] = outList[index];
    });
  });

  return map;
}

function findMappedRegion(name, regionMap, inputLists) {
  const text = String(name || "");

  for (let listIndex = 0; listIndex < inputLists.length; listIndex += 1) {
    const list = inputLists[listIndex];

    for (let index = 0; index < list.length; index += 1) {
      const source = list[index];
      if (!source) continue;

      const matched = list === EN
        ? containsCountryCode(text, source)
        : text.includes(source);

      if (matched) return regionMap[source];
    }
  }

  return null;
}

function isTransitNode(name) {
  return TRANSIT_ROUTE_REGEX.test(String(name || ""));
}

function normalizeRegionText(name) {
  let result = String(name || "");

  TRANSIT_NORMALIZE_RULES.forEach((item) => {
    const region = item[0];
    const regex = item[1];

    regex.lastIndex = 0;

    if (regex.test(result)) {
      regex.lastIndex = 0;
      result = result.replace(regex, region);
    }
  });

  regionRules.forEach((item) => {
    const region = item[0];
    const regex = item[1];

    regex.lastIndex = 0;

    if (regex.test(result)) {
      regex.lastIndex = 0;
      result = result.replace(regex, region);
    }
  });

  return result;
}

function extractUnlockTags(name) {
  const matches = String(name || "").match(new RegExp(unlockRegex.source, "gi"));
  if (!matches) return "";

  const unique = [];

  matches.forEach((item) => {
    const tag = String(item || "").trim();
    if (tag && !unique.includes(tag)) unique.push(tag);
  });

  return unique.join(" ");
}

function extractRateTag(name) {
  if (!(bl || blbz)) return "";

  const text = String(name || "");
  const normalMatch = text.match(/((倍率|X|x|×|ˣ)\D?((\d{1,3}\.)?\d+)\D?)|((\d{1,3}\.)?\d+)(倍|X|x|×|ˣ)/);
  let number = "";

  if (normalMatch) {
    const numberMatch = normalMatch[0].match(/(\d[\d.]*)/);
    if (numberMatch) number = numberMatch[0];
  }

  if (!number) {
    const superscriptMatch = text.match(/([¹²³⁴⁵⁶⁷⁸⁹⁰]+)ˣ|ˣ([¹²³⁴⁵⁶⁷⁸⁹⁰]+)/);

    if (superscriptMatch) {
      const source = superscriptMatch[1] || superscriptMatch[2] || "";
      const digitMap = {
        "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5",
        "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁰": "0"
      };

      number = source.split("").map((character) => digitMap[character] || "").join("");
    }
  }

  if (!number || number === "1") return "";
  return blbz ? `${number}倍率` : `${number}×`;
}

function extractSpeedTag(name) {
  if (!blcs) return "";

  const speedMatch = String(name || "").match(/(\d+(?:\.\d+)?)\s*([Mm]bps)/);
  return speedMatch ? `${speedMatch[1]}Mbps` : "";
}

function extractFixedTag(name) {
  if (!blgd) return "";

  let result = "";

  regexArray.forEach((regex, index) => {
    if (regex.test(String(name || ""))) result = valueArray[index];
  });

  return result;
}

function extractRetainTags(originalName) {
  if (!BLKEY) return "";

  const result = [];
  const rules = BLKEY.split("+").filter((item) => item !== "");

  rules.forEach((rule) => {
    const separatorIndex = rule.indexOf(">");

    if (separatorIndex === -1) {
      if (originalName.includes(rule) && !result.includes(rule)) {
        result.push(rule);
      }
      return;
    }

    const source = rule.slice(0, separatorIndex);
    const target = rule.slice(separatorIndex + 1);

    if (source && originalName.includes(source)) {
      const output = target || source;
      if (output && !result.includes(output)) result.push(output);
    }
  });

  return result.join(FGF);
}

function setBlockQuic(node) {
  if (blockquic === "on" || blockquic === "off") {
    node["block-quic"] = blockquic;
  } else {
    delete node["block-quic"];
  }
}

function shouldRemoveChinaMainland(name) {
  const text = String(name || "");

  if (isTransitNode(text)) return false;
  if (KEEP_HMT_REGEX.test(text)) return false;

  return MAINLAND_FULL_REGEX.test(text) || MAINLAND_SHORT_CODE_REGEX.test(text);
}

function sortSpecialNodes(proxies) {
  const normal = [];
  const special = [];

  proxies.forEach((proxy, index) => {
    const priority = specialRegex.findIndex((regex) => regex.test(String(proxy.name || "")));
    const item = { proxy, index, priority };

    if (priority === -1) normal.push(item);
    else special.push(item);
  });

  special.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;

    const nameOrder = String(a.proxy.name || "").localeCompare(String(b.proxy.name || ""));
    return nameOrder || a.index - b.index;
  });

  return normal.concat(special).map((item) => item.proxy);
}

function removeSingleRegionNumber(name, region) {
  const text = String(name || "");
  const marker = `${region}${FGF}`;
  const position = text.indexOf(marker);

  if (position === -1) return text;

  const numberPosition = position + marker.length;
  const number = text.slice(numberPosition, numberPosition + 2);

  if (!/^\d{2}$/.test(number)) return text;

  return text.slice(0, position) + region + text.slice(numberPosition + 2);
}

// ==========================================================================
// 主函数
// ==========================================================================

function operator(pro) {
  let proxies = Array.isArray(pro) ? pro : [];

  if (jdqcyg) {
    proxies = dedupeByServer(proxies);
  } else if (jdqc) {
    proxies = dedupeByEndpoint(proxies);
  }

  if (jjdqc) return proxies;

  if (pcgn) {
    proxies = proxies.filter((node) => !shouldRemoveChinaMainland(node.name));
  }

  if (clear || nx || blnx || key) {
    proxies = proxies.filter((node) => {
      const nodeName = String(node.name || "");

      if (clear && nameclear.test(nodeName)) return false;
      if (nx && namenx.test(nodeName)) return false;
      if (blnx && !nameblnx.test(nodeName)) return false;
      if (key && !(keya.test(nodeName) && /2|4|6|7/i.test(nodeName))) return false;

      return true;
    });
  }

  const outList = getList(outputName);
  const inputLists = inname ? [getList(inname)] : [ZH, FG, QC, EN];
  const regionMap = buildRegionMap(outList);

  proxies.forEach((node) => {
    const originalName = String(node.name || "");
    const normalizedName = normalizeRegionText(originalName);

    let region = findMappedRegion(originalName, regionMap, inputLists);

    if (!region) {
      region = findMappedRegion(normalizedName, regionMap, inputLists);
    }

    if (!region && !inname) {
      region = findMappedRegion(normalizedName, regionMap, [ZH, FG, QC, EN]);
    }

    node._originalName = originalName;
    node._normalizedName = normalizedName;
    node._region = region || null;
    node._transit = isTransitNode(originalName);
  });

  const groups = {};
  const groupOrder = [];

  proxies.forEach((node) => {
    const region = node._region || "__unmatched__";

    if (!groups[region]) {
      groups[region] = [];
      groupOrder.push(region);
    }

    groups[region].push(node);
  });

  proxies = [];

  groupOrder.forEach((region) => {
    proxies = proxies.concat(groups[region]);
  });

  const regionCount = {};
  const regionTotal = {};

  if (numone) {
    proxies.forEach((node) => {
      if (node._region) {
        regionTotal[node._region] = (regionTotal[node._region] || 0) + 1;
      }
    });
  }

  proxies.forEach((node) => {
    setBlockQuic(node);

    const originalName = node._originalName;
    const normalizedName = node._normalizedName;
    const region = node._region;

    if (!region) {
      node.name = nm ? (FNAME ? `${FNAME}${FGF}${normalizedName}` : normalizedName) : null;
      return;
    }

    let flag = "";

    if (addflag) {
      const index = outList.indexOf(region);

      if (index !== -1) {
        flag = FG[index] === "🇹🇼" ? "🇨🇳" : FG[index];
      }
    }

    regionCount[region] = (regionCount[region] || 0) + 1;

    const number = String(regionCount[region]).padStart(2, "0");
    const regionWithNumber = `${region}${FGF}${number}`;

    const parts = [
      regionWithNumber,
      extractRetainTags(originalName),
      extractRateTag(normalizedName),
      jsjd ? extractUnlockTags(normalizedName) : "",
      extractSpeedTag(normalizedName),
      extractFixedTag(normalizedName),
      node._transit ? "中转" : ""
    ].filter((item) => item !== "");

    let finalName = parts.join(FGF);

    if (FNAME) {
      finalName = `${FNAME}${FGF}${finalName}`;
    }

    node.name = flag ? `${flag}${finalName ? FGF : ""}${finalName}` : finalName;
  });

  proxies = proxies.filter((node) => node.name !== null);

  if (numone) {
    proxies.forEach((node) => {
      if (node._region && regionTotal[node._region] === 1) {
        node.name = removeSingleRegionNumber(node.name, node._region);
      }
    });
  }

  if (blpx) proxies = sortSpecialNodes(proxies);
  if (key) proxies = proxies.filter((node) => !keyb.test(String(node.name || "")));

  proxies.forEach((node) => {
    delete node._originalName;
    delete node._normalizedName;
    delete node._region;
    delete node._transit;
  });

  return proxies;
}
