import config from "../config.js";
import { isMongoConnected } from "../db.js";
import Alert from "../models/Alert.js";
import { memoryStore } from "../store.js";
import { locationLabel } from "./weatherService.js";
import { getCurrentWeather, getForecast } from "./weatherService.js";

let officialCache = { fetchedAt: 0, language: "en", alerts: [] };

const alertCopy = {
  en: {
    official: "Official India weather alert", officialPrefix: "Official warning:",
    thunderstorm: ["Thunderstorm danger", "Avoid open areas and unnecessary travel while thunderstorms are active."],
    wind: ["High wind advisory", "Strong winds may make outdoor travel unsafe. Secure loose objects and avoid exposed routes."],
    rain: ["Heavy rain risk", "Heavy rain is likely. Avoid flooded roads and allow extra travel time."],
    heat: ["Extreme heat danger", "Outdoor activity can be dangerous. Hydrate, avoid midday exposure, and check local advisories."],
    cold: ["Cold weather advisory", "Cold exposure is possible. Dress warmly and take extra care outdoors."],
    severeRain: ["Severe rain forecast", "The forecast shows a very high chance of rain. Avoid low-lying and flood-prone areas."],
    severeHeat: ["Extreme heat forecast", "Very high temperatures are forecast. Plan outdoor travel outside peak heat."],
  },
  hi: {
    official: "भारत की आधिकारिक मौसम चेतावनी", officialPrefix: "आधिकारिक चेतावनी:",
    thunderstorm: ["आंधी-तूफान का खतरा", "आंधी के दौरान खुले स्थानों और अनावश्यक यात्रा से बचें।"],
    wind: ["तेज़ हवा की चेतावनी", "तेज़ हवाओं में बाहर यात्रा असुरक्षित हो सकती है। ढीली वस्तुओं को सुरक्षित करें।"],
    rain: ["भारी बारिश का खतरा", "भारी बारिश की संभावना है। जलभराव वाली सड़कों से बचें और यात्रा में अतिरिक्त समय रखें।"],
    heat: ["अत्यधिक गर्मी का खतरा", "बाहर की गतिविधियां खतरनाक हो सकती हैं। पानी पिएं और दोपहर की धूप से बचें।"],
    cold: ["ठंड की चेतावनी", "ठंड का असर हो सकता है। गर्म कपड़े पहनें और बाहर सावधानी बरतें।"],
    severeRain: ["भारी बारिश का पूर्वानुमान", "बारिश की बहुत अधिक संभावना है। निचले और बाढ़-प्रवण क्षेत्रों से बचें।"],
    severeHeat: ["अत्यधिक गर्मी का पूर्वानुमान", "बहुत अधिक तापमान की संभावना है। तेज़ गर्मी के समय बाहर जाने से बचें।"],
  },
  or: {
    official: "ଭାରତର ସରକାରୀ ପାଣିପାଗ ସତର୍କତା", officialPrefix: "ସରକାରୀ ସତର୍କତା:",
    thunderstorm: ["ଘଡ଼ଘଡ଼ି ଓ ବଜ୍ରପାତ ବିପଦ", "ଘଡ଼ଘଡ଼ି ସମୟରେ ଖୋଲା ସ୍ଥାନ ଓ ଅନାବଶ୍ୟକ ଯାତ୍ରାରୁ ଦୂରେଇ ରୁହନ୍ତୁ।"],
    wind: ["ପ୍ରବଳ ପବନ ସତର୍କତା", "ପ୍ରବଳ ପବନରେ ବାହାର ଯାତ୍ରା ଅସୁରକ୍ଷିତ ହୋଇପାରେ। ଢିଲା ଜିନିଷ ସୁରକ୍ଷିତ କରନ୍ତୁ।"],
    rain: ["ଭାରି ବର୍ଷା ବିପଦ", "ଭାରି ବର୍ଷାର ସମ୍ଭାବନା ଅଛି। ଜଳମଗ୍ନ ରାସ୍ତାରୁ ଦୂରେଇ ରୁହନ୍ତୁ।"],
    heat: ["ଅତ୍ୟଧିକ ଗରମ ବିପଦ", "ବାହାର କାର୍ଯ୍ୟକଳାପ ବିପଦଜନକ ହୋଇପାରେ। ପାଣି ପିଅନ୍ତୁ ଓ ମଧ୍ୟାହ୍ନ ଖରାରୁ ବଞ୍ଚନ୍ତୁ।"],
    cold: ["ଥଣ୍ଡା ପାଗ ସତର୍କତା", "ଥଣ୍ଡାର ପ୍ରଭାବ ପଡ଼ିପାରେ। ଗରମ ପୋଷାକ ପିନ୍ଧନ୍ତୁ ଓ ବାହାରେ ସାବଧାନ ରୁହନ୍ତୁ।"],
    severeRain: ["ଭାରି ବର୍ଷା ପୂର୍ବାନୁମାନ", "ବର୍ଷାର ବହୁତ ଅଧିକ ସମ୍ଭାବନା ଅଛି। ତଳିଆ ଓ ବନ୍ୟାପ୍ରବଣ ସ୍ଥାନରୁ ଦୂରେଇ ରୁହନ୍ତୁ।"],
    severeHeat: ["ଅତ୍ୟଧିକ ଗରମ ପୂର୍ବାନୁମାନ", "ବହୁତ ଅଧିକ ତାପମାତ୍ରାର ସମ୍ଭାବନା ଅଛି। ଅତ୍ୟଧିକ ଗରମ ସମୟରେ ବାହାର ଯାତ୍ରା ଏଡ଼ାନ୍ତୁ।"],
  },
  bn: {
    official: "ভারতের সরকারি আবহাওয়া সতর্কতা", officialPrefix: "সরকারি সতর্কতা:",
    thunderstorm: ["বজ্রঝড়ের বিপদ", "বজ্রঝড় চলাকালীন খোলা জায়গা ও অপ্রয়োজনীয় ভ্রমণ এড়িয়ে চলুন।"],
    wind: ["প্রবল বাতাসের সতর্কতা", "প্রবল বাতাসে বাইরে ভ্রমণ বিপজ্জনক হতে পারে। আলগা জিনিস নিরাপদ করুন।"],
    rain: ["ভারী বৃষ্টির ঝুঁকি", "ভারী বৃষ্টির সম্ভাবনা আছে। জলমগ্ন রাস্তা এড়িয়ে চলুন।"],
    heat: ["চরম গরমের বিপদ", "বাইরের কাজ বিপজ্জনক হতে পারে। পানি পান করুন এবং দুপুরের রোদ এড়িয়ে চলুন।"],
    cold: ["ঠান্ডার সতর্কতা", "ঠান্ডার প্রভাব পড়তে পারে। গরম পোশাক পরুন এবং বাইরে সাবধান থাকুন।"],
    severeRain: ["ভারী বৃষ্টির পূর্বাভাস", "বৃষ্টির সম্ভাবনা খুব বেশি। নিচু ও বন্যাপ্রবণ এলাকা এড়িয়ে চলুন।"],
    severeHeat: ["চরম গরমের পূর্বাভাস", "খুব বেশি তাপমাত্রার সম্ভাবনা আছে। গরমের সময় বাইরে যাওয়া এড়িয়ে চলুন।"],
  },
  mr: {
    official: "भारताची अधिकृत हवामान सूचना", officialPrefix: "अधिकृत इशारा:",
    thunderstorm: ["वादळाचा धोका", "वादळ सुरू असताना मोकळी ठिकाणे आणि अनावश्यक प्रवास टाळा."],
    wind: ["वेगवान वाऱ्याची सूचना", "वेगवान वाऱ्यात बाहेरचा प्रवास धोकादायक ठरू शकतो. सैल वस्तू सुरक्षित करा."],
    rain: ["मुसळधार पावसाचा धोका", "मुसळधार पावसाची शक्यता आहे. पाणी साचलेल्या रस्त्यांपासून दूर राहा."],
    heat: ["अति उष्णतेचा धोका", "बाहेरील काम धोकादायक ठरू शकते. पाणी प्या आणि दुपारचे ऊन टाळा."],
    cold: ["थंडीची सूचना", "थंडीचा परिणाम होऊ शकतो. उबदार कपडे घाला आणि बाहेर काळजी घ्या."],
    severeRain: ["मुसळधार पावसाचा अंदाज", "पावसाची शक्यता खूप जास्त आहे. सखल व पूरप्रवण भाग टाळा."],
    severeHeat: ["अति उष्णतेचा अंदाज", "खूप जास्त तापमानाची शक्यता आहे. उष्णतेच्या वेळी बाहेर जाणे टाळा."],
  },
  te: {
    official: "భారత అధికారిక వాతావరణ హెచ్చరిక", officialPrefix: "అధికారిక హెచ్చరిక:",
    thunderstorm: ["ఉరుములు, మెరుపుల ప్రమాదం", "ఉరుములు ఉన్నప్పుడు బహిరంగ ప్రదేశాలు మరియు అనవసర ప్రయాణాన్ని నివారించండి."],
    wind: ["బలమైన గాలుల హెచ్చరిక", "బలమైన గాలుల్లో బయట ప్రయాణం ప్రమాదకరం కావచ్చు. వదులుగా ఉన్న వస్తువులను భద్రపరచండి."],
    rain: ["భారీ వర్షం ప్రమాదం", "భారీ వర్షం వచ్చే అవకాశం ఉంది. నీరు నిలిచిన రహదారులను నివారించండి."],
    heat: ["తీవ్ర వేడి ప్రమాదం", "బయటి కార్యకలాపాలు ప్రమాదకరం కావచ్చు. నీరు తాగండి, మధ్యాహ్నపు ఎండను నివారించండి."],
    cold: ["చలి వాతావరణ హెచ్చరిక", "చలి ప్రభావం ఉండవచ్చు. వెచ్చని దుస్తులు ధరించి బయట జాగ్రత్తగా ఉండండి."],
    severeRain: ["భారీ వర్షం అంచనా", "వర్షం వచ్చే అవకాశం చాలా ఎక్కువగా ఉంది. లోతట్టు, వరదలకు గురయ్యే ప్రాంతాలను నివారించండి."],
    severeHeat: ["తీవ్ర వేడి అంచనా", "చాలా అధిక ఉష్ణోగ్రతలు ఉండవచ్చు. తీవ్రమైన వేడి సమయంలో బయట ప్రయాణాన్ని నివారించండి."],
  },
};

