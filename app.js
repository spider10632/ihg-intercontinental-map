"use strict";

const HOTEL_DEFAULT = {
  id: "hotel_center",
  map_label_name: "InterContinental 台北洲際酒店",
  name_zh: "InterContinental 台北洲際酒店",
  name_en: "InterContinental Taipei",
  name_ja: "インターコンチネンタル台北",
  primary_category: "其他設施",
  subcategory: "飯店",
  near_mrt: "國父紀念館站",
  opening_hours: "24H front desk",
  notes: "以 InterContinental 台北洲際酒店為中心開始探索大巨蛋周邊。",
  google_maps_url: "https://www.google.com/maps/search/?api=1&query=InterContinental+Taipei",
  address_zh: "台北市信義區新仁里忠孝東路四段535號",
  source_status: "center",
};

const GOOGLE_MAPS_API_KEY = window.GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_USE_EMBED_API = window.GOOGLE_MAPS_USE_EMBED_API === true;
const LANGS = ["zh", "en", "ja"];
const PLUS_CODE_REGEX = /([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3})/i;
const WALK_10MIN_SUBCATEGORY = "走路10分內";
const WALKING_CACHE_KEY = "ihg_google_walking_cache_v1";
const WALKING_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const WALKING_THROTTLE_MS = 180;
const OPENING_HOURS_CACHE_KEY = "ihg_google_opening_hours_cache_v1";
const OPENING_HOURS_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const OPENING_HOURS_THROTTLE_MS = 180;
const FAVORITES_STORAGE_KEY = "ihg_map_favorites_v1";
const WEATHER_ENDPOINT =
  "https://api.open-meteo.com/v1/forecast?latitude=25.0424367&longitude=121.5595066&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTaipei&forecast_days=1";
const LEGACY_NIGHT_TAG = "消夜";
const NIGHT_TAG = "宵夜";
const PLACE_NAME_OVERRIDES = {};
const MANUAL_SUPPRESSED_PLACE_IDS = new Set([]);

const TEXT = {
  zh: {
    title: "InterContinental 台北洲際酒店週邊地圖",
    versionTag: "Version 3",
    desc: "以 InterContinental 台北洲際酒店為中心的大巨蛋週邊地圖，支援分類篩選並可直接開啟 Google Maps。",
    quickReach: "快速抵達",
    jumpFilters: "搜尋景點",
    jumpSpotlight: "地圖聚焦",
    jumpCollection: "搜尋結果",
    jumpFavorites: "蒐藏清單",
    jumpHotel: "飯店資訊",
    addHomeButton: "加入主畫面",
    addHomeHint: "iPhone：點右上角分享 → 加入主畫面",
    note: "使用方式：1. 在「搜尋景點」選分類或輸入關鍵字。2. 按「搜尋」後會自動跳到「搜尋結果」。3. 點任一地點卡可切換地圖，並可直接開啟 Google Maps 或從飯店出發導航。",
    filters: "搜尋景點", searchLabel: "搜尋名稱、地址或基本介紹", searchPlaceholder: "例如：大巨蛋、咖啡、國父紀念館",
    activeOnly: "只顯示啟用資料", clear: "清除條件", quick: "快速篩選", quickSub: "",
    quickAll: "全部推薦", quickFood: "在地美食", quickSight: "必看景點", quickTransport: "交通節點", quickShop: "生活採買", quickFacility: "旅宿機能",
    apply: "搜尋", pending: "已修改條件，按「搜尋」更新結果。",
    primary: "主分類", subcategory: "次分類", meal: "餐食標籤", countUnit: "類",
    overview: "目前結果", match: "符合條件", focus: "地圖焦點",
    spotlight: "地圖聚焦", spotlightNote: "",
    collection: "搜尋結果", collectionHint: "",
    conciergeTitle: "服務中心推薦",
    conciergeSubtitle: "提供第一次來訪與周邊精選建議，可自由收合查看。",
    conciergeFirstTitle: "第一次來",
    conciergeGiftTitle: "伴手禮推薦",
    conciergeOrderNote: "如需協助訂購，請洽禮賓部",
    collapseShow: "展開",
    collapseHide: "收合",
    hotelInfoTitle: "飯店基本資訊", picksTitle: "周邊精選",
    pickLongshanName: "台北大巨蛋", pickLiangxiName: "松山文創園區",
    baseLabel: "Concierge Base", baseName: "InterContinental 台北洲際酒店", baseLocation: "位置", baseNearby: "鄰近", baseVersion: "飯店電話", baseOpen: "開啟飯店 Google Maps",
    statusBeforeSearch: "選好條件後，按下「搜尋」即可看到點位。",
    listBeforeSearch: "按下「搜尋」即可顯示點位清單。",
    statusNoResult: "目前沒有符合條件的地點，地圖先停留在 InterContinental 台北洲際酒店。",
    statusNoSelect: (n) => `共有 ${n} 個地點符合條件，目前維持以 InterContinental 台北洲際酒店作為地圖中心。`,
    statusSelected: (n, name) => `共有 ${n} 個地點符合條件，目前聚焦在「${name}」。`,
    center: "中心點", recommended: "推薦地點", openCurrent: "查看目前地點", openHotel: "查看飯店位置", routeFromHotel: "從飯店前往", routeFromHotelCard: "從飯店出發", openHotelArea: "查看飯店周邊",
    addFavorite: "加入蒐藏", removeFavorite: "移出蒐藏", favoriteOpen: "地圖開啟",
    favoritesTitle: "蒐藏清單", favoritesHint: "在地點卡按「加入蒐藏」，即可整理你的行程清單。", favoritesClear: "清空", favoritesBackSearch: "回到搜尋", favoritesLauncher: "蒐藏清單", favoritesEmpty: "目前尚未蒐藏任何地點。", favoritesCountUnit: "筆",
    weatherTitle: "今日天氣", weatherLoading: "讀取中...", weatherRain: (p) => `降雨機率 ${p}%`, weatherTemp: (min, max) => `${min}°C - ${max}°C`, weatherUnavailable: "天氣暫時無法取得",
    hours: "營業時間：", closedNow: "已打烊", addr: "地址：", phone: "電話：", mrt: "捷運：", notes: "基本介紹：", addrPending: "地址未提供", phonePending: "未提供", mrtPending: "未提供", noNotes: "此地點位於 InterContinental 台北洲際酒店周邊，適合安排步行造訪。",
    empty: "目前沒有符合條件的結果。你可以放寬分類、清除搜尋，或重新打開停用中的資料。",
    sourceUnknown: "行程點位", backTop: "回到頁面頂端", top: "Top"
  },
  en: {
    title: "InterContinental Taipei Nearby Map",
    versionTag: "Version 3",
    desc: "A Taipei Dome area map centered on InterContinental Taipei with category filters and direct Google Maps links.",
    quickReach: "Quick Access",
    jumpFilters: "Find Places",
    jumpSpotlight: "Map Spotlight",
    jumpCollection: "Search Results",
    jumpFavorites: "Saved List",
    jumpHotel: "Hotel Info",
    addHomeButton: "Add to Home Screen",
    addHomeHint: "iPhone: tap Share at top-right → Add to Home Screen.",
    note: "How to use: 1) Choose categories or enter keywords in Find Places. 2) Tap Search to jump to Search Results. 3) Tap any place card to switch the map, then open Google Maps or start from the hotel.",
    filters: "Find Places", searchLabel: "Search by name, address, or intro", searchPlaceholder: "Example: Taipei Dome, cafe, Sun Yat-sen Memorial Hall",
    activeOnly: "Show active items only", clear: "Clear", quick: "Quick Picks", quickSub: "",
    quickAll: "All", quickFood: "Local Food", quickSight: "Top Sights", quickTransport: "Transport", quickShop: "Shopping", quickFacility: "Convenience",
    apply: "Search", pending: "Filters changed. Tap Search to refresh results.",
    primary: "Primary Category", subcategory: "Subcategory", meal: "Meal Tags", countUnit: "types",
    overview: "Current Result", match: "Matched", focus: "Map Focus",
    spotlight: "Spotlight", spotlightNote: "",
    collection: "Search Results", collectionHint: "",
    conciergeTitle: "Concierge Recommendations",
    conciergeSubtitle: "Practical first-visit and neighborhood picks. Collapse any section as needed.",
    conciergeFirstTitle: "First-time Visitor",
    conciergeGiftTitle: "Souvenir Picks",
    conciergeOrderNote: "For order assistance, please contact Concierge",
    collapseShow: "Expand",
    collapseHide: "Collapse",
    hotelInfoTitle: "Hotel Information", picksTitle: "Concierge Picks",
    pickLongshanName: "Taipei Dome", pickLiangxiName: "Songshan Cultural and Creative Park",
    baseLabel: "Concierge Base", baseName: "InterContinental Taipei", baseLocation: "Location", baseNearby: "Nearby", baseVersion: "Hotel Phone", baseOpen: "Open Hotel in Google Maps",
    statusBeforeSearch: "Choose your filters, then tap Search to see places.",
    listBeforeSearch: "Tap Search to show the place list.",
    statusNoResult: "No matching places right now. The map stays on InterContinental Taipei.",
    statusNoSelect: (n) => `${n} places match. The map remains centered on InterContinental Taipei.`,
    statusSelected: (n, name) => `${n} places match. Current focus: ${name}.`,
    center: "Center", recommended: "Recommended", openCurrent: "Open current place", openHotel: "View hotel location", routeFromHotel: "Route from hotel", routeFromHotelCard: "From hotel", openHotelArea: "View hotel surroundings",
    addFavorite: "Add to list", removeFavorite: "Remove", favoriteOpen: "Open",
    favoritesTitle: "Saved List", favoritesHint: "Tap Add to list on place cards to build your itinerary list.", favoritesClear: "Clear", favoritesBackSearch: "Back to results", favoritesLauncher: "Saved List", favoritesEmpty: "No saved places yet.", favoritesCountUnit: "items",
    weatherTitle: "Today's Weather", weatherLoading: "Loading...", weatherRain: (p) => `Rain chance ${p}%`, weatherTemp: (min, max) => `${min}°C - ${max}°C`, weatherUnavailable: "Weather unavailable",
    hours: "Hours: ", closedNow: "Closed", addr: "Address: ", phone: "Phone: ", mrt: "MRT: ", notes: "Intro: ", addrPending: "Address not provided", phonePending: "Not provided", mrtPending: "Not provided", noNotes: "Near InterContinental Taipei and suitable for a short walk.",
    empty: "No places match your current filters. Try broader categories or clear the search.",
    sourceUnknown: "POI", backTop: "Back to top", top: "Top"
  },
  ja: {
    title: "インターコンチネンタル台北 周辺マップ",
    versionTag: "Version 3",
    desc: "インターコンチネンタル台北を中心にした台北ドーム周辺地図。カテゴリ絞り込みとGoogleマップ連攜に対応。",
    quickReach: "クイック移動",
    jumpFilters: "スポット検索",
    jumpSpotlight: "地図フォーカス",
    jumpCollection: "検索結果",
    jumpFavorites: "保存リスト",
    jumpHotel: "ホテル情報",
    addHomeButton: "ホーム畫面に追加",
    addHomeHint: "iPhone：右上の共有をタップ → ホーム畫面に追加",
    note: "使い方：1. 「スポット検索」でカテゴリやキーワードを選択。2. 「検索」を押すと「検索結果」へ移動。3. 地點カードを押すと地図が切り替わり、Googleマップまたはホテル出発ナビを開けます。",
    filters: "スポット検索", searchLabel: "名稱・住所・紹介文で検索", searchPlaceholder: "例：台北ドーム、カフェ、國父紀念館",
    activeOnly: "有効データのみ表示", clear: "クリア", quick: "クイック選択", quickSub: "",
    quickAll: "おすすめ全部", quickFood: "ローカルグルメ", quickSight: "必見スポット", quickTransport: "交通拠點", quickShop: "買い物", quickFacility: "便利施設",
    apply: "検索", pending: "條件を変更しました。「検索」で結果を更新します。",
    primary: "主カテゴリ", subcategory: "サブカテゴリ", meal: "食事タグ", countUnit: "種類",
    overview: "現在の結果", match: "一致件數", focus: "地図の中心",
    spotlight: "地図フォーカス", spotlightNote: "",
    collection: "検索結果", collectionHint: "",
    conciergeTitle: "コンシェルジュおすすめ",
    conciergeSubtitle: "初めての方への案內と周辺おすすめです。必要に応じて各セクションを開閉できます。",
    conciergeFirstTitle: "初めての方へ",
    conciergeGiftTitle: "お土産おすすめ",
    conciergeOrderNote: "ご注文サポートが必要な場合は、コンシェルジュまでお問い合わせください。",
    collapseShow: "展開",
    collapseHide: "折りたたむ",
    hotelInfoTitle: "ホテル基本情報", picksTitle: "周辺おすすめ",
    pickLongshanName: "台北ドーム", pickLiangxiName: "松山文創園區",
    baseLabel: "Concierge Base", baseName: "インターコンチネンタル台北", baseLocation: "場所", baseNearby: "最寄り", baseVersion: "ホテル電話", baseOpen: "ホテルを Google Maps で開く",
    statusBeforeSearch: "條件を選んだら「検索」を押すと、スポットが表示されます。",
    listBeforeSearch: "「検索」を押すとスポット一覧が表示されます。",
    statusNoResult: "條件に合うスポットがありません。地図はホテル中心のままです。",
    statusNoSelect: (n) => `${n}件が條件に一致しています。地図はホテル中心です。`,
    statusSelected: (n, name) => `${n}件が條件に一致しています。現在のフォーカス：${name}。`,
    center: "中心", recommended: "おすすめ", openCurrent: "現在地を開く", openHotel: "ホテル位置を見る", routeFromHotel: "ホテルからの経路", routeFromHotelCard: "ホテルから出発", openHotelArea: "ホテル周辺を見る",
    addFavorite: "リスト追加", removeFavorite: "削除", favoriteOpen: "地図を開く",
    favoritesTitle: "保存リスト", favoritesHint: "地點カードの「リスト追加」で行き先リストを作れます。", favoritesClear: "クリア", favoritesBackSearch: "検索へ戻る", favoritesLauncher: "保存リスト", favoritesEmpty: "保存した地點はまだありません。", favoritesCountUnit: "件",
    weatherTitle: "今日の天気", weatherLoading: "読込中...", weatherRain: (p) => `降水確率 ${p}%`, weatherTemp: (min, max) => `${min}°C - ${max}°C`, weatherUnavailable: "天気情報を取得できません",
    hours: "営業時間：", closedNow: "営業時間外", addr: "住所：", phone: "電話：", mrt: "MRT：", notes: "基本紹介：", addrPending: "住所未登録", phonePending: "未登録", mrtPending: "未登録", noNotes: "ホテル周辺で徒歩で立ち寄りやすいスポットです。",
    empty: "條件に合う結果がありません。カテゴリを広げるか検索をクリアしてください。",
    sourceUnknown: "スポット", backTop: "ページ上部へ戻る", top: "Top"
  }
};

