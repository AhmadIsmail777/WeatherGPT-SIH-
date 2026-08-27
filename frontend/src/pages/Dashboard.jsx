import { useCallback, useEffect, useRef, useState } from "react";

import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import CurrentWeather from "../components/CurrentWeather";
import Forecast from "../components/Forecast";
import ChatBox from "../components/ChatBox";
import ForecastPage from "./ForecastPage";
import { getWeather, searchLocations } from "../services/weatherService";
import { request } from "../services/api";
import { getTranslations, languageOptions, translateCondition } from "../i18n";

const DEFAULT_LOCATION = { latitude: 20.2961, longitude: 85.8245, name: "Bhubaneswar, Odisha, India", query: "Bhubaneswar" };

function parseCoordinates(value) {
  const parts = String(value).split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  const [latitude, longitude] = parts;
  return latitude >= 6.5 && latitude <= 37.5 && longitude >= 68 && longitude <= 97.6 ? { latitude, longitude } : null;
}

function readableTime(value, language) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(language === "en" ? "en-IN" : language, { hour: "numeric", minute: "2-digit" });
}

function readableWeather(current, location, language) {
  return {
    location: location || current.location,
    temperature: current.temperature,
    condition: translateCondition(current.weather_condition, language),
    conditionRaw: current.weather_condition,
    feelsLike: current.feels_like ?? current.temperature,
    humidity: current.humidity,
    wind: current.wind_speed,
    rainProbability: current.rain_probability,
  };
}

function readableForecast(forecast, language) {
  const todayLabels = { en: "Today", hi: "आज", or: "ଆଜି", bn: "আজ", mr: "आज", te: "ఈ రోజు" };
  return (forecast?.forecast || []).map((day, index) => {
    const date = new Date(`${day.date}T12:00:00`);
    return {
      day: index === 0 ? todayLabels[language] || todayLabels.en : date.toLocaleDateString(language, { weekday: "short" }),
      date: date.toLocaleDateString(language === "en" ? "en-IN" : language, { month: "short", day: "numeric" }),
      condition: translateCondition(day.weather_condition, language),
      conditionRaw: day.weather_condition,
      high: day.temperature_max,
      low: day.temperature_min,
      rainProbability: day.rain_probability,
      rawDate: day.date,
    };
  });
}

function readableHourly(forecast, language) {
  return (forecast?.hourly || []).map((hour) => ({
    ...hour,
    conditionRaw: hour.weather_condition,
    condition: translateCondition(hour.weather_condition, language),
    rainProbability: hour.rain_probability,
  }));
}

function buildDetails(current, language) {
  const visibility = current.visibility == null ? null : current.visibility >= 1000 ? `${(current.visibility / 1000).toFixed(1)} km` : `${Math.round(current.visibility)} m`;
  return {
    humidity: current.humidity,
    windSpeed: current.wind_speed,
    uvIndex: current.uv_index,
    visibility,
    pressure: current.pressure,
    sunrise: readableTime(current.sunrise, language),
    sunset: readableTime(current.sunset, language),
  };
}

