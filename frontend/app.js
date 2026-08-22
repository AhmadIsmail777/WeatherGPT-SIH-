/* WeatherGPT dashboard: a dependency-free client for the FastAPI backend. */

// Same-origin when FastAPI serves the dashboard; retain a local API fallback
// for standalone frontend development on port 5173.
const API_BASE = window.WEATHERGPT_API_URL || (
  window.location.port === "8000" ? window.location.origin : "http://127.0.0.1:8000"
);
const DEFAULT_LOCATION = { latitude: 20.2961, longitude: 85.8245 };
const LANGUAGE_STORAGE_KEY = "weathergpt-language";
const state = { ...DEFAULT_LOCATION, language: "en", locationName: "", locationQuery: "" };

const translations = {
  en: {
    heroEyebrow: "YOUR WEATHER, EXPLAINED", heroTitle: "See what the sky is <em>actually</em> saying.",
    heroSummary: "Live conditions, practical alerts, and an AI guide that only speaks from verified weather data.",
    chooseLocation: "Choose a location", update: "Update", useLocation: "Use my location",
    locationNote: "Enter a city name or latitude, longitude.", now: "NOW", outlook: "OUTLOOK",
    forecast: "Next 3 days", guide: "WEATHER GUIDE", assistant: "Ask WeatherGPT", stayAhead: "STAY AHEAD",
    alerts: "Active alerts", welcome: "What would you like to know about today’s weather?", chatPlaceholder: "Will I need an umbrella?",
    grounded: "<strong>Grounded answers</strong><br />Weather facts first, AI explanation second.",
    locationAware: "<strong>Location-aware</strong><br />Use a city or coordinates for a local view.",
    liveData: "<strong>Live meteorological data</strong><br />Real-time conditions from the weather service.",
  },
  or: {
    heroEyebrow: "ଆପଣଙ୍କ ପାଣିପାଗ, ସହଜ ଭାବରେ", heroTitle: "ଆକାଶ କ’ଣ <em>ସତରେ</em> କହୁଛି ଦେଖନ୍ତୁ।",
    heroSummary: "ସଜୀବ ପରିସ୍ଥିତି, ଉପଯୋଗୀ ସତର୍କତା ଏବଂ ସତ୍ୟାପିତ ପାଣିପାଗ ତଥ୍ୟ ଉପରେ ଆଧାରିତ AI ସହାୟକ।",
    chooseLocation: "ସ୍ଥାନ ବାଛନ୍ତୁ", update: "ଅପଡେଟ୍", useLocation: "ମୋ ସ୍ଥାନ ବ୍ୟବହାର କରନ୍ତୁ",
    locationNote: "ସହରର ନାମ କିମ୍ବା ଅକ୍ଷାଂଶ, ଦ୍ରାଘିମା ଲେଖନ୍ତୁ।", now: "ବର୍ତ୍ତମାନ", outlook: "ପୂର୍ବାନୁମାନ",
    forecast: "ପରବର୍ତ୍ତୀ ୩ ଦିନ", guide: "ପାଣିପାଗ ସହାୟକ", assistant: "WeatherGPT କୁ ପଚାରନ୍ତୁ", stayAhead: "ପ୍ରସ୍ତୁତ ରୁହନ୍ତୁ",
    alerts: "ସକ୍ରିୟ ସତର୍କତା", welcome: "ଆଜିର ପାଣିପାଗ ବିଷୟରେ କ’ଣ ଜାଣିବାକୁ ଚାହାଁନ୍ତି?", chatPlaceholder: "ଛତା ନେବାକୁ ପଡ଼ିବ କି?",
    grounded: "<strong>ସତ୍ୟାପିତ ଉତ୍ତର</strong><br />ପ୍ରଥମେ ପାଣିପାଗ ତଥ୍ୟ, ପରେ AI ବ୍ୟାଖ୍ୟା।",
    locationAware: "<strong>ସ୍ଥାନ ଅନୁଯାୟୀ</strong><br />ସହର କିମ୍ବା ସ୍ଥାନାଙ୍କ ବ୍ୟବହାର କରନ୍ତୁ।",
    liveData: "<strong>ସଜୀବ ପାଣିପାଗ ତଥ୍ୟ</strong><br />ପାଣିପାଗ ସେବାରୁ ରିଅଲ୍-ଟାଇମ୍ ତଥ୍ୟ।",
  },
  hi: {
    heroEyebrow: "आपका मौसम, सरल तरीके से", heroTitle: "देखिए आसमान <em>वास्तव में</em> क्या कह रहा है।",
    heroSummary: "लाइव स्थितियाँ, उपयोगी अलर्ट और केवल सत्यापित मौसम डेटा पर आधारित AI सहायक।",
    chooseLocation: "स्थान चुनें", update: "अपडेट", useLocation: "मेरा स्थान इस्तेमाल करें",
    locationNote: "शहर का नाम या अक्षांश, देशांतर दर्ज करें।", now: "अभी", outlook: "पूर्वानुमान",
    forecast: "अगले 3 दिन", guide: "मौसम सहायक", assistant: "WeatherGPT से पूछें", stayAhead: "तैयार रहें",
    alerts: "सक्रिय अलर्ट", welcome: "आज के मौसम के बारे में क्या जानना चाहेंगे?", chatPlaceholder: "क्या मुझे छाता चाहिए होगा?",
    grounded: "<strong>सत्यापित उत्तर</strong><br />पहले मौसम के तथ्य, फिर AI की व्याख्या।",
    locationAware: "<strong>स्थान के अनुसार</strong><br />स्थानीय जानकारी के लिए शहर या निर्देशांक का उपयोग करें।",
    liveData: "<strong>लाइव मौसम डेटा</strong><br />मौसम सेवा से रीयल-टाइम स्थितियाँ।",
  },
  bn: {
    heroEyebrow: "আপনার আবহাওয়া, সহজভাবে", heroTitle: "আকাশ <em>আসলে</em> কী বলছে দেখুন।",
    heroSummary: "লাইভ পরিস্থিতি, ব্যবহারিক সতর্কতা এবং যাচাইকৃত আবহাওয়ার তথ্যভিত্তিক AI সহায়ক।",
    chooseLocation: "স্থান বেছে নিন", update: "আপডেট", useLocation: "আমার অবস্থান ব্যবহার করুন",
    locationNote: "শহরের নাম অথবা অক্ষাংশ, দ্রাঘিমাংশ লিখুন।", now: "এখন", outlook: "পূর্বাভাস",
    forecast: "পরবর্তী ৩ দিন", guide: "আবহাওয়া সহায়ক", assistant: "WeatherGPT-কে জিজ্ঞাসা করুন", stayAhead: "প্রস্তুত থাকুন",
    alerts: "সক্রিয় সতর্কতা", welcome: "আজকের আবহাওয়া সম্পর্কে কী জানতে চান?", chatPlaceholder: "আমার কি ছাতা লাগবে?",
    grounded: "<strong>যাচাইকৃত উত্তর</strong><br />আগে আবহাওয়ার তথ্য, পরে AI ব্যাখ্যা।",
    locationAware: "<strong>অবস্থানভিত্তিক</strong><br />স্থানীয় তথ্যের জন্য শহর বা স্থানাঙ্ক ব্যবহার করুন।",
    liveData: "<strong>লাইভ আবহাওয়ার তথ্য</strong><br />আবহাওয়া সেবা থেকে রিয়েল-টাইম পরিস্থিতি।",
  },
  mr: {
    heroEyebrow: "तुमचे हवामान, सोप्या भाषेत", heroTitle: "आकाश <em>खरोखर</em> काय सांगत आहे ते पहा।",
    heroSummary: "थेट परिस्थिती, उपयुक्त सूचना आणि सत्यापित हवामान माहितीवर आधारित AI मार्गदर्शक।",
    chooseLocation: "ठिकाण निवडा", update: "अपडेट", useLocation: "माझे ठिकाण वापरा",
    locationNote: "शहराचे नाव किंवा अक्षांश, रेखांश टाका।", now: "आत्ता", outlook: "अंदाज",
    forecast: "पुढील ३ दिवस", guide: "हवामान मार्गदर्शक", assistant: "WeatherGPT ला विचारा", stayAhead: "सतर्क रहा",
    alerts: "सक्रिय सूचना", welcome: "आजच्या हवामानाबद्दल काय जाणून घ्यायचे आहे?", chatPlaceholder: "मला छत्री लागेल का?",
    grounded: "<strong>सत्यापित उत्तरे</strong><br />प्रथम हवामानातील तथ्ये, नंतर AI स्पष्टीकरण।",
    locationAware: "<strong>ठिकाणानुसार</strong><br />स्थानिक माहितीसाठी शहर किंवा निर्देशांक वापरा।",
    liveData: "<strong>थेट हवामान माहिती</strong><br />हवामान सेवेकडून रिअल-टाइम स्थिती।",
  },
  te: {
    heroEyebrow: "మీ వాతావరణం, సులభంగా", heroTitle: "ఆకాశం <em>నిజంగా</em> ఏమి చెబుతోందో చూడండి।",
    heroSummary: "ప్రత్యక్ష పరిస్థితులు, ఆచరణాత్మక హెచ్చరికలు మరియు ధృవీకరించిన వాతావరణ సమాచారంతో AI మార్గదర్శి।",
    chooseLocation: "స్థలాన్ని ఎంచుకోండి", update: "నవీకరించు", useLocation: "నా స్థానాన్ని ఉపయోగించండి",
    locationNote: "నగర పేరు లేదా అక్షాంశం, రేఖాంశం నమోదు చేయండి।", now: "ఇప్పుడు", outlook: "అంచనా",
    forecast: "తదుపరి 3 రోజులు", guide: "వాతావరణ మార్గదర్శి", assistant: "WeatherGPTని అడగండి", stayAhead: "సిద్ధంగా ఉండండి",
    alerts: "క్రియాశీల హెచ్చరికలు", welcome: "నేటి వాతావరణం గురించి ఏమి తెలుసుకోవాలనుకుంటున్నారు?", chatPlaceholder: "నాకు గొడుగు అవసరమా?",
    grounded: "<strong>ధృవీకరించిన సమాధానాలు</strong><br />ముందు వాతావరణ సమాచారం, తర్వాత AI వివరణ।",
    locationAware: "<strong>స్థానానికి అనుగుణంగా</strong><br />స్థానిక సమాచారం కోసం నగరం లేదా కోఆర్డినేట్‌లు ఉపయోగించండి।",
    liveData: "<strong>ప్రత్యక్ష వాతావరణ సమాచారం</strong><br />వాతావరణ సేవ నుండి రియల్-టైమ్ పరిస్థితులు।",
  },
};