const CAT = {
  primary: { 交通: { en: "Transport", ja: "交通" }, 景點: { en: "Attractions", ja: "観光" }, 餐飲: { en: "Food", ja: "飲食" }, 商店: { en: "Shops", ja: "店舗" }, 其他設施: { en: "Facilities", ja: "その他施設" } },
  subcategory: { 火車站: { en: "Train Station", ja: "鉄道駅" }, 捷運站: { en: "MRT Station", ja: "MRT駅" }, 寺廟: { en: "Temple", ja: "寺院" }, 公園: { en: "Park", ja: "公園" }, 其他: { en: "Other", ja: "その他" }, 古蹟: { en: "Historic Site", ja: "史跡" }, 商圈: { en: "Commercial Area", ja: "商業エリア" }, 飯店: { en: "Hotel", ja: "ホテル" }, 銀行: { en: "Bank", ja: "銀行" }, 郵局: { en: "Post Office", ja: "郵便局" }, 停車場: { en: "Parking", ja: "駐車場" }, 早餐: { en: "Breakfast", ja: "朝食" }, 午餐: { en: "Lunch", ja: "晝食" }, 晚餐: { en: "Dinner", ja: "夕食" }, 宵夜: { en: "Late Night", ja: "夜食" }, 超市: { en: "Supermarket", ja: "スーパー" }, 藥妝: { en: "Drugstore", ja: "ドラッグストア" }, 走路10分內: { en: "Within 10-min walk", ja: "徒歩10分以內" } },
  meal: { 早餐: { en: "Breakfast", ja: "朝食" }, 午餐: { en: "Lunch", ja: "晝食" }, 晚餐: { en: "Dinner", ja: "夕食" }, 下午茶: { en: "Tea Time", ja: "ティータイム" }, 宵夜: { en: "Late Night", ja: "夜食" }, 飲料: { en: "Drinks", ja: "ドリンク" }, 伴手禮: { en: "Souvenir", ja: "お土産" } }
};

const SOURCE_STATUS = {
  verified: { zh: "已核實", en: "Verified", ja: "確認済み" },
  partially_verified: { zh: "部分核實", en: "Partially Verified", ja: "一部確認" },
  paper_map_corrected: { zh: "紙本校正", en: "Paper-map corrected", ja: "紙地図補正" },
  needs_review: { zh: "待複核", en: "Needs review", ja: "要確認" },
  map_only: { zh: "地圖點位", en: "Map point", ja: "地図上の地點" },
  closed: { zh: "已停業", en: "Closed", ja: "閉業" }
};

const rawData = Array.isArray(window.WANHUA_POI_DATA) ? window.WANHUA_POI_DATA : [];
const hotelRecord =
  rawData.find((p) => p.source_status === "center") ||
  rawData.find((p) => normalizeText(p.business_type).toLowerCase() === "hotel") ||
  rawData.find((p) => p.id === "ihg_001");
const HOTEL = { ...HOTEL_DEFAULT, ...(hotelRecord || {}), id: "hotel_center" };
const HOTEL_AREA_HINT = inferHotelAreaHint(HOTEL.address_zh);
const RUNTIME_PLACES_FALLBACK_URL = "https://ihg-admin-api.spider10632.workers.dev/api/admin/places?limit=800";
let runtimePlacesHydrationPromise = null;
let places = normalizeRuntimePlaces(rawData, hotelRecord?.id || "");

function normalizeRuntimePlaces(inputData, excludedId = "") {
  const normalizedExcludedId = normalizeText(excludedId);
  return (Array.isArray(inputData) ? inputData : [])
    .filter((place) => {
      const id = normalizeText(place?.id);
      return id && id !== normalizedExcludedId;
    })
    .map((place) => ({
      ...place,
      id: normalizeText(place.id),
      map_label_name: normalizeText(place.map_label_name) || normalizeText(place.name_zh) || normalizeText(place.name),
      name_zh: normalizeText(place.name_zh) || normalizeText(place.map_label_name) || normalizeText(place.name),
      name_en: normalizeText(place.name_en),
      name_ja: normalizeText(place.name_ja),
      primary_category: normalizeText(place.primary_category),
      subcategory: normalizeSubcategory(place.subcategory),
      business_type: normalizeText(place.business_type),
      meal_tags: uniqueValues((Array.isArray(place.meal_tags) ? place.meal_tags : []).map(normalizeMealTag)),
      google_maps_url: normalizeText(place.google_maps_url) || normalizeText(place.maps_url),
      address_zh: normalizeText(place.address_zh) || normalizeText(place.address),
      phone: normalizeText(place.phone),
      opening_hours: normalizeText(place.opening_hours),
      near_mrt: normalizeText(place.near_mrt),
      notes: normalizeText(place.notes),
      source_status: normalizeText(place.source_status) || "map_only",
      is_active: place.is_active !== false,
      walk_10min_from_hotel: place.walk_10min_from_hotel === true,
      display_order: Number.isFinite(Number(place.display_order)) ? Number(place.display_order) : 9999,
    }))
    .filter((place) => !isSuppressedPlace(place) && !MANUAL_SUPPRESSED_PLACE_IDS.has(place.id))
    .sort((a, b) => Number(a.display_order ?? 9999) - Number(b.display_order ?? 9999));
}
const CONCIERGE_FIRST_TIME_FIXED_ITEMS = [
  {
    title: { zh: "RAINBOW WALK", en: "RAINBOW WALK", ja: "RAINBOW WALK" },
    aliases: ["RAINBOW WALK", "Taipei 101 Rainbow Walk"],
    fallbackId: "ihg_034",
  },
  {
    title: { zh: "松山文創園區", en: "Songshan Cultural and Creative Park", ja: "松山文創園區" },
    aliases: ["松山文創園區"],
    fallbackId: "ihg_007",
  },
  {
    title: { zh: "誠品生活松菸", en: "Eslite Spectrum Songyan", ja: "誠品生活松菸" },
    aliases: ["誠品生活松菸"],
    fallbackId: "ihg_012",
  },
];
const CONCIERGE_PICK_PRIMARY_ORDER = ["餐飲", "景點", "商店"];
const CONCIERGE_GIFT_ITEMS = [
  {
    id: "gift_a01",
    brand: "chiate",
    logo: "ChiaTe",
    name: {
      zh: "佳德糕餅 鳳梨酥 12 入",
      en: "ChiaTe Pineapple Pastry (12 pcs)",
      ja: "佳徳パイナップルケーキ 12個入り",
    },
    intro: {
      zh: "經典款禮盒，口感平衡，第一次購買伴手禮很穩妥。",
      en: "A classic gift box with balanced flavor and broad appeal.",
      ja: "定番の詰め合わせで、初めてのお土産選びにも安心です。",
    },
  },
  {
    id: "gift_a02",
    brand: "chiate",
    logo: "ChiaTe",
    name: {
      zh: "佳德糕餅 鳳梨酥 6 入",
      en: "ChiaTe Pineapple Pastry (6 pcs)",
      ja: "佳徳パイナップルケーキ 6個入り",
    },
    intro: {
      zh: "小份量版本，適合先試口味或小型贈禮。",
      en: "A smaller pack ideal for tasting or a light gift.",
      ja: "少量パックで、試し買いにも気軽な贈り物にも向いています。",
    },
  },
  {
    id: "gift_a03",
    brand: "sunnyhills",
    logo: "SunnyHills",
    name: {
      zh: "微熱山丘 鳳梨酥 10 入",
      en: "SunnyHills Pineapple Cake (10 pcs)",
      ja: "サニーヒルズ パイナップルケーキ 10個入り",
    },
    intro: {
      zh: "以土鳳梨風味著名，酸甜層次明顯，辨識度高。",
      en: "Known for its native pineapple profile with brighter fruity notes.",
      ja: "土鳳梨の風味が際立ち、甘酸っぱい層が楽しめる人気商品です。",
    },
  },
  {
    id: "gift_a05",
    brand: "sugarspice",
    logo: "SUGAR & SPICE",
    name: {
      zh: "糖村 法式牛軋糖 400G（夾鏈袋）",
      en: "Sugar & Spice French Nougat 400g (zip bag)",
      ja: "糖村 フレンチヌガー 400g（ジッパーバッグ）",
    },
    intro: {
      zh: "大份量分享款，奶香濃郁，適合多人分裝。",
      en: "A larger sharing size with rich milk aroma and chewy texture.",
      ja: "大容量でシェア向き。ミルクの香りがしっかりした定番ヌガーです。",
    },
  },
  {
    id: "gift_a06",
    brand: "sugarspice",
    logo: "SUGAR & SPICE",
    name: {
      zh: "糖村 法式牛軋糖 250G（夾鏈袋）",
      en: "Sugar & Spice French Nougat 250g (zip bag)",
      ja: "糖村 フレンチヌガー 250g（ジッパーバッグ）",
    },
    intro: {
      zh: "中份量好攜帶，適合個人收藏或少量贈送。",
      en: "A compact size that is easy to carry and gift.",
      ja: "持ち運びやすい中容量で、少人數向けのギフトに最適です。",
    },
  },
];