function Dashboard({ darkMode, setDarkMode }) {
  const [language, setLanguage] = useState("en");
  const [activeView, setActiveView] = useState(() => window.location.pathname.endsWith("/forecast") ? "forecast" : "dashboard");
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION);
  const [search, setSearch] = useState(DEFAULT_LOCATION.query);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [details, setDetails] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const selectedLocationRef = useRef(DEFAULT_LOCATION);
  const hasWeatherRef = useRef(false);
  const labels = getTranslations(language);

  selectedLocationRef.current = selectedLocation;

  const refresh = useCallback(async (nextLocation = selectedLocationRef.current) => {
    setLoading(true);
    setError("");
    try {
      const data = await getWeather(nextLocation.latitude, nextLocation.longitude, nextLocation.name, language);
      setWeather(readableWeather(data.current, nextLocation.name, language));
      setForecast(readableForecast(data.forecast, language));
      setHourly(readableHourly(data.forecast, language));
      setDetails(buildDetails(data.current, language));
      setAlerts(data.alerts || []);
      setSelectedLocation(nextLocation);
      hasWeatherRef.current = true;
    } catch (requestError) {
      setError(requestError.message || labels.locationUnavailable);
    } finally {
      setLoading(false);
    }
  }, [language, labels.locationUnavailable]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(DEFAULT_LOCATION); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    request("/api/v1/users/me").then(setAuthUser).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hasWeatherRef.current) return undefined;
    const timer = window.setTimeout(() => { void refresh(selectedLocationRef.current); }, 0);
    return () => window.clearTimeout(timer);
  }, [language, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => refresh(selectedLocationRef.current), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const handlePopState = () => setActiveView(window.location.pathname.endsWith("/forecast") ? "forecast" : "dashboard");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(view) {
    const path = view === "forecast" ? "/forecast" : "/";
    window.history.pushState({}, "", path);
    setActiveView(view);
  }

  async function handleSearch(value) {
    const query = value.trim();
    if (!query) return;
    setSearch(query);
    setError("");
    const coordinates = parseCoordinates(query);
    if (coordinates) {
      await selectLocation({ ...coordinates, name: query }, query);
      return;
    }
    setLoading(true);
    try {
      const result = await searchLocations(query);
      const nextSuggestions = result.suggestions || [];
      setSuggestions(nextSuggestions);
      if (nextSuggestions.length === 1) await selectLocation(nextSuggestions[0], query);
      else if (!nextSuggestions.length) setError(labels.locationNotFound(query));
    } catch (requestError) {
      setError(requestError.message || labels.locationUnavailable);
    } finally {
      setLoading(false);
    }
  }

  async function selectLocation(result, query = search) {
    const nextLocation = { latitude: result.latitude, longitude: result.longitude, name: result.location || result.name, query };
    setSuggestions([]);
    setSearch(query);
    await refresh(nextLocation);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setError(labels.locationUnsupported); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => refresh({ latitude: coords.latitude, longitude: coords.longitude, name: "Current Indian location", query: "Current location" }),
      () => { setLoading(false); setError(labels.locationPermission); },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  async function submitAuth(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      if (authMode === "signup") await request("/api/v1/users/register", { method: "POST", body: JSON.stringify({ ...authForm, preferred_language: language }) });
      const token = await request("/api/v1/users/login", { method: "POST", body: JSON.stringify({ email: authForm.email, password: authForm.password }) });
      localStorage.setItem("weathergpt-token", token.access_token);
      setAuthUser(await request("/api/v1/users/me"));
      setAuthMode(null);
      setAuthForm({ name: "", email: "", password: "" });
    } catch (authRequestError) {
      setAuthError(authRequestError.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem("weathergpt-token");
    setAuthUser(null);
  }

  const currentHour = Number(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }));
  const greeting = currentHour >= 5 && currentHour < 12 ? labels.goodMorning : currentHour >= 12 && currentHour < 17 ? labels.goodAfternoon : currentHour >= 17 && currentHour < 21 ? labels.goodEvening : labels.goodNight;

  return (
    <div className={darkMode ? "app dark" : "app"}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} alerts={alerts} location={weather?.location || selectedLocation.name} labels={labels} language={language} languages={languageOptions} onLanguageChange={setLanguage} activeView={activeView} onNavigate={navigate} authUser={authUser} onAuth={() => { setAuthMode("signin"); setAuthError(""); }} onSignOut={signOut} />
      {activeView === "forecast" ? <ForecastPage forecast={forecast} hourly={hourly} location={weather?.location || selectedLocation.name} labels={labels} language={language} onBack={() => navigate("dashboard")} /> : (
        <main className="dashboard">
          <div className="welcome-section"><span>{labels.brandTag}</span><h1>{greeting} 👋</h1><p>{labels.welcomeText}</p></div>
          <SearchBar location={search} setLocation={(value) => { setSearch(value); setSuggestions([]); }} onSearch={handleSearch} loading={loading} suggestions={suggestions} onSelect={(result) => selectLocation(result, search)} onUseCurrentLocation={useCurrentLocation} labels={labels} />
          {error && <div className="weather-error" role="alert">{error}</div>}
          {loading && !weather && <div className="weather-error">{labels.loading}</div>}
          {weather && <>
            <div className="weather-layout"><CurrentWeather weather={weather} details={details} labels={labels} /><ChatBox key={`${selectedLocation.latitude}-${selectedLocation.longitude}-${language}`} location={weather.location} coordinates={selectedLocation} language={language} labels={labels} /></div>
            <Forecast forecast={forecast} hourly={hourly} labels={labels} language={language} />
          </>}
        </main>
      )}
      {authMode && <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div className="auth-dialog"><button className="auth-close" type="button" onClick={() => setAuthMode(null)} aria-label={labels.close}>×</button><span className="weather-label">{labels.account}</span><h2 id="auth-title">{authMode === "signin" ? labels.welcomeBack : labels.createAccount}</h2><p>{labels.accountDescription}</p><form onSubmit={submitAuth}>{authMode === "signup" && <label>{labels.name}<input required maxLength={120} value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} /></label>}<label>{labels.email}<input required type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label><label>{labels.password}<input required minLength={8} type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>{authError && <div className="auth-error">{authError}</div>}<button className="auth-submit" type="submit" disabled={authLoading}>{authLoading ? labels.pleaseWait : authMode === "signin" ? labels.signIn : labels.signUp}</button></form><button className="auth-switch" type="button" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(""); }}>{authMode === "signin" ? labels.needAccount : labels.alreadyRegistered}</button></div></div>}
    </div>
  );
}

export default Dashboard;
