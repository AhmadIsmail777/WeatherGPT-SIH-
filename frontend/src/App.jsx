import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { request } from "./api.js";
import { languages, translations } from "./i18n.js";

const DEFAULT_LOCATION = { latitude: 20.2961, longitude: 85.8245, name: "Bhubaneswar, Odisha, India", query: "Bhubaneswar" };
const LANGUAGE_STORAGE_KEY = "weathergpt-language";
const TOKEN_STORAGE_KEY = "weathergpt-token";
const voiceLocales = { en: "en-IN", or: "or-IN", hi: "hi-IN", bn: "bn-IN", mr: "mr-IN", te: "te-IN" };

function weatherIcon(condition = "") {
  const description = condition.toLowerCase();
  if (description.includes("rain") || description.includes("storm")) return "☂";
  if (description.includes("cloud")) return "◒";
  if (description.includes("wind")) return "≋";
  if (description.includes("sun") || description.includes("clear")) return "☀";
  return "◌";
}

function formatCoordinates(latitude, longitude) {
  return `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
}

function parseCoordinates(value) {
  const parts = value.split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  const [latitude, longitude] = parts;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 ? { latitude, longitude } : null;
}

function RichCopy({ html }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function App() {
  const savedLanguage = useMemo(() => localStorage.getItem(LANGUAGE_STORAGE_KEY), []);
  const [language, setLanguage] = useState(translations[savedLanguage] ? savedLanguage : "en");
  const [languageModalOpen, setLanguageModalOpen] = useState(!translations[savedLanguage]);
  const [started, setStarted] = useState(Boolean(translations[savedLanguage]));
  const [dark, setDark] = useState(false);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [searchValue, setSearchValue] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [chatMessages, setChatMessages] = useState([{ role: "assistant", text: translations.en.welcome }]);
  const [chatValue, setChatValue] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [findingLocation, setFindingLocation] = useState(false);
  const [apiStatus, setApiStatus] = useState({ kind: "", message: "Connecting to weather service" });
  const [dashboardError, setDashboardError] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const copy = translations[language] || translations.en;

  useEffect(() => {
    document.documentElement.lang = language;
    document.body.classList.toggle("dark", dark);
  }, [dark, language]);

  useEffect(() => {
    setChatMessages((messages) => messages.length === 1 && messages[0].role === "assistant" ? [{ role: "assistant", text: copy.welcome }] : messages);
  }, [copy.welcome]);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_STORAGE_KEY)) return;
    request("/api/v1/users/me").then(setAuthUser).catch(() => localStorage.removeItem(TOKEN_STORAGE_KEY));
  }, []);

  const refreshDashboard = useCallback(async (coordinates = location) => {
    setRefreshing(true);
    setDashboardError("");
    setApiStatus({ kind: "", message: "Refreshing India weather data" });
    const query = `latitude=${encodeURIComponent(coordinates.latitude)}&longitude=${encodeURIComponent(coordinates.longitude)}`;
    const alertQuery = `${query}&location=${encodeURIComponent(coordinates.name || "")}&language=${encodeURIComponent(language)}`;
    try {
      const [currentWeather, currentForecast, currentAlerts] = await Promise.all([
        request(`/api/v1/weather/current?${query}`),
        request(`/api/v1/weather/forecast?${query}&days=3`),
        request(`/api/v1/alerts?${alertQuery}`),
      ]);
      setWeather(currentWeather);
      setForecast(currentForecast);
      setAlerts(currentAlerts);
      setSearchValue((value) => value.trim() ? value : coordinates.query || formatCoordinates(coordinates.latitude, coordinates.longitude));
      setApiStatus({ kind: "online", message: "India weather service connected" });
    } catch (error) {
      setDashboardError(error.message);
      setApiStatus({ kind: "error", message: "Weather service unavailable" });
    } finally {
      setRefreshing(false);
    }
  }, [language, location]);

  useEffect(() => {
    if (!started) return undefined;
    refreshDashboard(location);
    const timer = window.setInterval(() => refreshDashboard(location), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [started, location.latitude, location.longitude, location.name, language]);

  function chooseLanguage(nextLanguage) {
    const selected = translations[nextLanguage] ? nextLanguage : "en";
    setLanguage(selected);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, selected);
    setLanguageModalOpen(false);
    setStarted(true);
  }

  async function selectLocation(result, query) {
    const nextLocation = { latitude: result.latitude, longitude: result.longitude, name: result.location, query };
    setLocation(nextLocation);
    setSearchValue(query);
    setLocationSuggestions([]);
    await refreshDashboard(nextLocation);
  }

  async function submitLocation(event) {
    event.preventDefault();
    const query = searchValue.trim();
    if (!query) return;
    const coordinates = parseCoordinates(query);
    if (coordinates) {
      await selectLocation({ ...coordinates, location: "" }, query);
      return;
    }
    setApiStatus({ kind: "", message: "Finding the closest Indian location" });
    try {
      const result = await request(`/api/v1/location/search?city=${encodeURIComponent(query)}`);
      const suggestions = result.suggestions || [];
      setLocationSuggestions(suggestions);
      if (suggestions.length === 1) {
        await selectLocation(suggestions[0], query);
      } else if (suggestions.length) {
        setApiStatus({ kind: "online", message: "Choose the correct Indian location from the suggestions" });
      }
    } catch (error) {
      setApiStatus({ kind: "error", message: error.message });
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setApiStatus({ kind: "error", message: "Location is not supported in this browser" });
      return;
    }
    setFindingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const nextLocation = { latitude: coords.latitude, longitude: coords.longitude, name: "", query: formatCoordinates(coords.latitude, coords.longitude) };
        setLocation(nextLocation);
        setSearchValue(nextLocation.query);
        setFindingLocation(false);
        await refreshDashboard(nextLocation);
      },
      () => {
        setFindingLocation(false);
        setApiStatus({ kind: "error", message: "Location permission was not granted" });
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  async function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setApiStatus({ kind: "error", message: "Voice input is not supported by this browser" });
      return;
    }
    if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      setApiStatus({ kind: "error", message: "Voice input needs HTTPS or localhost." });
      return;
    }
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphone.getTracks().forEach((track) => track.stop());
      } catch (error) {
        setApiStatus({ kind: "error", message: error.name === "NotAllowedError" ? "Microphone permission was denied. Allow it in the browser and try again." : "The microphone could not be opened." });
        return;
      }
    }
    const recognition = new Recognition();
    recognition.lang = voiceLocales[language] || "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setListening(true);
      setApiStatus({ kind: "online", message: `Listening in ${voiceLocales[language] || "your selected language"}…` });
    };
    recognition.onresult = (event) => {
      const results = Array.from(event.results || []);
      const transcript = results.map((result) => result?.[0]?.transcript || "").join(" ").trim();
      if (transcript) {
        setChatValue(transcript);
        if (results.some((result) => result.isFinal)) setApiStatus({ kind: "online", message: "Voice text captured. Press send to ask WeatherGPT." });
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      const messages = {
        "not-allowed": "Microphone permission was denied. Allow microphone access and try again.",
        "service-not-allowed": "The browser speech service is unavailable.",
        "no-speech": "No speech detected. Try speaking again.",
      };
      setApiStatus({ kind: "error", message: messages[event.error] || "Voice input could not be captured" });
    };
    recognition.onnomatch = () => setApiStatus({ kind: "error", message: "I could not understand that. Please try again." });
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (error) {
      setListening(false);
      recognitionRef.current = null;
      setApiStatus({ kind: "error", message: error.name === "InvalidStateError" ? "Voice input is already starting." : "Could not start microphone capture." });
    }
  }

  function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLocales[language] || "en-IN";
    window.speechSynthesis.speak(utterance);
  }

  async function submitChat(event) {
    event.preventDefault();
    const message = chatValue.trim();
    if (!message || chatLoading) return;
    setChatMessages((messages) => [...messages, { role: "user", text: message }]);
    setChatValue("");
    setChatLoading(true);
    try {
      const reply = await request("/api/v1/chat", {
        method: "POST",
        body: JSON.stringify({ message, latitude: location.latitude, longitude: location.longitude, language }),
      });
      setChatMessages((messages) => [...messages, { role: "assistant", text: reply.response }]);
    } catch (error) {
      setChatMessages((messages) => [...messages, { role: "assistant", text: error.message }]);
    } finally {
      setChatLoading(false);
    }
  }

  function openAuth(mode = "signin") {
    setAuthMode(mode);
    setAuthError("");
    setAuthOpen(true);
  }

  async function submitAuth(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      if (authMode === "signup") {
        await request("/api/v1/users/register", { method: "POST", body: JSON.stringify({ name: authForm.name, email: authForm.email, password: authForm.password, preferred_language: language }) });
      }
      const token = await request("/api/v1/users/login", { method: "POST", body: JSON.stringify({ email: authForm.email, password: authForm.password }) });
      localStorage.setItem(TOKEN_STORAGE_KEY, token.access_token);
      setAuthUser(await request("/api/v1/users/me"));
      setAuthOpen(false);
      setAuthForm({ name: "", email: "", password: "" });
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthUser(null);
  }

  return (
    <>
      <div className="sky-glow sky-glow-one" /><div className="sky-glow sky-glow-two" />
      <main className="app-shell">
        <header className="topbar">
          <a className="brand" href="#top" aria-label="WeatherGPT home"><span className="brand-mark" aria-hidden="true">✦</span><span>weather<span>GPT</span></span></a>
          <div className={`api-state ${apiStatus.kind === "online" ? "is-online" : apiStatus.kind === "error" ? "is-error" : ""}`} aria-live="polite"><span className="status-dot" /><span>{apiStatus.message}</span></div>
          <div className="topbar-actions">
            <label className="sr-only" htmlFor="language-select">Choose language</label>
            <select className="language-select" id="language-select" value={language} onChange={(event) => chooseLanguage(event.target.value)} aria-label="Choose language">{languages.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select>
            {authUser ? <button className="account-button" type="button" onClick={signOut} title="Sign out">{authUser.name} · Sign out</button> : <button className="account-button" type="button" onClick={() => openAuth("signin")}>Sign in</button>}
            <button className="icon-button" type="button" onClick={() => setDark((value) => !value)} aria-label="Toggle colour theme"><span aria-hidden="true">◐</span></button>
          </div>
        </header>

        <section className="hero" id="top">
          <div className="hero-copy"><p className="eyebrow">{copy.heroEyebrow}</p><h1><RichCopy html={copy.heroTitle} /></h1><p className="hero-summary">{copy.heroSummary} India locations only.</p></div>
          <form className="location-form" onSubmit={submitLocation}>
            <label htmlFor="location-search">{copy.chooseLocation}</label>
            <div className="location-controls"><input id="location-search" value={searchValue} onChange={(event) => { setSearchValue(event.target.value); setLocationSuggestions([]); }} type="text" placeholder="e.g. Bhubaneswar or 20.2961, 85.8245" autoComplete="off" /><button className="primary-button" type="submit" disabled={refreshing}>{copy.update}</button></div>
            {locationSuggestions.length > 0 && <div className="location-suggestions" role="listbox" aria-label="Similar Indian locations">{locationSuggestions.map((suggestion) => <button type="button" key={`${suggestion.latitude}-${suggestion.longitude}`} onClick={() => selectLocation(suggestion, searchValue.trim())}>{suggestion.location}</button>)}</div>}
            <button className="current-location" type="button" onClick={useCurrentLocation} disabled={findingLocation}><span aria-hidden="true">⌖</span> {findingLocation ? "Finding your location…" : copy.useLocation}</button>
            <p className="form-note">{copy.locationNote} Only locations in India are supported; spelling mistakes get similar suggestions.</p>
          </form>
        </section>

        <section className="dashboard-grid" aria-label="Weather dashboard">
          <article className="current-weather card card-dark" aria-labelledby="current-heading"><div className="card-heading-row"><div><p className="eyebrow muted">{copy.now}</p><h2 id="current-heading" className="location-name">{location.name || weather?.location || "Loading conditions…"}</h2></div><button className="refresh-button" type="button" onClick={() => refreshDashboard(location)} disabled={refreshing} aria-label="Refresh weather data">↻</button></div><div className="temperature-row"><div className="weather-symbol" aria-hidden="true">{weatherIcon(weather?.weather_condition)}</div><div><div className="temperature"><span>{weather ? Math.round(weather.temperature) : "—"}</span><sup>°C</sup></div><p id="weather-condition">{dashboardError || weather?.weather_condition || "Fetching verified weather"}</p></div></div><div className="weather-stats"><div><span>HUMIDITY</span><strong>{weather ? `${Math.round(weather.humidity)}%` : "—"}</strong></div><div><span>WIND</span><strong>{weather ? `${Math.round(weather.wind_speed)} km/h` : "—"}</strong></div><div><span>RAIN</span><strong>{weather?.rain_probability == null ? "—" : `${Math.round(weather.rain_probability)}%`}</strong></div></div><footer className="card-footer"><span>{weather ? `UPDATED ${new Date(weather.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for an update"}</span><span>{String(weather?.source || "—").toUpperCase()}</span></footer></article>

          <article className="forecast card" aria-labelledby="forecast-heading"><div className="card-heading-row"><div><p className="eyebrow muted">{copy.outlook}</p><h2 id="forecast-heading">{copy.forecast}</h2></div><span className="mini-label">VERIFIED</span></div><div className="forecast-list" aria-live="polite">{forecast?.forecast?.length ? forecast.forecast.map((day) => <div className="forecast-day" key={day.date}><span className="forecast-date">{new Date(`${day.date}T12:00:00`).toLocaleDateString([], { weekday: "short" })}</span><span className="forecast-icon" aria-hidden="true">{weatherIcon(day.weather_condition)}</span><span className="forecast-condition">{day.weather_condition}</span><span className="forecast-rain">{Math.round(day.rain_probability)}% rain</span><strong className="forecast-range">{Math.round(day.temperature_min)}° / {Math.round(day.temperature_max)}°</strong></div>) : <p className="loading-copy">{dashboardError || "Building the forecast…"}</p>}</div></article>

          <article className="assistant-card card" aria-labelledby="assistant-heading"><div className="assistant-heading"><div className="sparkle" aria-hidden="true">✦</div><div><p className="eyebrow muted">{copy.guide}</p><h2 id="assistant-heading">{copy.assistant}</h2></div></div><div className="chat-log" aria-live="polite">{chatMessages.map((message, index) => <div className={`message ${message.role === "user" ? "user-message" : "assistant-message"}`} key={`${index}-${message.role}`}><span>{message.text}</span>{message.role === "assistant" && <button type="button" className="speak-button" onClick={() => speakText(message.text)} aria-label="Read answer aloud">🔊</button>}</div>)}{chatLoading && <div className="message assistant-message">Thinking…</div>}</div><form className="chat-form" onSubmit={submitChat}><label className="sr-only" htmlFor="chat-message">Ask a weather question</label><input id="chat-message" value={chatValue} onChange={(event) => setChatValue(event.target.value)} maxLength={2000} placeholder={copy.chatPlaceholder} required /><button className={`voice-button ${listening ? "is-listening" : ""}`} type="button" onClick={toggleListening} aria-label={listening ? "Stop voice input" : "Ask with your voice"}>{listening ? "■" : "🎙"}</button><button className="send-button" type="submit" disabled={chatLoading} aria-label="Send weather question">↑</button></form><p className="grounding-note"><span aria-hidden="true">✓</span> Ask in your language; answers use the selected language and verified Indian weather data.</p></article>

          <article className="alerts card" aria-labelledby="alerts-heading"><div className="card-heading-row"><div><p className="eyebrow muted">{copy.stayAhead}</p><h2 id="alerts-heading">{copy.alerts}</h2></div><span className="alert-count">{alerts.length}</span></div><div className="alert-list" aria-live="polite">{alerts.length ? alerts.map((alert) => <article className="alert-item" key={`${alert.id}-${alert.title}`}><span className="severity-dot" aria-hidden="true" /><div><h3>{alert.title}</h3><p>{alert.message}</p><p className="alert-meta">{alert.severity} · {alert.alert_type} · {alert.source || "weather feed"} · {alert.location}</p></div></article>) : <p className="empty-alerts">No active official or safety alerts for this Indian location.</p>}</div></article>
        </section>

        <section className="trust-bar" aria-label="Product benefits"><div><span className="trust-icon">⌁</span><p><RichCopy html={copy.grounded} /></p></div><div><span className="trust-icon">◎</span><p><RichCopy html={copy.locationAware} /></p></div><div><span className="trust-icon">↗</span><p><RichCopy html={copy.liveData} /></p></div></section>
      </main>

      {languageModalOpen && <section className="language-modal" role="dialog" aria-modal="true" aria-labelledby="language-title"><div className="language-dialog"><span className="brand-mark" aria-hidden="true">✦</span><p className="eyebrow">WEATHERGPT</p><h2 id="language-title">{copy.languageTitle}</h2><p>{copy.languageDescription}</p><div className="language-options">{languages.map(([code, label]) => <button type="button" key={code} onClick={() => chooseLanguage(code)}>{label}</button>)}</div></div></section>}

      {authOpen && <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div className="auth-dialog"><button className="modal-close" type="button" onClick={() => setAuthOpen(false)} aria-label="Close">×</button><p className="eyebrow">WEATHERGPT ACCOUNT</p><h2 id="auth-title">{authMode === "signin" ? "Welcome back" : "Create your account"}</h2><p className="auth-description">Save your preferences and keep WeatherGPT ready for you.</p><form onSubmit={submitAuth}>{authMode === "signup" && <label>Name<input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} required maxLength={120} /></label>}<label>Email<input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} required /></label><label>Password<input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} minLength={8} required /></label>{authError && <p className="auth-error">{authError}</p>}<button className="primary-button auth-submit" type="submit" disabled={authLoading}>{authLoading ? "Please wait…" : authMode === "signin" ? "Sign in" : "Sign up"}</button></form><button className="auth-switch" type="button" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(""); }}>{authMode === "signin" ? "Need a new account? Sign up" : "Already have an account? Sign in"}</button></div></section>}
    </>
  );
}

export default App;