const state = {
  lang: readLang(),
  draft: createFilterState(),
  applied: createFilterState(),
  selectedPlaceId: null,
  hasSearched: true,
  favoritesPanelOpen: false,
  collapsed: {
    hotel: true,
    picks: true,
    filters: false,
    spotlight: true,
    conciergeFirst: true,
    conciergeGift: true,
  },
  dirty: false,
  favorites: readFavorites(),
  conciergeRandomPickByPrimary: {},
  walkingCache: readWalkingCache(),
  openingHoursCache: readOpeningHoursCache(),
  walkingRefreshRunning: false,
  openingHoursRefreshRunning: false,
  placesRestDisabled: false,
  mapsLoaderPromise: null,
};
const dom = {
  pageTitle: document.querySelector("#page-title"),
  versionTag: document.querySelector("#version-tag"),
  guestNoteText: document.querySelector("#guest-note-text"),
  filtersTitle: document.querySelector("#filters-title"),
  searchLabel: document.querySelector("#search-label"),
  searchInput: document.querySelector("#search-input"),
  activeOnly: document.querySelector("#active-only"),
  activeOnlyText: document.querySelector("#active-only-text"),
  resetFilters: document.querySelector("#reset-filters"),
  quickTitle: document.querySelector("#quick-title"),
  quickSubtitle: document.querySelector("#quick-subtitle"),
  quickAll: document.querySelector("#quick-all"),
  quickFood: document.querySelector("#quick-food"),
  quickSight: document.querySelector("#quick-sight"),
  quickTransport: document.querySelector("#quick-transport"),
  quickShopping: document.querySelector("#quick-shopping"),
  quickFacility: document.querySelector("#quick-facility"),
  applyFilters: document.querySelector("#apply-filters"),
  filterPending: document.querySelector("#filter-pending"),
  primaryTitle: document.querySelector("#primary-title"),
  subcategoryTitle: document.querySelector("#subcategory-title"),
  mealTitle: document.querySelector("#meal-title"),
  overviewTitle: document.querySelector("#overview-title"),
  summaryMatchLabel: document.querySelector("#summary-match-label"),
  summaryFocusLabel: document.querySelector("#summary-focus-label"),
  spotlightTitle: document.querySelector("#spotlight-title"),
  spotlightNote: document.querySelector("#spotlight-note"),
  collectionTitle: document.querySelector("#collection-title"),
  collectionHint: document.querySelector("#collection-hint"),
  hotelInfoTitle: document.querySelector("#hotel-info-title"),
  picksTitle: document.querySelector("#picks-title"),
  picksList: document.querySelector("#picks-list"),
  conciergeTitle: document.querySelector("#concierge-title"),
  conciergeSubtitle: document.querySelector("#concierge-subtitle"),
  conciergeFirstTitle: document.querySelector("#concierge-first-title"),
  conciergeGiftTitle: document.querySelector("#concierge-gift-title"),
  conciergeFirst: document.querySelector("#concierge-first"),
  conciergeFirstBody: document.querySelector("#concierge-first-body"),
  conciergeFirstList: document.querySelector("#concierge-first-list"),
  conciergeGift: document.querySelector("#panel-gifts"),
  conciergeGiftBody: document.querySelector("#panel-gifts-body"),
  conciergeGiftList: document.querySelector("#concierge-gift-list"),
  conciergeOrderNote: document.querySelector("#concierge-order-note"),
  toggleHotel: document.querySelector("#toggle-hotel"),
  panelHotelBody: document.querySelector("#panel-hotel-body"),
  togglePicks: document.querySelector("#toggle-picks"),
  panelPicksBody: document.querySelector("#concierge-picks-body"),
  toggleFilters: document.querySelector("#toggle-filters"),
  panelFiltersBody: document.querySelector("#panel-filters-body"),
  toggleSpotlight: document.querySelector("#toggle-spotlight"),
  panelSpotlightBody: document.querySelector("#panel-spotlight-body"),
  toggleConciergeFirst: document.querySelector("#toggle-concierge-first"),
  toggleConciergeGift: document.querySelector("#toggle-concierge-gift"),
  baseLabel: document.querySelector("#base-label"),
  baseName: document.querySelector("#base-name"),
  baseLocationLabel: document.querySelector("#base-location-label"),
  baseNearbyLabel: document.querySelector("#base-nearby-label"),
  baseVersionLabel: document.querySelector("#base-version-label"),
  baseOpenBtn: document.querySelector("#base-open-btn"),
  weatherTitle: document.querySelector("#weather-title"),
  weatherSummary: document.querySelector("#weather-summary"),
  weatherRain: document.querySelector("#weather-rain"),
  jumpFilters: document.querySelector("#jump-filters"),
  jumpSpotlight: document.querySelector("#jump-spotlight"),
  jumpFavorites: document.querySelector("#jump-favorites"),
  jumpHotel: document.querySelector("#jump-hotel"),
  addHomeBtn: document.querySelector("#add-home-btn"),
  addHomeHint: document.querySelector("#add-home-hint"),
  langSelect: document.querySelector("#lang-select"),
  primaryFilters: document.querySelector("#primary-filters"),
  subcategoryFilters: document.querySelector("#subcategory-filters"),
  mealBlock: document.querySelector("#meal-block"),
  mealFilters: document.querySelector("#meal-filters"),
  primaryCount: document.querySelector("#primary-count"),
  subcategoryCount: document.querySelector("#subcategory-count"),
  mealCount: document.querySelector("#meal-count"),
  resultCount: document.querySelector("#result-count"),
  focusLabel: document.querySelector("#focus-label"),
  statusText: document.querySelector("#status-text"),
  selectedKicker: document.querySelector("#selected-kicker"),
  selectedName: document.querySelector("#selected-name"),
  selectedSecondary: document.querySelector("#selected-secondary"),
  selectedStatus: document.querySelector("#selected-status"),
  selectedPrimary: document.querySelector("#selected-primary"),
  selectedSubcategory: document.querySelector("#selected-subcategory"),
  selectedMrt: document.querySelector("#selected-mrt"),
  selectedAddress: document.querySelector("#selected-address"),
  selectedPhone: document.querySelector("#selected-phone"),
  selectedHours: document.querySelector("#selected-hours"),
  selectedNotes: document.querySelector("#selected-notes"),
  selectedOpen: document.querySelector("#selected-open"),
  selectedRoute: document.querySelector("#selected-route"),
  selectedFavorite: document.querySelector("#selected-favorite"),
  mapFrame: document.querySelector("#map-frame"),
  panelSpotlight: document.querySelector("#panel-spotlight"),
  panelCollection: document.querySelector("#panel-collection"),
  panelFavorites: document.querySelector("#panel-favorites"),
  results: document.querySelector("#results"),
  favoritesTitle: document.querySelector("#favorites-title"),
  favoritesCount: document.querySelector("#favorites-count"),
  favoritesHint: document.querySelector("#favorites-hint"),
  favoritesList: document.querySelector("#favorites-list"),
  favoritesClear: document.querySelector("#favorites-clear"),
  favoritesBackSearch: document.querySelector("#favorites-back-search"),
  openFavorites: document.querySelector("#open-favorites"),
  quickFilters: document.querySelectorAll(".quick-filter"),
  backToTop: document.querySelector("#back-to-top"),
};

const filterValues = {
  primary: [],
  subcategory: [WALK_10MIN_SUBCATEGORY],
  meal: [],
};

refreshFilterValues();
void init();

async function init() {
  const hydrated = await hydratePlacesFromApiIfNeeded();
  if (hydrated) {
    refreshFilterValues();
    state.favorites = readFavorites();
    state.walkingCache = readWalkingCache();
    state.openingHoursCache = readOpeningHoursCache();
    state.conciergeRandomPickByPrimary = {};
  }
  sanitizeOpeningHoursCache();
  applyStaticText();
  initializeFilters();
  attachEvents();
  syncFavoritesPanelVisibility();
  syncFloatingControls();
  refreshWeather();
  window.setInterval(refreshWeather, 30 * 60 * 1000);
  render();
  refreshWalkingTimesInBackground();
  refreshOpeningHoursInBackground();
}

function listSubcategoryValues(rawValue) {
  const normalized = normalizeSubcategory(rawValue);
  if (!normalized) return [];
  return uniqueValues(
    normalized
      .split("|")
      .map((item) => normalizeSubcategory(item))
      .filter(Boolean)
  );
}

function refreshFilterValues() {
  filterValues.primary = uniqueValues(
    places
      .map((place) => normalizeText(place.primary_category))
      .filter(Boolean)
  );

  const subcategoryValues = uniqueValues(
    places.flatMap((place) => listSubcategoryValues(place.subcategory))
  ).filter((value) => value !== WALK_10MIN_SUBCATEGORY);

  filterValues.subcategory = [WALK_10MIN_SUBCATEGORY, ...subcategoryValues];

  filterValues.meal = uniqueValues(
    places.flatMap((place) => getMealTags(place).map(normalizeMealTag))
  );
}

function normalizeApiPlaceItem(item, index) {
  const safeIndex = index + 1;
  return {
    id: normalizeText(item?.id) || `ihg_api_${String(safeIndex).padStart(3, "0")}`,
    map_label_name: normalizeText(item?.name),
    name_zh: normalizeText(item?.name),
    name_en: "",
    name_ja: "",
    primary_category: normalizeText(item?.primary_category),
    subcategory: normalizeSubcategory(item?.subcategory),
    business_type: normalizeText(item?.business_type),
    meal_tags: [],
    google_maps_url: normalizeText(item?.maps_url),
    address_zh: normalizeText(item?.address),
    phone: normalizeText(item?.phone),
    opening_hours: normalizeText(item?.opening_hours),
    near_mrt: normalizeText(item?.near_mrt),
    notes: normalizeText(item?.notes),
    source_status: normalizeText(item?.source_status) || "map_only",
    is_active: item?.is_active !== false,
    walk_10min_from_hotel: item?.walk_10min_from_hotel === true,
    display_order: Number.isFinite(Number(item?.display_order)) ? Number(item.display_order) : safeIndex,
  };
}

async function hydratePlacesFromApiIfNeeded() {
  if (places.length > 0) return false;
  if (runtimePlacesHydrationPromise) return runtimePlacesHydrationPromise;

  runtimePlacesHydrationPromise = (async () => {
    try {
      const response = await fetch(RUNTIME_PLACES_FALLBACK_URL, { cache: "no-store" });
      if (!response.ok) return false;

      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      if (!items.length) return false;

      const normalized = normalizeRuntimePlaces(
        items.map((item, index) => normalizeApiPlaceItem(item, index)),
        hotelRecord?.id || ""
      );

      if (!normalized.length) return false;
      places = normalized;
      return true;
    } catch (_error) {
      return false;
    } finally {
      runtimePlacesHydrationPromise = null;
    }
  })();

  return runtimePlacesHydrationPromise;
}

function readLang() {
  try {
    const v = localStorage.getItem("ihg_map_lang");
    return LANGS.includes(v) ? v : "zh";
  } catch (_e) {
    return "zh";
  }
}

function saveLang(lang) {
  try {
    localStorage.setItem("ihg_map_lang", lang);
  } catch (_e) {
    // ignore
  }
}

function readFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const validIds = new Set(places.map((p) => p.id));
    return new Set(parsed.filter((id) => validIds.has(id)));
  } catch (_e) {
    return new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...state.favorites]));
  } catch (_e) {
    // ignore
  }
}