const elements = {
  apiState: document.querySelector("#api-state"),
  locationForm: document.querySelector("#location-form"),
  locationSearch: document.querySelector("#location-search"),
  locationSubmit: document.querySelector("#location-submit"),
  currentLocation: document.querySelector("#current-location"),
  refresh: document.querySelector("#refresh-data"),
  locationName: document.querySelector(".location-name"),
  weatherSymbol: document.querySelector("#weather-symbol"),
  temperature: document.querySelector("#current-temperature"),
  condition: document.querySelector("#weather-condition"),
  humidity: document.querySelector("#humidity"),
  wind: document.querySelector("#wind-speed"),
  rain: document.querySelector("#rain-probability"),
  lastUpdated: document.querySelector("#last-updated"),
  source: document.querySelector("#weather-source"),
  forecastList: document.querySelector("#forecast-list"),
  forecastTemplate: document.querySelector("#forecast-template"),
  alertList: document.querySelector("#alert-list"),
  alertCount: document.querySelector("#alert-count"),
  chatForm: document.querySelector("#chat-form"),
  chatMessage: document.querySelector("#chat-message"),
  chatLog: document.querySelector("#chat-log"),
  sendButton: document.querySelector("#send-button"),
  themeToggle: document.querySelector("#theme-toggle"),
  languageSelect: document.querySelector("#language-select"),
  languageModal: document.querySelector("#language-modal"),
  heroEyebrow: document.querySelector("#hero-eyebrow"),
  heroTitle: document.querySelector("#hero-title"),
  heroSummary: document.querySelector("#hero-summary"),
  locationLabel: document.querySelector("#location-label"),
  locationNote: document.querySelector("#location-note"),
  nowLabel: document.querySelector("#now-label"),
  outlookLabel: document.querySelector("#outlook-label"),
  forecastHeading: document.querySelector("#forecast-heading"),
  guideLabel: document.querySelector("#guide-label"),
  assistantHeading: document.querySelector("#assistant-heading"),
  alertsLabel: document.querySelector("#alerts-label"),
  alertsHeading: document.querySelector("#alerts-heading"),
  welcomeMessage: document.querySelector("#welcome-message"),
  trustGrounded: document.querySelector("#trust-grounded"),
  trustLocation: document.querySelector("#trust-location"),
  trustLive: document.querySelector("#trust-live"),
};