function stripMarkup(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function readTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return stripMarkup(match?.[1] || "");
}

function severityFor(text) {
  const value = text.toLowerCase();
  if (/red|severe|cyclone|very heavy|extreme|danger/.test(value)) return "severe";
  if (/orange|warning|heavy|thunderstorm|lightning|heat wave|flood/.test(value)) return "high";
  if (/yellow|watch|rain|wind|fog/.test(value)) return "moderate";
  return "info";
}

function mapOfficialAlert(alert, index, latitude, longitude, language) {
  const copy = alertCopy[language] || alertCopy.en;
  const title = alert.title || copy.official;
  const message = alert.message || "Check the latest official warning before travelling.";
  return {
    id: 900000 + index, location: "India", latitude: latitude ?? 22.5, longitude: longitude ?? 79,
    severity: severityFor(`${title} ${message}`), title: `${copy.official}: ${title}`, message: `${copy.officialPrefix} ${message}`, alert_type: "official", source: "IMD CAP",
    scopeText: `${title} ${message}`,
    created_at: alert.createdAt || new Date().toISOString(), expires_at: alert.expiresAt || null,
  };
}

function parseOfficialFeed(xml, latitude, longitude, language) {
  const blocks = [...String(xml).matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((match) => match[0]);
  return blocks.map((block, index) => mapOfficialAlert({
    title: readTag(block, "title"),
    message: readTag(block, "description") || readTag(block, "summary") || readTag(block, "content"),
    createdAt: readTag(block, "pubDate") || readTag(block, "updated") || new Date().toISOString(),
  }, index, latitude, longitude, language)).slice(0, 20);
}

async function fetchOfficialAlerts(latitude, longitude, language) {
  if (!config.indiaAlertsUrl) return [];
  if (officialCache.language === language && Date.now() - officialCache.fetchedAt < config.alertRefreshMs) {
    return officialCache.alerts.map((alert) => ({ ...alert, latitude: latitude ?? alert.latitude, longitude: longitude ?? alert.longitude }));
  }
  try {
    const response = await fetch(config.indiaAlertsUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`IMD feed returned ${response.status}`);
    const alerts = parseOfficialFeed(await response.text(), latitude, longitude, language);
    officialCache = { fetchedAt: Date.now(), language, alerts };
    return alerts;
  } catch {
    officialCache = { ...officialCache, fetchedAt: Date.now() };
    return officialCache.alerts;
  }
}

function derivedAlerts(weather, forecast, latitude, longitude, locationName, language) {
  const alerts = [];
  const location = locationName || weather.location || locationLabel(latitude, longitude);
  const copy = alertCopy[language] || alertCopy.en;
  const add = (severity, title, message, alertType) => alerts.push({
    id: 800000 + alerts.length, location, latitude, longitude, severity, title, message,
    alert_type: alertType, source: "WeatherGPT safety rules", created_at: new Date().toISOString(), expires_at: null,
  });
  const condition = weather.weather_condition.toLowerCase();
  if (condition.includes("thunderstorm")) add("severe", ...copy.thunderstorm, "thunderstorm");
  if (weather.wind_speed >= 50) add("high", ...copy.wind, "wind");
  if ((weather.rain_probability ?? 0) >= 80 && /rain|shower/.test(condition)) add("high", ...copy.rain, "rain");
  if (weather.temperature >= 45) add("high", ...copy.heat, "heat");
  if (weather.temperature <= 5) add("moderate", ...copy.cold, "cold");
  const forecastDays = forecast?.forecast || [];
  const maxRain = forecastDays.reduce((highest, day) => Math.max(highest, day.rain_probability || 0), 0);
  const maxTemperature = forecastDays.reduce((highest, day) => Math.max(highest, day.temperature_max || 0), -Infinity);
  if (maxRain >= 90 && !alerts.some((alert) => alert.alert_type === "rain")) add("high", ...copy.severeRain, "rain");
  if (maxTemperature >= 45 && !alerts.some((alert) => alert.alert_type === "heat")) add("high", ...copy.severeHeat, "heat");
  return alerts;
}

function locationMatches(alert, location, latitude, longitude) {
  const text = `${alert.location || ""} ${alert.scopeText || ""} ${alert.title || ""} ${alert.message || ""}`.toLowerCase();
  const requested = String(location || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ");
  const terms = requested.split(/\s+/).filter((term) => term.length >= 3 && !["india", "current", "location"].includes(term));
  if (terms.length && terms.some((term) => text.includes(term))) return true;
  if (alert.alert_type === "official") return false;
  if (Number.isFinite(latitude) && Number.isFinite(longitude) && Number.isFinite(alert.latitude) && Number.isFinite(alert.longitude)) {
    return Math.abs(latitude - alert.latitude) <= 1.5 && Math.abs(longitude - alert.longitude) <= 1.5;
  }
  return false;
}

function mapStoredAlert(alert) {
  const source = alert.toObject ? alert.toObject() : alert;
  return {
    id: source.id, location: source.location, latitude: source.latitude, longitude: source.longitude,
    severity: source.severity, title: source.title, message: source.message, alert_type: source.alertType,
    source: source.source || "derived", created_at: new Date(source.createdAt).toISOString(),
    expires_at: source.expiresAt ? new Date(source.expiresAt).toISOString() : null,
  };
}

export async function getActiveAlerts({ latitude, longitude, location = "", language = "en" } = {}) {
  const now = new Date();
  const official = (await fetchOfficialAlerts(latitude, longitude, language)).filter((alert) => locationMatches(alert, location, latitude, longitude));
  let stored = [];
  if (isMongoConnected()) {
    stored = (await Alert.find({ $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }).sort({ createdAt: -1 }).lean()).map(mapStoredAlert).filter((alert) => locationMatches(alert, location, latitude, longitude));
  } else {
    stored = memoryStore.alerts.filter((alert) => (!alert.expiresAt || alert.expiresAt > now) && locationMatches(alert, location, latitude, longitude)).map(mapStoredAlert);
  }
  let derived = [];
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    try {
      const [weather, forecast] = await Promise.all([getCurrentWeather(latitude, longitude), getForecast(latitude, longitude, 3)]);
      derived = derivedAlerts(weather, forecast, latitude, longitude, location, language);
    } catch {
      derived = [];
    }
  }
  return [...official, ...derived, ...stored];
}

export async function getAlertById(id) {
  const alerts = await getActiveAlerts();
  return alerts.find((alert) => alert.id === Number(id)) || null;
}

export async function seedAlerts() {
  if (!isMongoConnected() || await Alert.exists({}) || !memoryStore.alerts.length) return;
  await Alert.create(memoryStore.alerts);
}