function readWalkingCache() {
  try {
    const raw = localStorage.getItem(WALKING_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const validIds = new Set(places.map((p) => p.id));
    const output = {};

    Object.entries(parsed).forEach(([id, record]) => {
      if (!validIds.has(id)) return;
      if (!record || typeof record !== "object") return;
      const seconds = Number(record.seconds);
      const updatedAt = Number(record.updatedAt);
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      if (!Number.isFinite(updatedAt) || updatedAt <= 0) return;
      output[id] = { seconds, updatedAt };
    });

    return output;
  } catch (_e) {
    return {};
  }
}

function saveWalkingCache() {
  try {
    localStorage.setItem(WALKING_CACHE_KEY, JSON.stringify(state.walkingCache));
  } catch (_e) {
    // ignore
  }
}

function readOpeningHoursCache() {
  try {
    const raw = localStorage.getItem(OPENING_HOURS_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const validIds = new Set(places.map((p) => p.id));
    const output = {};

    Object.entries(parsed).forEach(([id, record]) => {
      if (!validIds.has(id)) return;
      if (!record || typeof record !== "object") return;

      const updatedAt = Number(record.updatedAt);
      if (!Number.isFinite(updatedAt) || updatedAt <= 0) return;

      const hours = normalizeText(record.hours);
      const businessStatus = normalizeText(record.businessStatus).toUpperCase();
      output[id] = { hours, businessStatus, updatedAt };
    });

    return output;
  } catch (_e) {
    return {};
  }
}

function saveOpeningHoursCache() {
  try {
    localStorage.setItem(OPENING_HOURS_CACHE_KEY, JSON.stringify(state.openingHoursCache));
  } catch (_e) {
    // ignore
  }
}

function sanitizeOpeningHoursCache() {
  const records = Object.values(state.openingHoursCache || {}).filter(
    (record) => record && typeof record === "object" && isOpeningHoursRecordFresh(record)
  );
  if (!records.length) return;

  const closedCount = records.filter((record) => {
    const status = normalizeText(record.businessStatus).toUpperCase();
    return status === "CLOSED_TEMPORARILY" || status === "CLOSED_PERMANENTLY";
  }).length;

  // If almost all points are marked closed, treat cache as corrupted and reset it.
  if (closedCount / records.length >= 0.9) {
    state.openingHoursCache = {};
    saveOpeningHoursCache();
  }
}

function tt(key) {
  return (TEXT[state.lang] && TEXT[state.lang][key]) || TEXT.zh[key] || "";
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function createFilterState() {
  return { search: "", activeOnly: true, primary: new Set(), subcategory: new Set(), meal: new Set() };
}

function cloneFilterState(s) {
  return { search: s.search, activeOnly: s.activeOnly, primary: new Set(s.primary), subcategory: new Set(s.subcategory), meal: new Set(s.meal) };
}

function initializeFilters() {
  renderChipGroup(dom.primaryFilters, filterValues.primary, state.draft.primary, "primary");
  renderChipGroup(dom.subcategoryFilters, filterValues.subcategory, state.draft.subcategory, "subcategory");
  renderChipGroup(dom.mealFilters, filterValues.meal, state.draft.meal, "meal");
  syncMealFilterVisibility();
  updateCounts();
  renderQuickFilters();
  syncPendingState();
}

function updateCounts() {
  const unit = tt("countUnit");
  dom.primaryCount.textContent = `${filterValues.primary.length} ${unit}`;
  dom.subcategoryCount.textContent = `${filterValues.subcategory.length} ${unit}`;
  dom.mealCount.textContent = `${filterValues.meal.length} ${unit}`;
}

function renderChipGroup(container, values, selectedSet, type) {
  container.innerHTML = "";
  values.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${selectedSet.has(value) ? " is-active" : ""}`;
    button.textContent = trCategory(value, type);
    button.addEventListener("click", () => {
      if (selectedSet.has(value)) selectedSet.delete(value); else selectedSet.add(value);
      renderChipGroup(container, values, selectedSet, type);
      markDirty();
    });
    container.appendChild(button);
  });
}

function applyStaticText() {
  const text = TEXT[state.lang] || TEXT.zh;
  const setTextOrHide = (element, value) => {
    if (!element) return;
    const content = normalizeText(value);
    element.textContent = content;
    element.hidden = !content;
  };
  document.documentElement.lang = state.lang === "zh" ? "zh-Hant" : state.lang;
  document.title = text.title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", text.desc);
  dom.pageTitle.textContent = text.title;
  dom.versionTag.textContent = text.versionTag;
  if (dom.jumpFilters) dom.jumpFilters.textContent = text.jumpFilters;
  if (dom.jumpSpotlight) dom.jumpSpotlight.textContent = text.jumpSpotlight;
  if (dom.jumpFavorites) dom.jumpFavorites.textContent = text.jumpFavorites;
  if (dom.jumpHotel) dom.jumpHotel.textContent = text.jumpHotel;
  if (dom.addHomeBtn) {
    dom.addHomeBtn.textContent = text.addHomeButton;
    dom.addHomeBtn.setAttribute("aria-label", text.addHomeButton);
  }
  if (dom.addHomeHint) dom.addHomeHint.textContent = text.addHomeHint;
  dom.guestNoteText.textContent = text.note;
  dom.filtersTitle.textContent = text.filters;
  dom.searchLabel.textContent = text.searchLabel;
  dom.searchInput.placeholder = text.searchPlaceholder;
  dom.activeOnlyText.textContent = text.activeOnly;
  dom.resetFilters.textContent = text.clear;
  dom.quickTitle.textContent = text.quick;
  setTextOrHide(dom.quickSubtitle, text.quickSub);
  dom.quickAll.textContent = text.quickAll;
  dom.quickFood.textContent = text.quickFood;
  dom.quickSight.textContent = text.quickSight;
  dom.quickTransport.textContent = text.quickTransport;
  dom.quickShopping.textContent = text.quickShop;
  dom.quickFacility.textContent = text.quickFacility;
  dom.applyFilters.textContent = text.apply;
  dom.filterPending.textContent = text.pending;
  dom.primaryTitle.textContent = text.primary;
  dom.subcategoryTitle.textContent = text.subcategory;
  dom.mealTitle.textContent = text.meal;
  dom.overviewTitle.textContent = text.overview;
  dom.summaryMatchLabel.textContent = text.match;
  dom.summaryFocusLabel.textContent = text.focus;
  dom.spotlightTitle.textContent = text.spotlight;
  setTextOrHide(dom.spotlightNote, text.spotlightNote);
  dom.collectionTitle.textContent = text.collection;
  setTextOrHide(dom.collectionHint, text.collectionHint);
  if (dom.conciergeTitle) dom.conciergeTitle.textContent = text.conciergeTitle;
  if (dom.conciergeSubtitle) dom.conciergeSubtitle.textContent = text.conciergeSubtitle;
  if (dom.conciergeFirstTitle) dom.conciergeFirstTitle.textContent = text.conciergeFirstTitle;
  if (dom.conciergeGiftTitle) dom.conciergeGiftTitle.textContent = text.conciergeGiftTitle;
  if (dom.conciergeOrderNote) dom.conciergeOrderNote.textContent = text.conciergeOrderNote;
  if (dom.hotelInfoTitle) dom.hotelInfoTitle.textContent = text.hotelInfoTitle;
  if (dom.picksTitle) dom.picksTitle.textContent = text.picksTitle;
  dom.baseLabel.textContent = text.baseLabel;
  dom.baseName.textContent = text.baseName;
  dom.baseLocationLabel.textContent = text.baseLocation;
  dom.baseNearbyLabel.textContent = text.baseNearby;
  dom.baseVersionLabel.textContent = text.baseVersion;
  dom.baseOpenBtn.textContent = text.baseOpen;
  dom.baseOpenBtn.href = buildSearchUrl(HOTEL);
  dom.favoritesTitle.textContent = text.favoritesTitle;
  dom.favoritesHint.textContent = text.favoritesHint;
  dom.favoritesClear.textContent = text.favoritesClear;
  if (dom.favoritesBackSearch) dom.favoritesBackSearch.textContent = text.favoritesBackSearch;
  if (dom.openFavorites) dom.openFavorites.setAttribute("aria-label", text.favoritesLauncher);
  dom.weatherTitle.textContent = text.weatherTitle;
  dom.backToTop.textContent = text.top;
  dom.backToTop.setAttribute("aria-label", text.backTop);
  if (dom.langSelect) dom.langSelect.value = state.lang;
  syncSectionCollapseUI();
  updateFavoriteCount();
  renderFavoriteButtonLabel();
}
function attachEvents() {
  dom.searchInput.addEventListener("input", (event) => {
    state.draft.search = event.target.value.trim().toLowerCase();
    markDirty();
  });

  dom.activeOnly.addEventListener("change", (event) => {
    state.draft.activeOnly = event.target.checked;
    markDirty();
  });

  dom.applyFilters.addEventListener("click", () => applyDraftFilters());

  dom.quickFilters.forEach((button) => {
    button.addEventListener("click", () => {
      state.draft = createFilterState();
      dom.searchInput.value = "";
      dom.activeOnly.checked = true;
      if (button.dataset.quickPrimary) state.draft.primary.add(button.dataset.quickPrimary);
      initializeFilters();
      markDirty();
    });
  });

  dom.resetFilters.addEventListener("click", () => {
    state.draft = createFilterState();
    state.applied = createFilterState();
    state.selectedPlaceId = null;
    state.hasSearched = false;
    state.dirty = false;
    dom.searchInput.value = "";
    dom.activeOnly.checked = true;
    initializeFilters();
    render();
  });

  if (dom.langSelect) {
    dom.langSelect.addEventListener("change", () => {
      const nextLang = dom.langSelect.value;
      if (!LANGS.includes(nextLang) || nextLang === state.lang) return;
      state.lang = nextLang;
      saveLang(nextLang);
      applyStaticText();
      initializeFilters();
      refreshWeather();
      render();
    });
  }

  if (dom.selectedFavorite) {
    dom.selectedFavorite.addEventListener("click", () => {
      const selectedPlace = getSelectedPlace(places);
      if (!selectedPlace) return;
      toggleFavorite(selectedPlace.id);
      render();
    });
  }

  if (dom.favoritesClear) {
    dom.favoritesClear.addEventListener("click", () => {
      state.favorites.clear();
      saveFavorites();
      render();
    });
  }

  if (dom.openFavorites) {
    dom.openFavorites.addEventListener("click", () => {
      showFavoritesPanel(true);
    });
  }

  if (dom.jumpFavorites) {
    dom.jumpFavorites.addEventListener("click", () => {
      showFavoritesPanel(true);
    });
  }

  if (dom.favoritesBackSearch) {
    dom.favoritesBackSearch.addEventListener("click", () => {
      hideFavoritesPanel(true);
    });
  }

  bindCollapseToggle("hotel", dom.toggleHotel);
  bindCollapseToggle("picks", dom.togglePicks);
  bindCollapseToggle("filters", dom.toggleFilters);
  bindCollapseToggle("spotlight", dom.toggleSpotlight);
  bindCollapseToggle("conciergeFirst", dom.toggleConciergeFirst);
  bindCollapseToggle("conciergeGift", dom.toggleConciergeGift);

  if (dom.backToTop) {
    dom.backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  if (dom.addHomeBtn && dom.addHomeHint) {
    dom.addHomeBtn.addEventListener("click", () => {
      const nextOpen = dom.addHomeHint.hidden;
      dom.addHomeHint.hidden = !nextOpen;
      dom.addHomeBtn.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    });
  }

  window.addEventListener("scroll", syncFloatingControls, { passive: true });
}

function bindCollapseToggle(key, button) {
  if (!button) return;
  button.addEventListener("click", () => {
    state.collapsed[key] = !state.collapsed[key];
    syncSectionCollapseUI();
  });
}

function markDirty() {
  state.dirty = true;
  syncMealFilterVisibility();
  renderQuickFilters();
  syncPendingState();
}

function syncPendingState() {
  dom.applyFilters.disabled = !state.dirty && state.hasSearched;
  dom.filterPending.hidden = !state.dirty;
}

function applyDraftFilters() {
  if (!state.draft.primary.has("餐飲")) {
    state.draft.meal.clear();
  }
  state.applied = cloneFilterState(state.draft);
  state.hasSearched = true;
  state.dirty = false;
  renderQuickFilters();
  syncPendingState();
  render();
  if (dom.panelCollection) {
    dom.panelCollection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (state.applied.subcategory.has(WALK_10MIN_SUBCATEGORY)) {
    refreshWalkingTimesInBackground();
  }
}

function renderQuickFilters() {
  const base = state.dirty ? state.draft : state.applied;
  const activePrimary =
    base.primary.size === 1 &&
    base.subcategory.size === 0 &&
    base.meal.size === 0 &&
    !base.search &&
    base.activeOnly
      ? [...base.primary][0]
      : null;

  dom.quickFilters.forEach((button) => {
    const isAll =
      button.dataset.quickFilter === "all" &&
      !base.search &&
      base.activeOnly &&
      base.primary.size === 0 &&
      base.subcategory.size === 0 &&
      base.meal.size === 0;
    const isPrimary = button.dataset.quickPrimary && button.dataset.quickPrimary === activePrimary;
    button.classList.toggle("is-active", Boolean(isAll || isPrimary));
  });
}

function syncMealFilterVisibility() {
  const showMealFilters = state.draft.primary.has("餐飲");
  if (dom.mealBlock) dom.mealBlock.hidden = !showMealFilters;
  if (!showMealFilters && state.draft.meal.size) {
    state.draft.meal.clear();
    renderChipGroup(dom.mealFilters, filterValues.meal, state.draft.meal, "meal");
  }
}

function syncBackToTop() {
  if (!dom.backToTop) return;
  dom.backToTop.classList.toggle("is-visible", window.scrollY > 320);
}

function syncVersionTagVisibility() {
  if (!dom.versionTag) return;
  const doc = document.documentElement;
  const nearBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - 120;
  dom.versionTag.classList.toggle("is-visible-bottom", nearBottom);
}

function syncFloatingControls() {
  syncBackToTop();
  syncVersionTagVisibility();
}

function syncSectionCollapseUI() {
  const text = TEXT[state.lang] || TEXT.zh;
  const renderToggle = (key, button, body) => {
    if (!button || !body) return;
    const collapsed = Boolean(state.collapsed[key]);
    body.hidden = collapsed;
    button.classList.toggle("is-collapsed", collapsed);
    button.textContent = collapsed ? "+" : "−";
    button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    button.setAttribute("aria-label", collapsed ? text.collapseShow : text.collapseHide);
    button.setAttribute("title", collapsed ? text.collapseShow : text.collapseHide);
  };

  renderToggle("hotel", dom.toggleHotel, dom.panelHotelBody);
  renderToggle("picks", dom.togglePicks, dom.panelPicksBody);
  renderToggle("filters", dom.toggleFilters, dom.panelFiltersBody);
  renderToggle("spotlight", dom.toggleSpotlight, dom.panelSpotlightBody);
  renderToggle("conciergeFirst", dom.toggleConciergeFirst, dom.conciergeFirstBody);
  renderToggle("conciergeGift", dom.toggleConciergeGift, dom.conciergeGiftBody);
}

function syncFavoritesPanelVisibility() {
  if (dom.panelFavorites) {
    dom.panelFavorites.hidden = !state.favoritesPanelOpen;
  }
  if (dom.openFavorites) {
    dom.openFavorites.classList.toggle("is-active", state.favoritesPanelOpen);
  }
}

function showFavoritesPanel(withScroll) {
  state.favoritesPanelOpen = true;
  syncFavoritesPanelVisibility();
  if (withScroll && dom.panelFavorites) {
    dom.panelFavorites.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function hideFavoritesPanel(withScroll) {
  state.favoritesPanelOpen = false;
  syncFavoritesPanelVisibility();
  if (withScroll && dom.panelCollection) {
    dom.panelCollection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function getConciergePoolByPrimary(primaryCategory) {
  const businessTypeFallback = {
    餐飲: new Set(["restaurant", "cafe", "dessert", "snack", "drink_shop"]),
    景點: new Set(["attraction", "museum", "landmark", "park"]),
    商店: new Set(["shop", "store", "mall", "market"]),
  };
  const expectedTypes = businessTypeFallback[primaryCategory] || new Set();

  return places.filter((place) =>
    (
      normalizeText(place.primary_category) === primaryCategory ||
      expectedTypes.has(normalizeText(place.business_type).toLowerCase())
    ) &&
      !isSuppressedPlace(place) &&
      !isClosedByGoogle(place)
  );
}

function getConciergeRandomPlaceByPrimary(primaryCategory) {
  const pool = getConciergePoolByPrimary(primaryCategory);
  if (!pool.length) return null;

  const selectedId = normalizeText(state.conciergeRandomPickByPrimary?.[primaryCategory]);
  let selected = selectedId ? pool.find((place) => place.id === selectedId) : null;
  if (!selected) {
    selected = pool[Math.floor(Math.random() * pool.length)];
    state.conciergeRandomPickByPrimary[primaryCategory] = selected.id;
  }
  return selected;
}

function renderConciergePicks() {
  if (!dom.picksList) return;
  const text = TEXT[state.lang] || TEXT.zh;

  const picks = CONCIERGE_PICK_PRIMARY_ORDER
    .map((primaryCategory) => {
      const place = getConciergeRandomPlaceByPrimary(primaryCategory);
      return place ? { place, title: getDisplayName(place) } : null;
    })
    .filter(Boolean);

  if (!picks.length) {
    dom.picksList.innerHTML = `<div class="empty-state">${escapeHtml(text.empty)}</div>`;
    return;
  }

  dom.picksList.innerHTML = picks
    .slice(0, 3)
    .map(({ place, title }) => {
      const displayName = getDisplayName(place);
      const secondaryBase = getSecondaryName(place);
      const secondaryParts = [];
      if (title && title !== displayName) secondaryParts.push(displayName);
      if (secondaryBase) secondaryParts.push(secondaryBase);
      const secondary = uniqueValues(secondaryParts);
      const openingHours = getResolvedOpeningHours(place);
      const openingHoursDisplay = openingHours || text.closedNow;
      const intro = getBasicIntro(place);
      const address = localizeAddressText(place.address_zh);
      const phone = getDisplayPhone(place);
      const subcategoryDisplay = trCategory(normalizeSubcategory(place.subcategory), "subcategory");
      const mealBadges = uniqueValues(getMealTags(place).map(normalizeMealTag))
        .filter((tag) => trCategory(tag, "meal") !== subcategoryDisplay)
        .map((tag) => `<span class="badge">${escapeHtml(trCategory(tag, "meal"))}</span>`)
        .join("");
      const walk10Badge = isWithin10MinWalk(place) ? `<span class="badge">${escapeHtml(trCategory(WALK_10MIN_SUBCATEGORY, "subcategory"))}</span>` : "";
      const hoursLine = `<div>${escapeHtml(text.hours)}${escapeHtml(openingHoursDisplay)}</div>`;
      const noteLine = intro ? `<div>${escapeHtml(text.notes)}${escapeHtml(intro)}</div>` : "";
      const favoriteLabel = isFavorite(place.id) ? text.removeFavorite : text.addFavorite;

      return `
        <article class="place-card pick-card${state.selectedPlaceId === place.id ? " is-selected" : ""}" data-place-id="${escapeAttribute(place.id)}">
          <div class="place-card__top">
            <div>
              <h3 class="place-card__title">${escapeHtml(title)}</h3>
              ${secondary.length ? `<p class="place-card__secondary">${escapeHtml(secondary.join(" / "))}</p>` : ""}
            </div>
            <span class="badge">${escapeHtml(trCategory(place.primary_category, "primary"))}</span>
          </div>
          <div class="badge-row">
            <span class="badge">${escapeHtml(subcategoryDisplay)}</span>
            ${walk10Badge}
            ${mealBadges}
          </div>
          <div class="place-card__meta">
            <div>${escapeHtml(text.addr)}${escapeHtml(address || text.addrPending)}</div>
            <div>${escapeHtml(text.phone)}${escapeHtml(phone || text.phonePending)}</div>
            <div>${escapeHtml(text.mrt)}${escapeHtml(trMrt(place.near_mrt || text.mrtPending))}</div>
            ${hoursLine}
            ${noteLine}
          </div>
          <div class="place-card__actions">
            <a class="button button--slim" data-stop-card-select="1" href="${escapeAttribute(buildSearchUrl(place))}" target="_blank" rel="noreferrer">Google Maps</a>
            <a class="button button--secondary button--slim" data-stop-card-select="1" href="${escapeAttribute(buildRouteUrl(place))}" target="_blank" rel="noreferrer">${escapeHtml(text.routeFromHotelCard)}</a>
            <button class="button button--ghost button--slim" type="button" data-stop-card-select="1" data-pick-favorite-id="${escapeAttribute(place.id)}">${escapeHtml(favoriteLabel)}</button>
          </div>
        </article>
      `;
    })
    .join("");

  dom.picksList.querySelectorAll(".pick-card[data-place-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const nextId = normalizeText(card.getAttribute("data-place-id"));
      if (!nextId) return;
      state.selectedPlaceId = nextId;
      render();
      if (dom.panelSpotlight) {
        dom.panelSpotlight.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  dom.picksList.querySelectorAll('[data-stop-card-select="1"]').forEach((element) => {
    element.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  });

  dom.picksList.querySelectorAll("[data-pick-favorite-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(button.dataset.pickFavoriteId);
      render();
    });
  });
}

function renderConciergeSections() {
  renderConciergeFirstTime();
  renderConciergeGiftList();
}

function normalizeLookupText(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, "");
}

function resolveConciergeFirstTimeItems() {
  const usedPlaceIds = new Set();

  return CONCIERGE_FIRST_TIME_FIXED_ITEMS.map((item) => {
    const aliases = (Array.isArray(item.aliases) ? item.aliases : [])
      .map((value) => normalizeLookupText(value))
      .filter(Boolean);
    const fallbackId = normalizeText(item.fallbackId);

    const place = places.find((candidate) => {
      if (usedPlaceIds.has(candidate.id)) return false;
      if (isSuppressedPlace(candidate) || isClosedByGoogle(candidate)) return false;

      const fields = [
        candidate.id,
        candidate.map_label_name,
        candidate.name_zh,
        candidate.name_en,
        candidate.name_ja,
      ];
      const normalizedFields = fields.map((value) => normalizeLookupText(value)).filter(Boolean);

      const aliasMatched = aliases.some((alias) =>
        normalizedFields.some((field) => field.includes(alias) || alias.includes(field))
      );
      if (aliasMatched) return true;

      return Boolean(fallbackId && candidate.id === fallbackId);
    });

    if (!place) return null;
    usedPlaceIds.add(place.id);
    return { place, title: localizeConciergeText(item.title) || getDisplayName(place) };
  }).filter(Boolean);
}

function renderConciergeFirstTime() {
  if (!dom.conciergeFirstList) return;
  const text = TEXT[state.lang] || TEXT.zh;

  const firstTimePlaces = resolveConciergeFirstTimeItems();

  if (!firstTimePlaces.length) {
    dom.conciergeFirstList.innerHTML = `<div class="empty-state">${escapeHtml(text.empty)}</div>`;
    return;
  }

  dom.conciergeFirstList.innerHTML = firstTimePlaces
    .map((item, index) => {
      const { place } = item;
      const title = normalizeText(item.title) || getDisplayName(place);
      const displayTitle = `${index + 1}. ${title}`;
      const displayName = getDisplayName(place);
      const secondaryBase = getSecondaryName(place);
      const secondaryParts = [];
      if (title && title !== displayName) secondaryParts.push(displayName);
      if (secondaryBase) secondaryParts.push(secondaryBase);
      const secondary = uniqueValues(secondaryParts);
      const openingHours = getResolvedOpeningHours(place);
      const openingHoursDisplay = openingHours || text.closedNow;
      const intro = getBasicIntro(place);
      const address = localizeAddressText(place.address_zh);
      const phone = getDisplayPhone(place);
      const subcategoryDisplay = trCategory(normalizeSubcategory(place.subcategory), "subcategory");
      const mealBadges = uniqueValues(getMealTags(place).map(normalizeMealTag))
        .filter((tag) => trCategory(tag, "meal") !== subcategoryDisplay)
        .map((tag) => `<span class="badge">${escapeHtml(trCategory(tag, "meal"))}</span>`)
        .join("");
      const walk10Badge = isWithin10MinWalk(place) ? `<span class="badge">${escapeHtml(trCategory(WALK_10MIN_SUBCATEGORY, "subcategory"))}</span>` : "";
      const hoursLine = `<div>${escapeHtml(text.hours)}${escapeHtml(openingHoursDisplay)}</div>`;
      const notesLine = intro ? `<div>${escapeHtml(text.notes)}${escapeHtml(intro)}</div>` : "";
      const favoriteLabel = isFavorite(place.id) ? text.removeFavorite : text.addFavorite;

      return `
        <article class="place-card concierge-first-card${state.selectedPlaceId === place.id ? " is-selected" : ""}" data-place-id="${escapeAttribute(place.id)}">
          <div class="place-card__top">
            <div>
              <h3 class="place-card__title">${escapeHtml(displayTitle)}</h3>
              ${secondary.length ? `<p class="place-card__secondary">${escapeHtml(secondary.join(" / "))}</p>` : ""}
            </div>
            <span class="badge">${escapeHtml(trCategory(place.primary_category, "primary"))}</span>
          </div>
          <div class="badge-row">
            <span class="badge">${escapeHtml(subcategoryDisplay)}</span>
            ${walk10Badge}
            ${mealBadges}
          </div>
          <div class="place-card__meta">
            <div>${escapeHtml(text.addr)}${escapeHtml(address || text.addrPending)}</div>
            <div>${escapeHtml(text.phone)}${escapeHtml(phone || text.phonePending)}</div>
            <div>${escapeHtml(text.mrt)}${escapeHtml(trMrt(place.near_mrt || text.mrtPending))}</div>
            ${hoursLine}
            ${notesLine}
          </div>
          <div class="place-card__actions concierge-first-card__actions">
            <a class="button button--slim" data-stop-card-select="1" href="${escapeAttribute(buildSearchUrl(place))}" target="_blank" rel="noreferrer">Google Maps</a>
            <a class="button button--secondary button--slim" data-stop-card-select="1" href="${escapeAttribute(buildRouteUrl(place))}" target="_blank" rel="noreferrer">${escapeHtml(text.routeFromHotelCard)}</a>
            <button class="button button--ghost button--slim" type="button" data-stop-card-select="1" data-concierge-first-favorite-id="${escapeAttribute(place.id)}">${escapeHtml(favoriteLabel)}</button>
          </div>
        </article>
      `;
    })
    .join("");

  dom.conciergeFirstList.querySelectorAll(".concierge-first-card[data-place-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const nextId = normalizeText(card.getAttribute("data-place-id"));
      if (!nextId) return;
      state.selectedPlaceId = nextId;
      render();
      if (dom.panelSpotlight) {
        dom.panelSpotlight.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  dom.conciergeFirstList.querySelectorAll('[data-stop-card-select="1"]').forEach((element) => {
    element.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  });

  dom.conciergeFirstList.querySelectorAll("[data-concierge-first-favorite-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const placeId = normalizeText(button.dataset.conciergeFirstFavoriteId);
      if (!placeId) return;
      toggleFavorite(placeId);
      render();
    });
  });
}

function renderConciergeGiftList() {
  if (!dom.conciergeGiftList) return;

  dom.conciergeGiftList.innerHTML = CONCIERGE_GIFT_ITEMS
    .map((item) => {
      const code = normalizeText(item.id).replace("gift_", "").toUpperCase();
      const name = localizeConciergeText(item.name);
      const intro = localizeConciergeText(item.intro);
      return `
        <article class="concierge-gift-item">
          <div class="concierge-gift-logo concierge-gift-logo--${escapeAttribute(item.brand)}">
            <span>${escapeHtml(item.logo)}</span>
          </div>
          <div class="concierge-gift-body">
            <p class="concierge-gift-code">${escapeHtml(code)}</p>
            <h3>${escapeHtml(name)}</h3>
            <p>${escapeHtml(intro)}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function localizeConciergeText(copyMap) {
  if (!copyMap || typeof copyMap !== "object") return "";
  return normalizeText(copyMap[state.lang]) || normalizeText(copyMap.zh) || normalizeText(copyMap.en) || normalizeText(copyMap.ja) || "";
}

function isFavorite(placeId) {
  return state.favorites.has(placeId);
}

function toggleFavorite(placeId) {
  if (!placeId) return;
  if (state.favorites.has(placeId)) state.favorites.delete(placeId);
  else state.favorites.add(placeId);
  saveFavorites();
}

function updateFavoriteCount() {
  const unit = tt("favoritesCountUnit");
  const text = TEXT[state.lang] || TEXT.zh;
  dom.favoritesCount.textContent = `${state.favorites.size} ${unit}`;
  if (dom.openFavorites) {
    dom.openFavorites.textContent = `${text.favoritesLauncher} (${state.favorites.size})`;
  }
}

function renderFavoriteButtonLabel() {
  if (!dom.selectedFavorite) return;
  const selected = getSelectedPlace(places);
  const text = TEXT[state.lang] || TEXT.zh;

  if (!selected) {
    dom.selectedFavorite.hidden = true;
    return;
  }

  dom.selectedFavorite.hidden = false;
  dom.selectedFavorite.textContent = isFavorite(selected.id) ? text.removeFavorite : text.addFavorite;
}

function isWithin10MinWalk(place) {
  const record = state.walkingCache[place.id];
  if (record && isWalkingRecordFresh(record)) {
    return record.seconds <= 10 * 60;
  }
  return place.walk_10min_from_hotel === true;
}

function isWalkingRecordFresh(record) {
  if (!record || typeof record !== "object") return false;
  const updatedAt = Number(record.updatedAt);
  return Number.isFinite(updatedAt) && updatedAt > 0 && Date.now() - updatedAt < WALKING_CACHE_TTL_MS;
}

function isOpeningHoursRecordFresh(record) {
  if (!record || typeof record !== "object") return false;
  const updatedAt = Number(record.updatedAt);
  return Number.isFinite(updatedAt) && updatedAt > 0 && Date.now() - updatedAt < OPENING_HOURS_CACHE_TTL_MS;
}

function isClosedByGoogle(place) {
  // Keep list stable: do not hide points by Google status cache.
  // Closure info can still be shown in notes/hours, but we avoid full-list blanking.
  return false;
}

function getResolvedOpeningHours(place) {
  const fromData = normalizeText(place.opening_hours);
  if (fromData) return extractTodayOpeningHours(fromData);
  const record = state.openingHoursCache[place.id];
  if (!isOpeningHoursRecordFresh(record)) return "";
  return extractTodayOpeningHours(normalizeText(record.hours));
}

const DAY_TOKENS = [
  ["星期日", "週日", "禮拜日", "礼拜日", "Sunday", "Sun", "日曜日"],
  ["星期一", "週一", "禮拜一", "礼拜一", "Monday", "Mon", "月曜日"],
  ["星期二", "週二", "禮拜二", "礼拜二", "Tuesday", "Tue", "火曜日"],
  ["星期三", "週三", "禮拜三", "礼拜三", "Wednesday", "Wed", "水曜日"],
  ["星期四", "週四", "禮拜四", "礼拜四", "Thursday", "Thu", "木曜日"],
  ["星期五", "週五", "禮拜五", "礼拜五", "Friday", "Fri", "金曜日"],
  ["星期六", "週六", "禮拜六", "礼拜六", "Saturday", "Sat", "土曜日"],
];
const DAY_LABELS = {
  zh: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ja: ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"],
};
const MISSING_VALUE_PATTERNS = [
  /^未提供$/,
  /^店家未提供$/,
  /^店家未提供電話$/,
  /^暫無資料$/,
  /^無$/,
  /^n\/a$/i,
  /^na$/i,
  /^none$/i,
  /^null$/i,
  /^-+$/,
  /^—+$/,
];
const ADDRESS_REPLACEMENTS_EN = [
  [/臺北市|台北市/g, "Taipei City"],
  [/新北市/g, "New Taipei City"],
  [/信義區/g, "Xinyi District"],
  [/大安區/g, "Da'an District"],
  [/松山區/g, "Songshan District"],
  [/中山區/g, "Zhongshan District"],
  [/中正區/g, "Zhongzheng District"],
  [/萬華區/g, "Wanhua District"],
  [/南港區/g, "Nangang District"],
  [/內湖區/g, "Neihu District"],
  [/忠孝東路/g, "Zhongxiao E. Rd."],
  [/忠孝西路/g, "Zhongxiao W. Rd."],
  [/光復南路/g, "Guangfu S. Rd."],
  [/市府路/g, "Shifu Rd."],
  [/松高路/g, "Songgao Rd."],
  [/松仁路/g, "Songren Rd."],
  [/松壽路/g, "Songshou Rd."],
  [/菸廠路/g, "Yanchang Rd."],
  [/仁愛路/g, "Ren'ai Rd."],
  [/基隆路/g, "Keelung Rd."],
  [/敦化南路/g, "Dunhua S. Rd."],
];

function extractTodayOpeningHours(rawHours) {
  const normalized = normalizeText(rawHours);
  if (!normalized) return "";

  const segments = normalized
    .split(/[；;\n]+/)
    .map((line) => normalizeText(line))
    .filter(Boolean);
  if (segments.length <= 1) return localizeOpeningHoursText(normalized);

  const todayTokens = DAY_TOKENS[new Date().getDay()] || [];
  const matched = segments.find((segment) => {
    const lower = segment.toLowerCase();
    return todayTokens.some((token) => {
      const tokenLower = normalizeText(token).toLowerCase();
      return (
        lower.startsWith(tokenLower) ||
        lower.startsWith(`${tokenLower}:`) ||
        lower.startsWith(`${tokenLower}：`) ||
        lower.includes(`${tokenLower}:`) ||
        lower.includes(`${tokenLower}：`)
      );
    });
  });

  return localizeOpeningHoursText(matched || normalized);
}

function isMissingValue(rawValue) {
  const value = normalizeText(rawValue);
  if (!value) return true;
  const compact = value.replace(/[。．.,，\s]/g, "");
  if (compact === "未提供" || compact === "店家未提供" || compact === "店家未提供電話" || compact === "暫無資料" || compact === "無") {
    return true;
  }
  return MISSING_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function getDisplayPhone(place) {
  const value = normalizeText(place?.phone);
  if (isMissingValue(value)) return "";
  return value;
}

function localizeAddressText(rawAddress) {
  const value = stripPlusCodeForDisplay(normalizeText(rawAddress));
  if (!value) return "";
  if (state.lang !== "en") return value;

  let result = value;
  ADDRESS_REPLACEMENTS_EN.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });

  result = result
    .replace(/(\d+)段/g, "Sec. $1")
    .replace(/(\d+)巷/g, "Ln. $1")
    .replace(/(\d+)弄/g, "Aly. $1")
    .replace(/(\d+)號/g, "No. $1")
    .replace(/(\d+)樓/g, "$1F")
    .replace(/，/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .trim();

  return result;
}

function localizeOpeningHoursText(rawHours) {
  let value = normalizeText(rawHours);
  if (!value) return "";
  if (state.lang === "zh") return value;

  const labels = DAY_LABELS[state.lang] || DAY_LABELS.zh;
  for (let i = 0; i < 7; i += 1) {
    const dayLabel = labels[i] || DAY_LABELS.zh[i];
    const tokens = [...(DAY_TOKENS[i] || [])]
      .map((token) => normalizeText(token))
      .filter((token) => token && token !== dayLabel)
      .sort((a, b) => b.length - a.length);
    tokens.forEach((token) => {
      if (/^[A-Za-z]+$/.test(token)) {
        value = value.replace(new RegExp(`\\b${escapeRegExp(token)}\\b`, "g"), dayLabel);
        return;
      }
      value = value.replace(new RegExp(escapeRegExp(token), "g"), dayLabel);
    });
  }

  if (state.lang === "en") {
    value = value
      .replace(/24\s*小時營業/g, "Open 24 hours")
      .replace(/營業中/g, "Open now")
      .replace(/暫停營業|暫時關閉|休息中|休息|公休|休業/g, "Closed")
      .replace(/未提供/g, "Not provided");
  } else if (state.lang === "ja") {
    value = value
      .replace(/24\s*小時營業/g, "24時間営業")
      .replace(/營業中/g, "営業中")
      .replace(/暫停營業|暫時關閉|休息中|休息|公休|休業/g, "営業時間外")
      .replace(/未提供/g, "未登録");
  }

  return value
    .replace(/：/g, ": ")
    .replace(/[－–—]/g, "-")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function refreshWalkingTimesInBackground() {
  if (!GOOGLE_MAPS_API_KEY) return;
  if (state.walkingRefreshRunning) return;

  state.walkingRefreshRunning = true;
  (async () => {
    try {
      const maps = await loadMapsApiForRoutes();
      const service = new maps.DirectionsService();
      const targets = places.filter((place) => place.is_active && !isSuppressedPlace(place));
      let changed = false;

      for (const place of targets) {
        const record = state.walkingCache[place.id];
        if (isWalkingRecordFresh(record)) continue;

        const seconds = await fetchWalkingSecondsWithRetry(service, place);
        if (!Number.isFinite(seconds) || seconds <= 0) continue;

        state.walkingCache[place.id] = { seconds, updatedAt: Date.now() };
        changed = true;
        await sleep(WALKING_THROTTLE_MS);
      }

      if (changed) {
        saveWalkingCache();
        render();
      }
    } catch (_error) {
      // Keep page usable; quietly fallback to curated walk flags.
    } finally {
      state.walkingRefreshRunning = false;
    }
  })();
}

function refreshOpeningHoursInBackground() {
  if (!GOOGLE_MAPS_API_KEY) return;
  if (state.openingHoursRefreshRunning) return;

  state.openingHoursRefreshRunning = true;
  (async () => {
    try {
      const maps = await loadMapsApiForRoutes();
      const service =
        maps.places && maps.places.PlacesService
          ? new maps.places.PlacesService(document.createElement("div"))
          : null;
      const targets = places.filter((place) => place.is_active && !isSuppressedPlace(place));
      let changed = false;

      for (const place of targets) {
        const record = state.openingHoursCache[place.id];
        if (isOpeningHoursRecordFresh(record)) continue;

        const result = await fetchOpeningHoursWithRetry(service, place);
        if (!result) continue;

        state.openingHoursCache[place.id] = {
          hours: normalizeText(result.hours),
          businessStatus: normalizeText(result.businessStatus).toUpperCase(),
          updatedAt: Date.now(),
        };
        changed = true;
        await sleep(OPENING_HOURS_THROTTLE_MS);
      }

      if (changed) {
        saveOpeningHoursCache();
        render();
      }
    } catch (_error) {
      // Keep page usable; quietly fallback to static opening hours.
    } finally {
      state.openingHoursRefreshRunning = false;
    }
  })();
}

function loadMapsApiForRoutes() {
  const hasDirectionsApi = () =>
    Boolean(
      window.google &&
      window.google.maps &&
      window.google.maps.DirectionsService
    );

  if (hasDirectionsApi()) {
    return Promise.resolve(window.google.maps);
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Missing GOOGLE_MAPS_API_KEY"));
  }

  if (state.mapsLoaderPromise) return state.mapsLoaderPromise;

  state.mapsLoaderPromise = new Promise((resolve, reject) => {
    const callbackName = "__wanhuaRoutesApiInit";
    const existing = document.querySelector('script[data-google-maps-routes="1"]');
    const cleanup = () => {
      try {
        delete window[callbackName];
      } catch (_e) {
        window[callbackName] = undefined;
      }
    };

    window[callbackName] = () => {
      cleanup();
      if (hasDirectionsApi()) resolve(window.google.maps);
      else reject(new Error("Google Maps API loaded without maps object"));
    };

    if (existing) {
      const maxTry = 25;
      let attempt = 0;
      const timer = window.setInterval(() => {
        attempt += 1;
        if (hasDirectionsApi()) {
          window.clearInterval(timer);
          cleanup();
          resolve(window.google.maps);
          return;
        }
        if (attempt >= maxTry) {
          window.clearInterval(timer);
          reject(new Error("Timed out waiting for Google Maps JS API"));
        }
      }, 180);
      return;
    }

    const script = document.createElement("script");
    script.dataset.googleMapsRoutes = "1";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&v=weekly&libraries=places&language=zh-TW&region=TW&callback=${callbackName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("Failed to load Google Maps JS API"));
    };
    document.head.appendChild(script);
  });

  state.mapsLoaderPromise = state.mapsLoaderPromise.catch((error) => {
    state.mapsLoaderPromise = null;
    throw error;
  });

  return state.mapsLoaderPromise;
}

function requestWalkingSeconds(service, place) {
  const destination = buildMapQuery(place);
  const origin = normalizeText(HOTEL.address_zh) || normalizeText(HOTEL.name_zh) || "InterContinental Taipei";

  return new Promise((resolve, reject) => {
    service.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.WALKING,
        provideRouteAlternatives: false,
      },
      (result, status) => {
        if (status !== "OK") {
          reject(new Error(status));
          return;
        }

        const seconds = Number(result?.routes?.[0]?.legs?.[0]?.duration?.value);
        if (!Number.isFinite(seconds) || seconds <= 0) {
          reject(new Error("NO_DURATION"));
          return;
        }
        resolve(seconds);
      }
    );
  });
}

async function fetchWalkingSecondsWithRetry(service, place) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestWalkingSeconds(service, place);
    } catch (error) {
      const code = String(error && error.message ? error.message : "");
      if ((code === "OVER_QUERY_LIMIT" || code === "RESOURCE_EXHAUSTED") && attempt === 0) {
        await sleep(850);
        continue;
      }
      return null;
    }
  }
  return null;
}

