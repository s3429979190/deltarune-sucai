// 中文 -> 素材文件名里可能出现的英文片段
// 说明：一个中文词可映射多个英文（命中任意一个即可）；映射为空字符串表示"停用词"（会被忽略）
window.DR_ZH_MAP = {
  // ── 停用词（二创/素材说明等，不参与匹配）──
  "二创": "", "素材": "", "图片": "", "图": "", "立绘": "", "资源": "", "动画": "anim", "的": "", "了": "",
  "相关": "", "合集": "", "打包": "", "全部": "", "所有": "",

  // ── 角色 ──
  "克里斯": "kris", "克瑞斯": "kris", "苏西": "susie", "苏茜": "susie",
  "利艾尔斯": "ralsei", "艾尔斯": "ralsei", "拉尔塞": "ralsei",
  "诺艾尔": "noelle", "努艾尔": "noelle", "阿斯戈尔": "asgore", "伯德利": "berdly",
  "托莉尔": "toriel", "儒克尔斯": "rouxls", "兰瑟": "lancer", "鲁迪": "rudy",
  "安蒂": "undyne", "桑斯": "sans", "阿尔菲斯": "alphys", "黛丝": "dess",
  "卡罗尔": "carol", "拉尼诺": "lanino", "埃尔尼娜": "elnina",
  "花男": "flowery", "王后": "queen", "女王": "queen", "国王": "king",
  "泰坦": "titan", "坦娜": "tenna", "老爷子": "gerson", "格森": "gerson",
  "斯潘顿": "spamton", "斯帕姆顿": "spamton", "骑士": "knight", "小丑": "joker",
  "塞斯": "seth", "鲍勃": "bob", "粉": "pink", "粉红": "pink",
  "狗": "dog", "神烦狗": "dog", "猫": "cat", "兔子": "bunny rabbit", "鸟": "bird",
  "小怪": "enemy", "敌人": "enemy", "NPC": "npc", "首领": "boss",

  // ── 颜色 ──
  "黄": "yellow", "绿": "green", "蓝": "blue", "橙": "orange", "青": "aqua", "红": "red",
  "白": "white", "黑": "black", "灰": "gray", "紫": "purple", "棕": "brown",
  "银": "silver", "金": "gold", "金黄": "gold yellow",

  // ── 动作 / 状态 ──
  "走路": "walk", "跑": "run", "跳": "jump", "待机": "idle",
  "躺": "lie down", "哭": "cry", "笑": "smile laugh",
  "开心": "happy smile", "悲伤": "sad cry", "愤怒": "angry", "生气": "angry",
  "害怕": "fear scared", "恐惧": "fear", "惊讶": "surprise", "困惑": "confused",
  "害羞": "shy blush", "害羞脸红": "blush", "无语": "awkward", "尴尬": "awkward",
  "攻击": "attack", "防御": "defend block", "战斗": "battle bt", "受伤": "hurt damage",
  "受击": "hurt hit", "死亡": "death die", "倒下": "down fall", "胜利": "victory win",
  "动摇": "shake", "闪烁": "blink flicker", "眨眼": "blink", "点头": "nod",
  "摇头": "shake head", "转身": "turn", "挥手": "wave", "拥抱": "hug", "牵手": "hand hold",
  "游泳": "swim",
  "打伞": "umbrella", "钓鱼": "fish", "读书": "read book", "唱歌": "sing",
  "弹琴": "piano organ", "拍手": "clap", "鞠躬": "bow",

  // ── 身体 ──
  "脸": "face", "眼睛": "eye",
  "头发": "hair", "耳朵": "ear", "尾巴": "tail", "翅膀": "wing", "身体": "body",

  // ── 表情 / UI ──
  "表情": "face", "头像": "face portrait", "对话框": "dialog msg text", "对话": "dialog msg",
  "界面": "ui menu bt", "菜单": "menu", "图标": "icon", "按钮": "button bt",
  "箭头": "arrow", "光标": "cursor", "血条": "hp bar", "蓝条": "tp bar",
  "格子": "tile grid", "棋盘": "board", "数字": "num number",
  "文字": "text", "字体": "font", "标题": "title", "选项": "option choice",
  "存档点": "savepoint save", "存档": "save", "设置": "config settings", "暂停": "pause",
  "提示": "hint tip", "道具": "item", "装备": "equip", "背包": "bag inventory",
  "技能": "skill", "魔法": "spell magic", "行动": "act",

  // ── 场景物件 ──
  "门": "door", "窗": "window", "床": "bed", "椅子": "chair", "桌": "table desk",
  "书架": "shelf bookshelf", "书": "book", "蜡烛": "candle", "灯": "lamp light lantern",
  "火焰": "fire flame", "瀑布": "waterfall",
  "水池": "pond puddle", "喷泉": "fountain", "楼梯": "stairs", "平台": "plat platform",
  "教堂": "church", "城堡": "castle", "王城": "castle", "城市": "city",
  "咖啡": "cafe coffee", "咖啡馆": "cafe", "商店": "shop", "医院": "hospital",
  "学校": "school", "教室": "class", "电视台": "tv", "宝箱": "chest",
  "金币": "coin gold", "花": "flower bloom", "草": "grass",
  "树": "tree", "森林": "forest tree", "云": "cloud", "星星": "star", "月亮": "moon",
  "太阳": "sun", "天空": "sky",
  "海边": "beach", "海滩": "beach", "船": "boat", "车": "car", "火车": "train",
  "电梯": "elevator", "机器": "machine", "电视": "tv screen", "屏幕": "screen",
  "乐器": "instrument", "钢琴": "piano", "管风琴": "organ", "鼓": "drum", "音符": "note",
  "喇叭": "speaker", "面具": "mask", "镜子": "mirror reflect", "桥": "bridge",
  "路牌": "sign", "招牌": "sign", "栅栏": "fence", "藤蔓": "vine", "竞技场": "arena",
  "岩石": "rock stone", "悬崖": "cliff",
  "走廊": "hall corridor", "房间": "room", "地下室": "basement", "迷宫": "maze",
  "关卡": "level", "城镇": "town", "地图": "map 地图",

  // ── 战斗 / 特效 ──
  "战斗背景": "battlebg bg",
  "背景": "bg background", "子弹": "bullet", "弹幕": "bullet", "炸弹": "bomb",
  "剑": "sword blade", "盾": "shield", "弓": "bow", "箭": "arrow", "锤": "hammer",
  "法杖": "staff", "盔甲": "armor", "帽子": "hat", "眼镜": "glasses", "围巾": "scarf",
"特效": "fx effect", "粒子": "particle", "爆炸": "explode explosion",
  "闪光": "sparkle glow", "光环": "aura glow", "光柱": "beam",
  "黑洞": "hole black", "激光": "laser beam", "闪电": "lightning",
  "烟": "smoke", "雾": "fog", "波纹": "wave ripple", "碎片": "shard piece",
  "裂缝": "crack", "冲击": "impact",

  // ── 世界 / 过场 ──
  "黑暗世界": "dw", "光明世界": "lw", "过场": "cutscene", "剧情": "cutscene story",
  "界面板": "board", "影子": "shadow", "剪影": "silhouette shadow", "翻页": "page flip",
  "音效": "sfx sound", "UI": "ui"
};
