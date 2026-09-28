import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const DEFAULT_COORDINATES = { latitude: 20.2961, longitude: 85.8245 };
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:5000"
    : "http://127.0.0.1:5000");
const locales = {
  en: "en-IN",
  hi: "hi-IN",
  or: "or-IN",
  bn: "bn-IN",
  mr: "mr-IN",
  te: "te-IN",
};
const languageLabels = {
  en: "English",
  hi: "हिन्दी",
  or: "ଓଡ଼ିଆ",
  bn: "বাংলা",
  mr: "मराठी",
  te: "తెలుగు",
};

async function api(path, options = {}) {
  const token = await AsyncStorage.getItem("weathergpt-token");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.detail || "The weather service could not complete that request.",
    );
  return data;
}

function weatherIcon(condition = "") {
  const value = condition.toLowerCase();
  if (value.includes("rain") || value.includes("storm")) return "☂";
  if (value.includes("cloud")) return "◒";
  if (value.includes("clear") || value.includes("sun")) return "☀";
  return "◌";
}

export default function App() {
  const [language, setLanguage] = useState("en");
  const [coordinates, setCoordinates] = useState(DEFAULT_COORDINATES);
  const [locationName, setLocationName] = useState(
    "Bhubaneswar, Odisha, India",
  );
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authLoading, setAuthLoading] = useState(false);

  useSpeechRecognitionEvent("result", (event) => {
    const transcript =
      event.results
        ?.map?.((result) => result?.transcript || result?.[0]?.transcript || "")
        .join(" ")
        .trim() ||
      event.transcript ||
      "";
    if (transcript) {
      setChatInput(transcript);
      setStatus("Voice text captured. You can send it now.");
    }
  });
  useSpeechRecognitionEvent("start", () => setListening(true));
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    setStatus(
      event?.error?.message ||
        event?.error ||
        "Voice input is unavailable on this device.",
    );
  });

  async function refresh(
    nextCoordinates = coordinates,
    nextName = locationName,
  ) {
    setLoading(true);
    const nextQuery = `latitude=${nextCoordinates.latitude}&longitude=${nextCoordinates.longitude}`;
    try {
      const [current, nextForecast, nextAlerts] = await Promise.all([
        api(`/api/v1/weather/current?${nextQuery}`),
        api(`/api/v1/weather/forecast?${nextQuery}&days=3`),
        api(
          `/api/v1/alerts?${nextQuery}&location=${encodeURIComponent(nextName || "")}&language=${encodeURIComponent(language)}`,
        ),
      ]);
      setWeather(current);
      setForecast(nextForecast);
      setAlerts(nextAlerts);
      setCoordinates(nextCoordinates);
      setLocationName(nextName || current.location);
      setStatus("India weather updated");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    AsyncStorage.getItem("weathergpt-token").then(
      (token) =>
        token &&
        api("/api/v1/users/me")
          .then(setAuthUser)
          .catch(() => AsyncStorage.removeItem("weathergpt-token")),
    );
  }, []);

  useEffect(() => {
    if (weather) refresh(coordinates, locationName);
  }, [language]);

  useEffect(() => {
    const timer = setInterval(
      () => refresh(coordinates, locationName),
      5 * 60 * 1000,
    );
    return () => clearInterval(timer);
  }, [coordinates.latitude, coordinates.longitude, locationName]);

  async function useDeviceLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setStatus("Location permission was not granted.");
      return;
    }
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await refresh(
      {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      },
      "Current Indian location",
    );
  }

  async function searchLocation() {
    if (!search.trim()) return;
    try {
      const result = await api(
        `/api/v1/location/search?city=${encodeURIComponent(search.trim())}`,
      );
      const nextSuggestions = result.suggestions || [];
      setSuggestions(nextSuggestions);
      if (nextSuggestions.length === 1)
        await chooseLocation(nextSuggestions[0], search.trim());
      else if (nextSuggestions.length)
        setStatus("Choose the correct Indian location from the suggestions.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function chooseLocation(result, queryText) {
    setSuggestions([]);
    setSearch(queryText);
    await refresh(
      { latitude: result.latitude, longitude: result.longitude },
      result.location,
    );
  }

  async function askWeather() {
    const message = chatInput.trim();
    if (!message || chatLoading) return;
    setMessages((items) => [...items, { role: "user", text: message }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const result = await api("/api/v1/chat", {
        method: "POST",
        body: JSON.stringify({ message, ...coordinates, language }),
      });
      setMessages((items) => [
        ...items,
        { role: "assistant", text: result.response },
      ]);
      Speech.speak(result.response, { language: locales[language] });
    } catch (error) {
      setMessages((items) => [
        ...items,
        { role: "assistant", text: error.message },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function toggleVoice() {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    if (typeof ExpoSpeechRecognitionModule.start !== "function") {
      setStatus(
        "Voice capture needs an Expo development build with speech recognition enabled.",
      );
      return;
    }
    try {
      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!(permission.granted || permission.status === "granted")) {
        setStatus("Microphone and speech permission is required.");
        return;
      }
      setStatus(`Listening in ${locales[language]}…`);
      await ExpoSpeechRecognitionModule.start({
        lang: locales[language],
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
      });
    } catch (error) {
      setListening(false);
      setStatus(error?.message || "Could not start microphone capture.");
    }
  }

  async function submitAuth() {
    setAuthLoading(true);
    try {
      if (authMode === "signup")
        await api("/api/v1/users/register", {
          method: "POST",
          body: JSON.stringify({ ...authForm, preferred_language: language }),
        });
      const token = await api("/api/v1/users/login", {
        method: "POST",
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
        }),
      });
      await AsyncStorage.setItem("weathergpt-token", token.access_token);
      setAuthUser(await api("/api/v1/users/me"));
      setAuthMode(null);
      setAuthForm({ name: "", email: "", password: "" });
    } catch (error) {
      Alert.alert("Account", error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    await AsyncStorage.removeItem("weathergpt-token");
    setAuthUser(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>
                weather<Text style={styles.brandAccent}>GPT</Text>
              </Text>
              <Text style={styles.subtitle}>
                India weather, explained clearly
              </Text>
            </View>
            <Pressable
              style={styles.accountButton}
              onPress={() => (authUser ? signOut() : setAuthMode("signin"))}
            >
              <Text style={styles.accountText}>
                {authUser ? "Sign out" : "Sign in"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.searchCard}>
            <Text style={styles.label}>Search an Indian location</Text>
            <View style={styles.languageRow}>
              {Object.entries(languageLabels).map(([code, label]) => (
                <Pressable
                  key={code}
                  onPress={() => setLanguage(code)}
                  style={[
                    styles.languagePill,
                    language === code && styles.languagePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageText,
                      language === code && styles.languageTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.searchRow}>
              <TextInput
                value={search}
                onChangeText={(value) => {
                  setSearch(value);
                  setSuggestions([]);
                }}
                placeholder="Bhubaneswar or Mumbai"
                placeholderTextColor="#78908b"
                style={styles.input}
              />
              <Pressable style={styles.primaryButton} onPress={searchLocation}>
                <Text style={styles.primaryText}>Go</Text>
              </Pressable>
            </View>
            <Pressable onPress={useDeviceLocation}>
              <Text style={styles.locationLink}>⌖ Use my location</Text>
            </Pressable>
            {suggestions.length > 1 && (
              <View>
                {suggestions.map((item) => (
                  <Pressable
                    style={styles.suggestion}
                    key={`${item.latitude}-${item.longitude}`}
                    onPress={() => chooseLocation(item, search)}
                  >
                    <Text style={styles.suggestionText}>{item.location}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {loading && !weather ? (
            <ActivityIndicator color="#f0a544" size="large" />
          ) : (
            <>
              <View style={styles.weatherCard}>
                <Text style={styles.eyebrow}>NOW · INDIA</Text>
                <Text style={styles.location}>{locationName}</Text>
                <View style={styles.temperatureRow}>
                  <Text style={styles.weatherIcon}>
                    {weatherIcon(weather?.weather_condition)}
                  </Text>
                  <Text style={styles.temperature}>
                    {Math.round(weather?.temperature ?? 0)}°
                  </Text>
                  <Text style={styles.unit}>C</Text>
                </View>
                <Text style={styles.condition}>
                  {weather?.weather_condition}
                </Text>
                <View style={styles.stats}>
                  <Stat
                    label="HUMIDITY"
                    value={`${Math.round(weather?.humidity ?? 0)}%`}
                  />
                  <Stat
                    label="WIND"
                    value={`${Math.round(weather?.wind_speed ?? 0)} km/h`}
                  />
                  <Stat
                    label="RAIN"
                    value={
                      weather?.rain_probability == null
                        ? "—"
                        : `${Math.round(weather.rain_probability)}%`
                    }
                  />
                </View>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Next 3 days</Text>
                {forecast?.forecast?.map((day) => (
                  <View style={styles.forecastRow} key={day.date}>
                    <Text style={styles.forecastDate}>
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString([], {
                        weekday: "short",
                      })}
                    </Text>
                    <Text>{weatherIcon(day.weather_condition)}</Text>
                    <Text style={styles.forecastCondition}>
                      {day.weather_condition}
                    </Text>
                    <Text style={styles.forecastRange}>
                      {Math.round(day.temperature_min)}° /{" "}
                      {Math.round(day.temperature_max)}°
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.card}>
                <View style={styles.alertHeader}>
                  <Text style={styles.cardTitle}>Active safety alerts</Text>
                  <Text style={styles.badge}>{alerts.length}</Text>
                </View>
                {alerts.length ? (
                  alerts.map((item) => (
                    <View style={styles.alert} key={`${item.id}-${item.title}`}>
                      <Text style={styles.alertTitle}>{item.title}</Text>
                      <Text style={styles.alertMessage}>{item.message}</Text>
                      <Text style={styles.alertMeta}>
                        {item.severity} · {item.source || "weather rules"}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>
                    No active official or safety alerts for this location.
                  </Text>
                )}
              </View>
            </>
          )}

          <View style={styles.chatCard}>
            <Text style={styles.cardTitle}>Ask WeatherGPT</Text>
            <Text style={styles.muted}>
              Ask in English, हिन्दी, ଓଡ଼ିଆ, বাংলা, मराठी, or తెలుగు.
            </Text>
            <View style={styles.messages}>
              {messages.map((item, index) => (
                <View
                  style={[
                    styles.message,
                    item.role === "user"
                      ? styles.userMessage
                      : styles.assistantMessage,
                  ]}
                  key={`${index}-${item.role}`}
                >
                  <Text
                    style={
                      item.role === "user"
                        ? styles.userText
                        : styles.assistantText
                    }
                  >
                    {item.text}
                  </Text>
                </View>
              ))}
              {chatLoading && <Text style={styles.muted}>Thinking…</Text>}
            </View>
            <View style={styles.chatRow}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Will I need an umbrella?"
                placeholderTextColor="#78908b"
                style={styles.chatInput}
                onSubmitEditing={askWeather}
                returnKeyType="send"
              />
              <Pressable
                style={[styles.voiceButton, listening && styles.listening]}
                onPress={toggleVoice}
              >
                <Text>{listening ? "■" : "🎙"}</Text>
              </Pressable>
              <Pressable style={styles.sendButton} onPress={askWeather}>
                <Text style={styles.primaryText}>↑</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.status}>{status}</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={Boolean(authMode)}
        transparent
        animationType="slide"
        onRequestClose={() => setAuthMode(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Pressable onPress={() => setAuthMode(null)}>
              <Text style={styles.close}>×</Text>
            </Pressable>
            <Text style={styles.eyebrow}>WEATHERGPT ACCOUNT</Text>
            <Text style={styles.cardTitle}>
              {authMode === "signin" ? "Welcome back" : "Create your account"}
            </Text>
            {authMode === "signup" && (
              <TextInput
                placeholder="Name"
                placeholderTextColor="#78908b"
                style={styles.authInput}
                value={authForm.name}
                onChangeText={(name) => setAuthForm({ ...authForm, name })}
              />
            )}
            <TextInput
              placeholder="Email"
              placeholderTextColor="#78908b"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.authInput}
              value={authForm.email}
              onChangeText={(email) => setAuthForm({ ...authForm, email })}
            />
            <TextInput
              placeholder="Password (8+ characters)"
              placeholderTextColor="#78908b"
              secureTextEntry
              style={styles.authInput}
              value={authForm.password}
              onChangeText={(password) =>
                setAuthForm({ ...authForm, password })
              }
            />
            <Pressable
              style={styles.primaryButtonLarge}
              onPress={submitAuth}
              disabled={authLoading}
            >
              <Text style={styles.primaryText}>
                {authLoading
                  ? "Please wait…"
                  : authMode === "signin"
                    ? "Sign in"
                    : "Sign up"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setAuthMode(authMode === "signin" ? "signup" : "signin")
              }
            >
              <Text style={styles.locationLink}>
                {authMode === "signin"
                  ? "Need an account? Sign up"
                  : "Already registered? Sign in"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f5ef" },
  container: { padding: 18, gap: 14, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  brand: {
    color: "#163b3b",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -2,
  },
  brandAccent: { color: "#f0a544" },
  subtitle: { color: "#627075", fontSize: 12, marginTop: 2 },
  accountButton: {
    borderColor: "#dae0da",
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  accountText: { color: "#163b3b", fontWeight: "700", fontSize: 12 },
  searchCard: { backgroundColor: "#ffffff", borderRadius: 16, padding: 16 },
  label: { color: "#132126", fontWeight: "700", marginBottom: 9 },
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 11,
  },
  languagePill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: "#f4f5ef",
  },
  languagePillActive: { backgroundColor: "#163b3b" },
  languageText: { color: "#627075", fontSize: 10, fontWeight: "700" },
  languageTextActive: { color: "#ffffff" },
  searchRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    borderColor: "#dae0da",
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    height: 44,
    color: "#132126",
  },
  primaryButton: {
    backgroundColor: "#163b3b",
    borderRadius: 9,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonLarge: {
    backgroundColor: "#163b3b",
    borderRadius: 9,
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  primaryText: { color: "#ffffff", fontWeight: "800" },
  locationLink: {
    color: "#163b3b",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 12,
  },
  suggestion: {
    paddingVertical: 10,
    borderBottomColor: "#edf0ec",
    borderBottomWidth: 1,
  },
  suggestionText: { color: "#132126", fontSize: 13 },
  weatherCard: { backgroundColor: "#163b3b", borderRadius: 18, padding: 20 },
  eyebrow: {
    color: "#789b88",
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  location: { color: "#e8f2e9", fontSize: 20, fontWeight: "700" },
  temperatureRow: { flexDirection: "row", alignItems: "center", marginTop: 20 },
  weatherIcon: { color: "#f0a544", fontSize: 58, marginRight: 15 },
  temperature: {
    color: "#ffffff",
    fontSize: 65,
    fontWeight: "700",
    letterSpacing: -5,
  },
  unit: { color: "#ffffff", fontSize: 18, marginLeft: 5, marginTop: -28 },
  condition: { color: "#c9d8cd", fontSize: 14 },
  stats: { flexDirection: "row", gap: 8, marginTop: 23 },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,.08)",
    borderRadius: 9,
    padding: 10,
  },
  statLabel: { color: "#b4c8b9", fontSize: 9, letterSpacing: 1 },
  statValue: {
    color: "#ffffff",
    fontWeight: "700",
    marginTop: 5,
    fontSize: 12,
  },
  card: { backgroundColor: "#ffffff", borderRadius: 16, padding: 16 },
  chatCard: { backgroundColor: "#f4e5c8", borderRadius: 16, padding: 16 },
  cardTitle: {
    color: "#132126",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 8,
  },
  forecastRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    borderBottomColor: "#edf0ec",
    borderBottomWidth: 1,
  },
  forecastDate: { width: 42, fontWeight: "700", color: "#132126" },
  forecastCondition: { flex: 1, color: "#627075", fontSize: 12 },
  forecastRange: { color: "#132126", fontSize: 11 },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    color: "#dc704f",
    backgroundColor: "#fbe9e2",
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontWeight: "700",
  },
  alert: {
    borderBottomColor: "#edf0ec",
    borderBottomWidth: 1,
    paddingVertical: 11,
  },
  alertTitle: { color: "#132126", fontWeight: "800" },
  alertMessage: {
    color: "#627075",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  alertMeta: {
    color: "#7b8a7f",
    fontSize: 10,
    textTransform: "uppercase",
    marginTop: 5,
  },
  muted: { color: "#627075", fontSize: 12, lineHeight: 17 },
  messages: { gap: 8, marginVertical: 14 },
  message: { padding: 10, borderRadius: 11, maxWidth: "90%" },
  userMessage: { alignSelf: "flex-end", backgroundColor: "#163b3b" },
  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,.7)",
  },
  userText: { color: "#ffffff", lineHeight: 19 },
  assistantText: { color: "#132126", lineHeight: 19 },
  chatRow: { flexDirection: "row", gap: 7, alignItems: "center" },
  chatInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,.8)",
    borderColor: "rgba(22,59,59,.2)",
    borderWidth: 1,
    borderRadius: 9,
    height: 44,
    paddingHorizontal: 11,
    color: "#132126",
  },
  voiceButton: {
    height: 44,
    width: 44,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  listening: { backgroundColor: "#dc704f" },
  sendButton: {
    height: 44,
    width: 44,
    borderRadius: 9,
    backgroundColor: "#163b3b",
    alignItems: "center",
    justifyContent: "center",
  },
  status: { color: "#627075", textAlign: "center", fontSize: 11 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(12,30,30,.52)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    gap: 9,
  },
  close: { alignSelf: "flex-end", fontSize: 27, color: "#627075" },
  authInput: {
    borderColor: "#dae0da",
    borderWidth: 1,
    borderRadius: 9,
    height: 45,
    paddingHorizontal: 12,
    color: "#132126",
    marginTop: 5,
  },
});