async function fetchOpeningHoursWithRetry(service, place) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestOpeningHours(service, place);
    } catch (error) {
      const code = String(error && error.message ? error.message : "");
      if ((code === "OVER_QUERY_LIMIT" || code === "RESOURCE_EXHAUSTED" || code === "UNKNOWN_ERROR") && attempt === 0) {
        await sleep(900);
        continue;
      }
      return null;
    }
  }
  return null;
}

async function requestOpeningHours(service, place) {
  const queries = buildPlaceLookupQueries(place);
  for (const query of queries) {
    if (!state.placesRestDisabled) {
      const resultFromNewApi = await requestOpeningHoursByPlacesNewApi(query);
      if (resultFromNewApi) return resultFromNewApi;
    }

    if (service && typeof service.findPlaceFromQuery === "function") {
      const resultFromJsService = await requestOpeningHoursByQuery(service, query);
      if (resultFromJsService) return resultFromJsService;
    }
  }
  return null;
}

async function requestOpeningHoursByPlacesNewApi(query) {
  if (!GOOGLE_MAPS_API_KEY) return null;

  let response;
  try {
    response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.businessStatus,places.regularOpeningHours",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "zh-TW",
        regionCode: "TW",
        maxResultCount: 1,
      }),
    });
  } catch (_error) {
    state.placesRestDisabled = true;
    return null;
  }

  if (response.status === 401 || response.status === 403) {
    state.placesRestDisabled = true;
    return null;
  }
  if (response.status === 429) {
    throw new Error("OVER_QUERY_LIMIT");
  }
  if (response.status >= 500) {
    throw new Error("UNKNOWN_ERROR");
  }
  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const candidate = Array.isArray(payload?.places) ? payload.places[0] : null;
  if (!candidate) {
    return null;
  }

  return {
    hours: formatGoogleWeekdayText(candidate?.regularOpeningHours?.weekdayDescriptions),
    businessStatus: normalizeText(candidate?.businessStatus).toUpperCase(),
  };
}