function weatherIcon(condition = "") {
  const description = condition.toLowerCase();
  if (description.includes("rain") || description.includes("storm")) return "☂";
  if (description.includes("cloud")) return "◒";
  if (description.includes("wind")) return "≋";
  if (description.includes("sun") || description.includes("clear")) return "☀";
  return "◌";
}

function setApiState(kind, message) {
  elements.apiState.className = `api-state ${kind === "online" ? "is-online" : kind === "error" ? "is-error" : ""}`;
  elements.apiState.lastElementChild.textContent = message;
}

function applyLanguage(language, { persist = true } = {}) {
  const copy = translations[language] || translations.en;
  state.language = language;
  document.documentElement.lang = language;
  elements.languageSelect.value = language;
  elements.heroEyebrow.textContent = copy.heroEyebrow;
  elements.heroTitle.innerHTML = copy.heroTitle;
  elements.heroSummary.textContent = copy.heroSummary;
  elements.locationLabel.textContent = copy.chooseLocation;
  elements.locationSubmit.textContent = copy.update;
  elements.currentLocation.innerHTML = `<span aria-hidden="true">⌖</span> ${copy.useLocation}`;
  elements.locationNote.textContent = copy.locationNote;
  elements.nowLabel.textContent = copy.now;
  elements.outlookLabel.textContent = copy.outlook;
  elements.forecastHeading.textContent = copy.forecast;
  elements.guideLabel.textContent = copy.guide;
  elements.assistantHeading.textContent = copy.assistant;
  elements.alertsLabel.textContent = copy.stayAhead;
  elements.alertsHeading.textContent = copy.alerts;
  elements.chatMessage.placeholder = copy.chatPlaceholder;
  elements.trustGrounded.innerHTML = copy.grounded;
  elements.trustLocation.innerHTML = copy.locationAware;
  elements.trustLive.innerHTML = copy.liveData;
  if (elements.chatLog.children.length === 1 && elements.welcomeMessage) {
    elements.welcomeMessage.textContent = copy.welcome;
  }
  if (persist) localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "The weather service could not complete that request.";
    throw new Error(detail);
  }
  return data;
}

