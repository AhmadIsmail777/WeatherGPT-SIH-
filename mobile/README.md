# WeatherGPT India mobile app

This is the Expo React Native client for the same Express API used by the web dashboard. It includes India-only location search, similar-location suggestions, current weather, forecasts, live safety alerts, multilingual voice questions, spoken answers, and sign-in/register forms.

## Run

From the repository root:

```bash
npm install
npm run mobile
```

Then scan the Expo QR code with Expo Go for weather and text features. Voice input uses the native speech-recognition config plugin, so use a development build for voice: `npm run android --workspace mobile` or `npm run ios --workspace mobile`. Set `EXPO_PUBLIC_API_URL` to a URL reachable by the phone; `localhost` points to the phone itself, not the computer.

Speech recognition uses native device services and may require an Expo development build when the speech-recognition config plugin is not included in the installed Expo Go client. Text-to-speech is provided by `expo-speech`.