function requestOpeningHoursByQuery(service, query) {
  return new Promise((resolve, reject) => {
    service.findPlaceFromQuery(
      {
        query,
        fields: ["name", "opening_hours", "business_status"],
      },
      (result, status) => {
        if (status === "OVER_QUERY_LIMIT" || status === "RESOURCE_EXHAUSTED" || status === "UNKNOWN_ERROR") {
          reject(new Error(status));
          return;
        }

        if (status !== "OK") {
          resolve(null);
          return;
        }

        const candidates = Array.isArray(result?.candidates) ? result.candidates : [];
        if (!candidates.length) {
          resolve(null);
          return;
        }

        const candidate =
          candidates.find((item) => Array.isArray(item?.opening_hours?.weekday_text) && item.opening_hours.weekday_text.length) ||
          candidates[0];
        if (!candidate) {
          resolve(null);
          return;
        }

        resolve({
          hours: formatGoogleWeekdayText(candidate?.opening_hours?.weekday_text),
          businessStatus: normalizeText(candidate?.business_status).toUpperCase(),
        });
      }
    );
  });
}

function formatGoogleWeekdayText(weekdayText) {
  if (!Array.isArray(weekdayText) || !weekdayText.length) return "";
  return weekdayText
    .map((line) => normalizeText(String(line).replace(/\u200e/g, "")))
    .filter(Boolean)
    .join("；");
}

function buildPlaceLookupQueries(place) {
  const names = uniqueValues([
    getPlaceName(place, "name_zh"),
    normalizeText(place.map_label_name),
    getPlaceName(place, "name_en"),
  ]);
  const cleanedAddress = stripPlusCodeForDisplay(normalizeText(place.address_zh));
  const fromUrl = extractQueryFromGoogleMapsUrl(place.google_maps_url);
  const areaHint = HOTEL_AREA_HINT || "台北市信義區";
  const candidates = [];

  names.forEach((name) => {
    candidates.push(`${name} ${areaHint}`);
    if (cleanedAddress) candidates.push(`${name} ${cleanedAddress}`);
    if (place.near_mrt) candidates.push(`${name} ${place.near_mrt}`);
  });

  if (fromUrl) candidates.push(fromUrl);
  candidates.push(buildMapQuery(place));

  return uniqueValues(candidates.map((item) => normalizeText(item)).filter(Boolean));
}