function formatCoordinates(latitude, longitude) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function updateCurrentWeather(weather) {
  elements.locationName.textContent = state.locationName || weather.location || formatCoordinates(state.latitude, state.longitude);
  elements.weatherSymbol.textContent = weatherIcon(weather.weather_condition);
  elements.temperature.textContent = Math.round(weather.temperature);
  elements.condition.textContent = weather.weather_condition;
  elements.humidity.textContent = `${Math.round(weather.humidity)}%`;
  elements.wind.textContent = `${Math.round(weather.wind_speed)} km/h`;
  elements.rain.textContent = weather.rain_probability == null ? "—" : `${Math.round(weather.rain_probability)}%`;
  elements.lastUpdated.textContent = `UPDATED ${new Date(weather.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  elements.source.textContent = String(weather.source || "weather service").toUpperCase();
}

function updateForecast(forecast) {
  elements.forecastList.replaceChildren();
  forecast.forecast.forEach((day) => {
    const row = elements.forecastTemplate.content.cloneNode(true);
    const date = new Date(`${day.date}T12:00:00`);
    row.querySelector(".forecast-date").textContent = date.toLocaleDateString([], { weekday: "short" });
    row.querySelector(".forecast-icon").textContent = weatherIcon(day.weather_condition);
    row.querySelector(".forecast-condition").textContent = day.weather_condition;
    row.querySelector(".forecast-rain").textContent = `${Math.round(day.rain_probability)}% rain`;
    row.querySelector(".forecast-range").textContent = `${Math.round(day.temperature_min)}° / ${Math.round(day.temperature_max)}°`;
    elements.forecastList.append(row);
  });
}

function updateAlerts(alerts) {
  elements.alertCount.textContent = alerts.length;
  elements.alertList.replaceChildren();
  if (!alerts.length) {
    const copy = document.createElement("p");
    copy.className = "empty-alerts";
    copy.textContent = "No active alerts for the available alert feed.";
    elements.alertList.append(copy);
    return;
  }
  alerts.forEach((alert) => {
    const item = document.createElement("article");
    item.className = "alert-item";
    item.innerHTML = `
      <span class="severity-dot" aria-hidden="true"></span>
      <div>
        <h3>${escapeHtml(alert.title)}</h3>
        <p>${escapeHtml(alert.message)}</p>
        <p class="alert-meta">${escapeHtml(alert.severity)} · ${escapeHtml(alert.alert_type)} · ${escapeHtml(alert.location)}</p>
      </div>`;
    elements.alertList.append(item);
  });
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

function appendMessage(text, role) {
  const message = document.createElement("div");
  message.className = `message ${role === "user" ? "user-message" : "assistant-message"}`;
  message.textContent = text;
  elements.chatLog.append(message);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

async function refreshDashboard() {
  elements.refresh.disabled = true;
  setApiState("loading", "Refreshing weather data");
  const query = `latitude=${encodeURIComponent(state.latitude)}&longitude=${encodeURIComponent(state.longitude)}`;
  try {
    const [weather, forecast, alerts] = await Promise.all([
      request(`/api/v1/weather/current?${query}`),
      request(`/api/v1/weather/forecast?${query}&days=3`),
      request("/api/v1/alerts"),
    ]);
    updateCurrentWeather(weather);
    updateForecast(forecast);
    updateAlerts(alerts);
    if (!elements.locationSearch.value.trim()) {
      elements.locationSearch.value = state.locationQuery || formatCoordinates(state.latitude, state.longitude);
    }
    setApiState("online", "Weather service connected");
  } catch (error) {
    console.error(error);
    setApiState("error", "Weather service unavailable");
    elements.condition.textContent = error.message;
    elements.forecastList.innerHTML = `<p class="loading-copy">${escapeHtml(error.message)}</p>`;
  } finally {
    elements.refresh.disabled = false;
  }
}

function parseCoordinates(value) {
  const parts = value.split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part))) return null;
  const [latitude, longitude] = parts;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

elements.locationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = elements.locationSearch.value.trim();
  const coordinates = parseCoordinates(query);
  elements.locationSearch.setCustomValidity("");

  if (coordinates) {
    Object.assign(state, coordinates, { locationName: "", locationQuery: query });
    await refreshDashboard();
    return;
  }

  if (!query) return;
  elements.locationSubmit.disabled = true;
  setApiState("loading", "Finding location");
  try {
    const location = await request(`/api/v1/location/search?city=${encodeURIComponent(query)}`);
    Object.assign(state, {
      latitude: location.latitude,
      longitude: location.longitude,
      locationName: location.location,
      locationQuery: query,
    });
    await refreshDashboard();
  } catch (error) {
    setApiState("error", error.message);
    elements.locationSearch.setCustomValidity(error.message);
    elements.locationSearch.reportValidity();
  } finally {
    elements.locationSubmit.disabled = false;
  }
});

elements.currentLocation.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setApiState("error", "Location is not supported in this browser");
    return;
  }
  elements.currentLocation.disabled = true;
  elements.currentLocation.textContent = "Finding your location…";
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      state.latitude = coords.latitude;
      state.longitude = coords.longitude;
      state.locationName = "";
      state.locationQuery = formatCoordinates(coords.latitude, coords.longitude);
      elements.locationSearch.value = state.locationQuery;
      elements.currentLocation.disabled = false;
      elements.currentLocation.innerHTML = `<span aria-hidden="true">⌖</span> ${translations[state.language].useLocation}`;
      refreshDashboard();
    },
    () => {
      elements.currentLocation.disabled = false;
      elements.currentLocation.innerHTML = `<span aria-hidden="true">⌖</span> ${translations[state.language].useLocation}`;
      setApiState("error", "Location permission was not granted");
    },
    { enableHighAccuracy: false, timeout: 10000 }
  );
});

elements.refresh.addEventListener("click", refreshDashboard);

elements.chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = elements.chatMessage.value.trim();
  if (!message) return;
  appendMessage(message, "user");
  elements.chatMessage.value = "";
  elements.sendButton.disabled = true;
  try {
    const reply = await request("/api/v1/chat", {
      method: "POST",
      body: JSON.stringify({ message, latitude: state.latitude, longitude: state.longitude, language: state.language }),
    });
    appendMessage(reply.response, "assistant");
  } catch (error) {
    appendMessage(error.message, "assistant");
  } finally {
    elements.sendButton.disabled = false;
    elements.chatMessage.focus();
  }
});

elements.themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

elements.languageSelect.addEventListener("change", (event) => {
  applyLanguage(event.target.value);
});

let dashboardStarted = false;
function startDashboard() {
  if (dashboardStarted) return;
  dashboardStarted = true;
  refreshDashboard();
}

document.querySelectorAll("[data-language]").forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.language);
    elements.languageModal.hidden = true;
    startDashboard();
  });
});

const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
if (savedLanguage && translations[savedLanguage]) {
  applyLanguage(savedLanguage, { persist: false });
  elements.languageModal.hidden = true;
  startDashboard();
} else {
  applyLanguage("en", { persist: false });
}
