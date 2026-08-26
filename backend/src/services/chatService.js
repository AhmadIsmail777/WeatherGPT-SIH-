import config from "../config.js";
import { getCurrentWeather, getForecast, WeatherServiceUnavailable } from "./weatherService.js";

const languageNames = { en: "English", or: "Odia", hi: "Hindi", bn: "Bengali", mr: "Marathi", te: "Telugu" };

function buildPrompt(message, language, context) {
  return `You are WeatherGPT, a concise and practical weather guide for Indian locations. Reply only in ${languageNames[language] || "English"}. Use only this verified weather data and do not invent measurements, alerts, forecasts, or locations.

Understand the user's intent and answer it naturally, like a helpful person. Use the current conditions for immediate questions and the forecast for future questions. For questions about travel, exercise, clothing, health comfort, school, work, food, events, or any other activity, explain what the weather means for that activity and give a practical recommendation. If the question is unrelated to weather, gently connect it to a weather decision instead of answering unrelated general knowledge or giving a fixed refusal. Mention uncertainty when the data is insufficient. Keep the answer concise but complete.

Verified weather context:
${JSON.stringify(context, null, 2)}

User question:
${message}`;
}

async function generateWithGemini(prompt) {
  if (!config.geminiApiKey) throw new Error("Gemini is not configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`;
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!response.ok) throw new Error("Gemini request failed");
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

function fallback(weather, forecast, message, language) {
  if (!weather) return "I do not have verified weather data for a location yet. Please provide a city or coordinates.";
  const report = `At ${weather.location}, it is ${weather.temperature} °C with ${weather.weather_condition.toLowerCase()}. Humidity is ${weather.humidity}% and the rain probability is ${weather.rain_probability ?? "unavailable"}%.`;
  const question = String(message).toLowerCase();
  const days = forecast?.forecast || [];
  const tomorrow = days[1] || days[0];
  if (/(tomorrow|next day|forecast|later|weekend|આସନ୍ତା|कल|আগামী|उद्या|రేపు)/i.test(question) && tomorrow) {
    return `For ${tomorrow.date}, expect ${tomorrow.weather_condition.toLowerCase()} with temperatures from ${tomorrow.temperature_min}°C to ${tomorrow.temperature_max}°C and about ${tomorrow.rain_probability}% rain probability.`;
  }
  if (/(umbrella|rain|picnic|outdoor event|ବର୍ଷା|ଛତା|बारिश|छाता|বৃষ্টি|ছাতা|पाऊस|छत्री|వర్షం|గొడుగు)/i.test(question)) {
    const probability = weather.rain_probability;
    return probability >= 60
      ? `Rain is fairly likely at ${weather.location} (${probability}%). Carry an umbrella and keep outdoor plans flexible.`
      : `Rain is not very likely at ${weather.location} (${probability ?? "unavailable"}%). An outdoor plan should be reasonable, but keep a light backup for changing conditions.`;
  }
  if (/(wear|clothes|dress|what should i put on|ପୋଷାକ|कपड़े|পোশাক|कपडे|దుస్తులు)/i.test(question)) {
    if (weather.temperature >= 35) return `It is hot at ${weather.location} (${weather.temperature}°C). Wear light, breathable clothes, use sun protection, and drink water.`;
    if (weather.temperature <= 18) return `It is cool at ${weather.location} (${weather.temperature}°C). A warm layer would be sensible, especially in the morning or evening.`;
    return `The conditions at ${weather.location} are moderate (${weather.temperature}°C). Comfortable, breathable clothing should work; carry rain protection if your plans are outside.`;
  }
  if (/(travel|go out|outside|walk|run|exercise|play|safe|commute|trip|ଭ୍ରମଣ|ବାହାର|यात्रा|बाहर|ভ্রমণ|बाहेर|ప్రయాణం|బయట)/i.test(question)) {
    const risky = weather.rain_probability >= 60 || weather.wind_speed >= 40 || /storm|heavy rain|thunder/i.test(weather.weather_condition);
    return risky
      ? `Outdoor plans at ${weather.location} need caution today: ${weather.weather_condition.toLowerCase()}, ${weather.rain_probability ?? "unavailable"}% rain probability, and winds around ${weather.wind_speed} km/h. Prefer a delay or a sheltered route.`
      : `Outdoor plans at ${weather.location} look reasonable right now: ${weather.weather_condition.toLowerCase()}, ${weather.temperature}°C, and winds around ${weather.wind_speed} km/h. Stay hydrated and check again before leaving.`;
  }
  if (/(wind|हवा|ପବନ|বাতাস|वारा|గాలి)/i.test(question)) return `The wind at ${weather.location} is around ${weather.wind_speed} km/h. That is worth considering for exposed roads, two-wheelers, rooftops, and outdoor events.`;
  if (/(temperature|hot|heat|cold|humid|तापमान|गर्मी|ठंड|ତାପମାତ୍ରା|ଗରମ|ଥଣ୍ଡା|তাপমাত্রা|গরম|ঠান্ডা|तापमान|उष्ण|थंडी|ఉష్ణోగ్రత|వేడి|చలి)/i.test(question)) return report;
  const contextual = {
    en: `For your question, here is the useful weather angle: ${report} I can use these conditions to guide the timing, comfort, and safety of your plans.`,
    hi: `आपके सवाल के लिए मौसम का उपयोगी संदर्भ: ${weather.location} में तापमान ${weather.temperature}°C और मौसम ${weather.weather_condition.toLowerCase()} है। इन्हीं परिस्थितियों के आधार पर मैं आपकी योजना के समय, आराम और सुरक्षा के बारे में सलाह दे सकता हूँ।`,
    or: `ଆପଣଙ୍କ ପ୍ରଶ୍ନ ପାଇଁ ଉପଯୋଗୀ ପାଣିପାଗ ସୂଚନା: ${weather.location} ରେ ତାପମାତ୍ରା ${weather.temperature}°C ଏବଂ ପାଗ ${weather.weather_condition.toLowerCase()}। ଆପଣଙ୍କ ଯୋଜନାର ସମୟ, ଆରାମ ଓ ସୁରକ୍ଷା ବିଷୟରେ ମୁଁ ଏହା ଆଧାରରେ ପରାମର୍ଶ ଦେଇପାରିବି।`,
    bn: `আপনার প্রশ্নের জন্য আবহাওয়ার দরকারি প্রসঙ্গ: ${weather.location}-এ তাপমাত্রা ${weather.temperature}°C এবং আকাশ ${weather.weather_condition.toLowerCase()}। এই তথ্য দিয়ে আপনার পরিকল্পনার সময়, আরাম ও নিরাপত্তা সম্পর্কে পরামর্শ দিতে পারি।`,
    mr: `तुमच्या प्रश्नासाठी हवामानाचा उपयोगी संदर्भ: ${weather.location} येथे तापमान ${weather.temperature}°C असून हवामान ${weather.weather_condition.toLowerCase()} आहे. या माहितीवरून तुमच्या योजनेची वेळ, आराम आणि सुरक्षिततेबद्दल मार्गदर्शन करू शकतो.`,
    te: `మీ ప్రశ్నకు ఉపయోగకరమైన వాతావరణ సందర్భం: ${weather.location}లో ఉష్ణోగ్రత ${weather.temperature}°C, వాతావరణం ${weather.weather_condition.toLowerCase()}గా ఉంది. ఈ సమాచారంతో మీ ప్రణాళికల సమయం, సౌకర్యం మరియు భద్రత గురించి సూచించగలను.`,
  };
  return contextual[language] || contextual.en;
}

export async function generateWeatherResponse(message, latitude, longitude, language = "en") {
  let weather = null;
  let forecast = null;
  if (latitude != null && longitude != null) {
    try {
      [weather, forecast] = await Promise.all([getCurrentWeather(latitude, longitude), getForecast(latitude, longitude, 3)]);
    } catch (error) {
      if (!(error instanceof WeatherServiceUnavailable)) throw error;
      try { weather = await getCurrentWeather(latitude, longitude); } catch { weather = null; }
    }
  }
  try {
    const context = { current: weather, forecast: forecast?.forecast || [] };
    const response = await generateWithGemini(buildPrompt(message, language, context));
    return { response, location: weather?.location || null, language };
  } catch {
    return { response: fallback(weather, forecast, message, language), location: weather?.location || null, language };
  }
}