function render() {
  const text = TEXT[state.lang] || TEXT.zh;
  try {
    renderConciergePicks();
  } catch (error) {
    console.error("renderConciergePicks failed:", error);
    if (dom.picksList) {
      dom.picksList.innerHTML = `<div class="empty-state">${escapeHtml(text.empty)}</div>`;
    }
  }
  try {
    renderConciergeSections();
  } catch (error) {
    console.error("renderConciergeSections failed:", error);
    if (dom.conciergeFirstList) {
      dom.conciergeFirstList.innerHTML = `<div class="empty-state">${escapeHtml(text.empty)}</div>`;
    }
  }
  if (!state.hasSearched) {
    dom.resultCount.textContent = "0";
    dom.focusLabel.textContent = getDisplayName(HOTEL);
    dom.statusText.textContent = text.statusBeforeSearch;
    try {
      renderSpotlight(null);
    } catch (error) {
      console.error("renderSpotlight(before-search) failed:", error);
    }
    try {
      renderListBeforeSearch();
    } catch (error) {
      console.error("renderListBeforeSearch failed:", error);
    }
    renderFavorites();
    updateFavoriteCount();
    syncFloatingControls();
    return;
  }

  const filtered = places.filter(applyFilters);
  syncSelection(filtered);
  const selected = getSelectedPlace(filtered);
  dom.resultCount.textContent = String(filtered.length);
  dom.focusLabel.textContent = selected ? getDisplayName(selected) : getDisplayName(HOTEL);
  dom.statusText.textContent = buildStatusText(filtered, selected);
  try {
    renderSpotlight(selected);
  } catch (error) {
    console.error("renderSpotlight failed:", error);
  }
  try {
    renderList(filtered);
  } catch (error) {
    console.error("renderList failed:", error);
    dom.results.innerHTML = `<div class="empty-state">${escapeHtml(text.empty)}</div>`;
  }
  renderFavorites();
  updateFavoriteCount();
  syncFloatingControls();
}

function applyFilters(place) {
  if (isSuppressedPlace(place)) return false;
  if (isClosedByGoogle(place)) return false;
  if (state.applied.activeOnly && !place.is_active) return false;
  if (state.applied.primary.size && !state.applied.primary.has(place.primary_category)) return false;
  if (state.applied.subcategory.size) {
    const requiresWalk10 = state.applied.subcategory.has(WALK_10MIN_SUBCATEGORY);
    const normalSubcategories = [...state.applied.subcategory].filter((value) => value !== WALK_10MIN_SUBCATEGORY);
    const placeSubcategories = listSubcategoryValues(place.subcategory);
    if (requiresWalk10 && !isWithin10MinWalk(place)) return false;
    if (normalSubcategories.length && !normalSubcategories.some((value) => placeSubcategories.includes(value))) return false;
  }
  const useMealFilter = state.applied.primary.has("餐飲");
  if (useMealFilter && state.applied.meal.size && !getMealTags(place).some((tag) => state.applied.meal.has(tag))) return false;
  if (!state.applied.search) return true;

  const haystack = [
    place.id,
    place.map_label_name,
    place.name_zh,
    place.name_en,
    place.name_ja,
    place.primary_category,
    place.subcategory,
    place.business_type,
    place.address_zh,
    place.phone,
    isWithin10MinWalk(place) ? WALK_10MIN_SUBCATEGORY : "",
    getBasicIntro(place),
    place.near_mrt,
    getMealTags(place).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(state.applied.search);
}

function syncSelection(filtered) {
  if (!state.selectedPlaceId) return;
  if (!filtered.some((place) => place.id === state.selectedPlaceId)) {
    state.selectedPlaceId = null;
  }
}

function getSelectedPlace(filtered) {
  if (!state.selectedPlaceId) return null;
  return filtered.find((place) => place.id === state.selectedPlaceId) || null;
}
function buildStatusText(filtered, selected) {
  const text = TEXT[state.lang] || TEXT.zh;
  if (!filtered.length) return text.statusNoResult;
  if (!selected) return text.statusNoSelect(filtered.length);
  return text.statusSelected(filtered.length, getDisplayName(selected));
}

function renderSpotlight(selected) {
  const focus = selected || HOTEL;
  const isHotel = focus.id === HOTEL.id;
  const text = TEXT[state.lang] || TEXT.zh;
  const openingHours = getResolvedOpeningHours(focus);
  const displayAddress = localizeAddressText(focus.address_zh);
  const displayPhone = getDisplayPhone(focus);
  const displayIntro = getBasicIntro(focus);

  dom.selectedKicker.textContent = isHotel ? "Hotel Anchor" : "Selected Place";
  dom.selectedName.textContent = getDisplayName(focus);
  dom.selectedSecondary.textContent = getSecondaryName(focus);
  dom.selectedStatus.textContent = isHotel ? text.center : text.recommended;
  dom.selectedPrimary.textContent = trCategory(focus.primary_category, "primary");
  dom.selectedSubcategory.textContent = isWithin10MinWalk(focus)
    ? `${trCategory(normalizeSubcategory(focus.subcategory), "subcategory")}・${trCategory(WALK_10MIN_SUBCATEGORY, "subcategory")}`
    : trCategory(normalizeSubcategory(focus.subcategory), "subcategory");
  dom.selectedMrt.textContent = trMrt(focus.near_mrt || text.mrtPending);
  dom.selectedAddress.textContent = displayAddress || text.addrPending;
  if (dom.selectedPhone) {
    dom.selectedPhone.textContent = `${text.phone}${displayPhone || text.phonePending}`;
  }

  const openingHoursDisplay = openingHours || text.closedNow;
  dom.selectedHours.hidden = false;
  dom.selectedHours.textContent = `${text.hours}${openingHoursDisplay}`;

  dom.selectedNotes.textContent = displayIntro || text.noNotes;

  dom.selectedOpen.href = buildSearchUrl(focus);
  dom.selectedOpen.textContent = isHotel ? text.openHotel : text.openCurrent;

  if (isHotel) {
    dom.selectedRoute.hidden = true;
  } else {
    dom.selectedRoute.hidden = false;
    dom.selectedRoute.href = buildRouteUrl(focus);
    dom.selectedRoute.textContent = text.routeFromHotel;
  }
  if (dom.selectedFavorite) {
    dom.selectedFavorite.hidden = isHotel;
    if (!isHotel) {
      dom.selectedFavorite.textContent = isFavorite(focus.id) ? text.removeFavorite : text.addFavorite;
    }
  }

  dom.mapFrame.src = buildEmbedUrl(focus);
}

function renderListBeforeSearch() {
  dom.results.innerHTML = `<div class="empty-state">${escapeHtml(tt("listBeforeSearch"))}</div>`;
}

function renderList(filtered) {
  const text = TEXT[state.lang] || TEXT.zh;
  const showMealBadges = state.applied.primary.has("餐飲");

  if (!filtered.length) {
    dom.results.innerHTML = `<div class="empty-state">${escapeHtml(text.empty)}</div>`;
    return;
  }

  dom.results.innerHTML = filtered
    .map((place) => {
      const openingHours = getResolvedOpeningHours(place);
      const openingHoursDisplay = openingHours || text.closedNow;
      const intro = getBasicIntro(place);
      const address = localizeAddressText(place.address_zh);
      const phone = getDisplayPhone(place);
      const secondary = getSecondaryName(place);
      const subcategoryDisplay = trCategory(normalizeSubcategory(place.subcategory), "subcategory");
      const mealBadges = showMealBadges
        ? uniqueValues(getMealTags(place).map(normalizeMealTag))
          .filter((tag) => trCategory(tag, "meal") !== subcategoryDisplay)
          .map((tag) => `<span class="badge">${escapeHtml(trCategory(tag, "meal"))}</span>`)
          .join("")
        : "";
      const walk10Badge = isWithin10MinWalk(place) ? `<span class="badge">${escapeHtml(trCategory(WALK_10MIN_SUBCATEGORY, "subcategory"))}</span>` : "";
      const hoursLine = `<div>${escapeHtml(text.hours)}${escapeHtml(openingHoursDisplay)}</div>`;
      const notesLine = intro ? `<div>${escapeHtml(text.notes)}${escapeHtml(intro)}</div>` : "";
      const favoriteLabel = isFavorite(place.id) ? text.removeFavorite : text.addFavorite;

      return `
        <article class="place-card${state.selectedPlaceId === place.id ? " is-selected" : ""}" data-place-id="${escapeAttribute(place.id)}">
          <div class="place-card__top">
            <div>
              <h3 class="place-card__title">${escapeHtml(getDisplayName(place))}</h3>
              ${secondary ? `<p class="place-card__secondary">${escapeHtml(secondary)}</p>` : ""}
            </div>
            <span class="badge">${escapeHtml(trCategory(place.primary_category, "primary"))}</span>
          </div>

          <div class="badge-row">
            <span class="badge">${escapeHtml(subcategoryDisplay)}</span>
            ${walk10Badge}
            ${mealBadges}
          </div>

          <div class="place-card__meta">
            <div>${escapeHtml(text.addr)}${escapeHtml(address || text.addrPending)}</div>
            <div>${escapeHtml(text.phone)}${escapeHtml(phone || text.phonePending)}</div>
            <div>${escapeHtml(text.mrt)}${escapeHtml(trMrt(place.near_mrt || text.mrtPending))}</div>
            ${hoursLine}
            ${notesLine}
          </div>

          <div class="place-card__actions">
            <a class="button button--slim" data-stop-card-select="1" href="${escapeAttribute(buildSearchUrl(place))}" target="_blank" rel="noreferrer">Google Maps</a>
            <a class="button button--secondary button--slim" data-stop-card-select="1" href="${escapeAttribute(buildRouteUrl(place))}" target="_blank" rel="noreferrer">${escapeHtml(text.routeFromHotelCard)}</a>
            <button class="button button--ghost button--slim" type="button" data-stop-card-select="1" data-favorite-id="${escapeAttribute(place.id)}">${escapeHtml(favoriteLabel)}</button>
          </div>
        </article>
      `;
    })
    .join("");

  dom.results.querySelectorAll(".place-card[data-place-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const nextId = normalizeText(card.getAttribute("data-place-id"));
      if (!nextId || state.selectedPlaceId === nextId) return;
      state.selectedPlaceId = nextId;
      render();
    });
  });

  dom.results.querySelectorAll('[data-stop-card-select="1"]').forEach((element) => {
    element.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  });

  dom.results.querySelectorAll("[data-favorite-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(button.dataset.favoriteId);
      render();
    });
  });
}

function renderFavorites() {
  const text = TEXT[state.lang] || TEXT.zh;
  const favoritePlaces = [...state.favorites]
    .map((id) => places.find((place) => place.id === id))
    .filter(Boolean);

  if (!favoritePlaces.length) {
    dom.favoritesList.innerHTML = `<div class="favorites-empty">${escapeHtml(text.favoritesEmpty)}</div>`;
    return;
  }

  dom.favoritesList.innerHTML = favoritePlaces
    .map((place) => {
      const address = localizeAddressText(place.address_zh);
      const phone = getDisplayPhone(place);
      return `
        <article class="favorite-item">
          <div class="favorite-item__body">
            <h3>${escapeHtml(getDisplayName(place))}</h3>
            <p>${escapeHtml(trCategory(place.primary_category, "primary"))} / ${escapeHtml(trCategory(place.subcategory, "subcategory"))}</p>
            <p>${escapeHtml(text.addr)}${escapeHtml(address || text.addrPending)}</p>
            <p>${escapeHtml(text.phone)}${escapeHtml(phone || text.phonePending)}</p>
          </div>
          <div class="favorite-item__actions">
            <a class="button button--slim" href="${escapeAttribute(buildSearchUrl(place))}" target="_blank" rel="noreferrer">${escapeHtml(text.favoriteOpen)}</a>
            <a class="button button--secondary button--slim" href="${escapeAttribute(buildRouteUrl(place))}" target="_blank" rel="noreferrer">${escapeHtml(text.routeFromHotelCard)}</a>
            <button class="button button--ghost button--slim" type="button" data-favorite-remove-id="${escapeAttribute(place.id)}">${escapeHtml(text.removeFavorite)}</button>
          </div>
        </article>
      `;
    })
    .join("");

  dom.favoritesList.querySelectorAll("[data-favorite-remove-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      toggleFavorite(button.dataset.favoriteRemoveId);
      render();
    });
  });
}

async function refreshWeather() {
  const text = TEXT[state.lang] || TEXT.zh;
  dom.weatherSummary.textContent = text.weatherLoading;
  dom.weatherRain.textContent = text.weatherRain("--");

  try {
    const response = await fetch(WEATHER_ENDPOINT, { cache: "no-store" });
    if (!response.ok) throw new Error(`Weather API ${response.status}`);
    const payload = await response.json();
    const daily = payload && payload.daily ? payload.daily : null;
    const max = Number(daily?.temperature_2m_max?.[0]);
    const min = Number(daily?.temperature_2m_min?.[0]);
    const rain = Number(daily?.precipitation_probability_max?.[0]);
    const code = Number(daily?.weather_code?.[0]);

    const summary = weatherCodeToText(code);
    const temp = Number.isFinite(min) && Number.isFinite(max) ? ` · ${text.weatherTemp(Math.round(min), Math.round(max))}` : "";
    dom.weatherSummary.textContent = `${summary}${temp}`;
    dom.weatherRain.textContent = text.weatherRain(Number.isFinite(rain) ? Math.round(rain) : "--");
  } catch (_error) {
    dom.weatherSummary.textContent = text.weatherUnavailable;
    dom.weatherRain.textContent = text.weatherRain("--");
  }
}

function weatherCodeToText(code) {
  const lang = state.lang;
  const dict = {
    clear: { zh: "晴朗", en: "Clear", ja: "晴れ" },
    partly: { zh: "局部多雲", en: "Partly cloudy", ja: "一部くもり" },
    cloudy: { zh: "多雲", en: "Cloudy", ja: "くもり" },
    fog: { zh: "有霧", en: "Foggy", ja: "霧" },
    drizzle: { zh: "毛毛雨", en: "Drizzle", ja: "霧雨" },
    rain: { zh: "下雨", en: "Rain", ja: "雨" },
    heavyRain: { zh: "大雨", en: "Heavy rain", ja: "強い雨" },
    snow: { zh: "降雪", en: "Snow", ja: "雪" },
    thunder: { zh: "雷雨", en: "Thunderstorm", ja: "雷雨" },
  };

  let key = "cloudy";
  if (code === 0) key = "clear";
  else if (code === 1 || code === 2) key = "partly";
  else if (code === 3) key = "cloudy";
  else if (code === 45 || code === 48) key = "fog";
  else if (code >= 51 && code <= 57) key = "drizzle";
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) key = code >= 65 || code >= 82 ? "heavyRain" : "rain";
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) key = "snow";
  else if (code >= 95) key = "thunder";

  return dict[key][lang] || dict[key].zh;
}

function getPlaceName(place, field) {
  const override = PLACE_NAME_OVERRIDES[place.id];
  if (override && normalizeText(override[field])) {
    return normalizeText(override[field]);
  }
  return normalizeText(place[field]);
}

function getDisplayName(place) {
  if (state.lang === "en") return getPlaceName(place, "name_en") || getPlaceName(place, "name_zh") || normalizeText(place.map_label_name) || place.id;
  if (state.lang === "ja") return getPlaceName(place, "name_ja") || getPlaceName(place, "name_en") || getPlaceName(place, "name_zh") || normalizeText(place.map_label_name) || place.id;
  return getPlaceName(place, "name_zh") || normalizeText(place.map_label_name) || getPlaceName(place, "name_en") || place.id;
}

function getSecondaryName(place) {
  const display = getDisplayName(place);
  const zh = getPlaceName(place, "name_zh");
  const en = getPlaceName(place, "name_en");
  const names = [];

  if (state.lang === "zh") {
    if (en && en !== display) names.push(en);
    return names.join(" / ");
  }

  if (state.lang === "en") {
    if (zh && zh !== display) names.push(zh);
    return names.join(" / ");
  }

  if (en && en !== display) names.push(en);
  if (zh && zh !== display) names.push(zh);
  return names.join(" / ");
}
function humanizeSourceStatus(status) {
  const row = SOURCE_STATUS[status];
  if (!row) return tt("sourceUnknown");
  return row[state.lang] || row.zh;
}

function trCategory(value, type) {
  if (!value) return state.lang === "en" ? "Other" : state.lang === "ja" ? "その他" : "其他";
  if (state.lang === "zh") return value;
  const row = CAT[type] && CAT[type][value];
  return row ? row[state.lang] || value : value;
}

function trMrt(value) {
  if (!value) return tt("mrtPending");
  if (state.lang === "zh") return value;
  if (value === "國父紀念館站")
    return state.lang === "en" ? "Sun Yat-sen Memorial Hall Station" : "國父紀念館駅";
  if (value === "市政府站") return state.lang === "en" ? "Taipei City Hall Station" : "市政府駅";
  return value;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMealTag(value) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (normalized === LEGACY_NIGHT_TAG) return NIGHT_TAG;
  return normalized;
}

function getMealTags(place) {
  return Array.isArray(place?.meal_tags) ? place.meal_tags : [];
}

function normalizeSubcategory(value) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (normalized === LEGACY_NIGHT_TAG) return NIGHT_TAG;
  return normalized;
}

function cleanupTourHighlight(raw) {
  const note = stripPlusCodeForDisplay(normalizeText(raw));
  if (!note) return "";

  const cleaned = note
    .replace(/印刷地圖寫|紙本地圖|地圖點位|行程點位|地址與電話已核對|營業時間待補官方來源|常見正式店名為|非正式店名|地標用途|飯店本體/gi, "")
    .replace(/[；;]+/g, "、")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  if (/^(已核實|部分核實|待複核|map point)$/i.test(cleaned)) return "";
  if (cleaned.length > 34) return `${cleaned.slice(0, 34)}…`;
  return cleaned;
}

function buildTourLeadZh(place, mrt) {
  const primary = normalizeText(place.primary_category);
  const sub = normalizeSubcategory(place.subcategory);
  const type = normalizeText(place.business_type);

  if (primary === "景點" && sub === "寺廟") return `台北大巨蛋周邊最具代表性的信仰地標，古蹟氣氛濃厚，第一次來台北很值得安排。`;
  if (primary === "景點" && sub === "古蹟") return `保留老街風貌與歷史建築，很適合散步拍照、感受舊城魅力。`;
  if (primary === "景點" && sub === "公園") return `綠意休憩點，逛街之間可短暫放鬆，步行節奏很舒服。`;
  if (primary === "景點" && sub === "商圈") return `在地街區感最強的一帶，邊走邊逛就能找到許多特色小店。`;
  if (primary === "交通" && sub === "捷運站") return `大巨蛋商圈移動核心站點，前往市政府、忠孝敦化都很順路。`;
  if (primary === "交通" && sub === "火車站") return `台鐵樞紐之一，安排跨區移動或接續其他行程都很方便。`;
  if (primary === "餐飲" && type === "drink_shop") return `在地人氣飲料店，口味穩定，逛街途中最適合順手帶一杯。`;
  if (primary === "餐飲" && type === "cafe") return `氛圍輕鬆的咖啡停靠點，適合小歇片刻再繼續行程。`;
  if (primary === "餐飲" && (type === "dessert" || type === "snack")) return `大巨蛋周邊經典小吃甜點路線的一站，適合安排成散步美食行程。`;
  if (primary === "餐飲") return `在地人常去的餐飲選擇，口味有特色，推薦納入你的大巨蛋美食清單。`;
  if (primary === "商店") return `旅途中補給很便利的採買點，日用品、零食與小物都能快速補齊。`;
  if (primary === "其他設施" && sub === "銀行") return `旅途中換匯或金融需求的實用據點，地點好找、動線順。`;
  if (primary === "其他設施" && sub === "郵局") return `寄件與郵務服務方便，安排購物後寄送也很實用。`;
  if (primary === "其他設施" && sub === "停車場") return `自駕旅客友善的停車點，銜接周邊景點與美食更輕鬆。`;
  if (primary === "其他設施" && sub === "飯店") return `InterContinental 台北洲際酒店是大巨蛋步行探索的最佳起點，從這裡出發最順路。`;
  return `位於 ${mrt} 周邊，步行可達、動線直覺，適合安排在你的大巨蛋散策路線。`;
}

function buildTourLeadEn(place, mrt) {
  const primary = normalizeText(place.primary_category);
  const sub = normalizeSubcategory(place.subcategory);
  const type = normalizeText(place.business_type);

  if (primary === "景點" && sub === "寺廟") return `One of Taipei Dome's iconic cultural landmarks and a must-see for first-time visitors.`;
  if (primary === "景點" && sub === "古蹟") return `A photogenic historic block where old Taipei atmosphere is still alive.`;
  if (primary === "景點" && sub === "公園") return `A relaxed green stop to recharge between market walks and food stops.`;
  if (primary === "交通" && sub === "捷運站") return `A key MRT hub for easy rides to Ximen and Taipei Main Station.`;
  if (primary === "餐飲" && type === "drink_shop") return `A popular local drink stop, perfect for a quick takeaway on your walk.`;
  if (primary === "餐飲") return `A local favorite worth adding to your Taipei Dome food route.`;
  if (primary === "商店") return `A convenient supply stop for snacks and daily essentials during your trip.`;
  return `Close to ${mrt}, easy to reach on foot and suitable for a smooth walking itinerary.`;
}

function buildTourLeadJa(place, mrt) {
  const primary = normalizeText(place.primary_category);
  const sub = normalizeSubcategory(place.subcategory);
  const type = normalizeText(place.business_type);

  if (primary === "景點" && sub === "寺廟") return `台北ドーム周辺を代表する名所で、初めての台北旅行ならぜひ立ち寄りたいスポットです。`;
  if (primary === "景點" && sub === "古蹟") return `歴史的な街並みが殘り、散策や寫真撮影にぴったりのエリアです。`;
  if (primary === "景點" && sub === "公園") return `街歩きの合間にひと息つける、気持ちのよい休憩スポットです。`;
  if (primary === "交通" && sub === "捷運站") return `西門・台北駅方面へ移動しやすい便利なMRT拠點です。`;
  if (primary === "餐飲" && type === "drink_shop") return `地元で人気のドリンク店で、散策途中のテイクアウトにおすすめです。`;
  if (primary === "餐飲") return `台北ドーム周辺のローカルグルメを體験できる、旅の満足度が高い一軒です。`;
  if (primary === "商店") return `旅行中の買い足しに便利で、日用品や軽食をまとめて揃えられます。`;
  return `${mrt} 周辺にあり、徒歩で回りやすい行程に組み込みやすいスポットです。`;
}

function getBasicIntro(place) {
  const mrt = trMrt(place.near_mrt || tt("mrtPending"));
  const hours = getResolvedOpeningHours(place);

  if (state.lang === "en") {
    const lead = buildTourLeadEn(place, mrt);
    const t = hours ? ` Best time: ${hours}.` : "";
    return `${lead}${t}`.trim();
  }

  if (state.lang === "ja") {
    const lead = buildTourLeadJa(place, mrt);
    const t = hours ? ` おすすめ時間：${hours}。` : "";
    return `${lead}${t}`.trim();
  }

  const lead = buildTourLeadZh(place, mrt);
  const t = hours ? ` 建議時段：${hours}。` : "";
  return `${lead}${t}`.trim();
}

function stripPlusCodeForDisplay(input) {
  const normalized = normalizeText(input);
  if (!normalized) return "";
  if (PLUS_CODE_REGEX.test(normalized)) return "";
  return normalized.replace(/^Plus\s*Code[:：]\s*/i, "").trim();
}

function isSuppressedPlace(place) {
  if (MANUAL_SUPPRESSED_PLACE_IDS.has(place.id)) return true;
  const notes = normalizeText(place.notes);
  const openingHours = normalizeText(place.opening_hours);
  return (
    place.source_status === "closed" ||
    place.is_active === false ||
    hasClosedMarker(notes) ||
    hasClosedMarker(openingHours)
  );
}

function hasClosedMarker(value) {
  return /暫停營業|暫時關閉|永久停業|停業|歇業|已歇業|停止營業|休業中?|臨時休業|一時休業|営業休止|閉業|temporarily\s*closed|permanently\s*closed|closed\s*permanently/i.test(normalizeText(value));
}

function buildSearchUrl(place) {
  const query = buildMapQuery(place);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildRouteUrl(place) {
  const destination = buildMapQuery(place);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(HOTEL.address_zh)}&destination=${encodeURIComponent(destination)}`;
}

function buildEmbedUrl(place) {
  const query = buildMapQuery(place);
  if (GOOGLE_MAPS_USE_EMBED_API && GOOGLE_MAPS_API_KEY) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&q=${encodeURIComponent(query)}&zoom=16`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

function buildMapQuery(place) {
  const plusCodeQuery = resolvePlusCodeQuery(place);
  const placeName = getPlaceName(place, "name_zh") || normalizeText(place.map_label_name) || getPlaceName(place, "name_en");
  if (plusCodeQuery) {
    return [placeName, plusCodeQuery].filter(Boolean).join(" ");
  }

  return [placeName, place.address_zh || HOTEL_AREA_HINT || "台北市信義區", "Taipei"]
    .filter(Boolean)
    .join(" ");
}

function inferHotelAreaHint(address) {
  const normalized = normalizeText(address);
  if (!normalized) return "台北市信義區";
  const districtMatch = normalized.match(/台北市[^區]{1,8}區/);
  if (districtMatch) return districtMatch[0];
  if (normalized.includes("台北市")) return "台北市";
  return normalized;
}

function resolvePlusCodeQuery(place) {
  const candidates = [
    normalizeText(place.plus_code),
    normalizeText(place.address_zh),
    normalizeText(place.notes),
    extractQueryFromGoogleMapsUrl(place.google_maps_url),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const cleaned = cleanupPlusCodeCandidate(candidate);
    const match = cleaned.match(PLUS_CODE_REGEX);
    if (!match) {
      continue;
    }

    // Keep full candidate (with locality) whenever possible for better precision.
    if (cleaned.includes(match[1])) {
      return cleaned;
    }

    return match[1];
  }

  return "";
}

function cleanupPlusCodeCandidate(input) {
  const normalized = normalizeText(input);
  if (!normalized) {
    return "";
  }

  return normalized
    .replace(/^.*?(?:Plus\s*Code[:：])\s*/i, "")
    .replace(/\s*[；;。]\s*$/, "")
    .trim();
}

function extractQueryFromGoogleMapsUrl(url) {
  const normalized = normalizeText(url);
  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized);
    const query = parsed.searchParams.get("query") || parsed.searchParams.get("q");
    return query ? decodeURIComponent(query).replaceAll("+", " ") : "";
  } catch (_error) {
    return "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
