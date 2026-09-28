# WeatherGPT — A Full-Stack Weather Intelligence Platform

WeatherGPT is a comprehensive MERN (MongoDB, Express, React, Node.js) application that combines real-time weather intelligence with conversational AI to deliver personalized weather insights for Indian users. Built for the Smart India Hackathon (SIH), it provides a seamless experience across web and mobile platforms.

## 🌟 Key Features

### 🤖 AI-Powered Conversations
- **Natural Language Processing**: Ask weather-related questions in plain English or multiple Indian languages
- **Intelligent Context**: Convert non-weather questions into actionable weather insights for your location
- **Voice I/O**: Browser speech recognition for hands-free input; text-to-speech for responses
- **Gemini Integration**: Optional Google Gemini API for enhanced conversational capabilities

### 🌍 Weather Intelligence
- **Real-Time Data**: Live weather updates via Open-Meteo API
- **Multi-Location Support**: Search across India with smart suggestions and typo tolerance
- **Comprehensive Alerts**: Combines official IMD (Indian Meteorological Department) CAP/RSS feeds with AI-generated forecast safety alerts
- **Location Services**: Reverse geocoding to identify nearby weather zones
- **Multi-Language Support**: Multilingual weather experience tailored for Indian users

### 🔐 User Management
- **JWT Authentication**: Secure token-based authentication
- **User Profiles**: Personalized experience with saved preferences
- **Persistent Conversations**: MongoDB-backed chat history
- **Alert Management**: Subscribe to location-specific weather alerts

### 📱 Multi-Platform
- **Web Dashboard**: React 19 + Vite responsive interface
- **Mobile Client**: Expo React Native application for iOS/Android
- **Consistent API**: Unified `/api/v1` contract across platforms

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express 5 |
| **Database** | MongoDB + Mongoose |
| **Frontend** | React 19 + Vite |
| **Mobile** | Expo React Native |
| **Auth** | JWT (JSON Web Tokens) |
| **Weather Data** | Open-Meteo API |
| **Alerts** | IMD CAP/RSS Feeds |
| **AI** | Google Gemini (optional) |
| **Styling** | CSS (24.1% of codebase) |

## 📋 Project Structure

```
WeatherGPT-SIH-/
├── backend/               # Express API server
│   ├── models/           # Mongoose schemas (users, conversations, alerts)
│   ├── routes/           # API endpoints (/api/v1/*)
│   ├── middleware/       # Auth, CORS, error handling
│   ├── services/         # Business logic (weather, alerts, chat)
│   ├── .env.example      # Environment configuration template
│   └── package.json
├── frontend/             # React + Vite dashboard
│   ├── src/
│   ├── public/
│   └── package.json
├── mobile/              # Expo React Native app
│   ├── app/
│   ├── components/
│   └── package.json
├── .env.example         # Root environment template
├── package.json         # Workspace configuration
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **MongoDB** (local or Atlas URI)
- Optional: **Gemini API Key** for AI features
- Optional: **IMD Alerts Feed** URL

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/AhmadIsmail777/WeatherGPT-SIH-.git
   cd WeatherGPT-SIH-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Copy the example template
   cp backend/.env.example backend/.env
   
   # Edit backend/.env with your credentials:
   ```

4. **Environment Configuration**

   Create/update `backend/.env`:

   ```env
   # MongoDB Configuration
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/weathergpt

   # JWT Security
   JWT_SECRET_KEY=your-secret-key-here

   # CORS Settings
   CORS_ORIGINS=http://localhost:5173,http://localhost:8081

   # Weather Data Provider
   WEATHER_PROVIDER=open-meteo    # or 'mock' for offline testing

   # Google Gemini (optional)
   GEMINI_API_KEY=your-api-key
   GEMINI_MODEL=gemini-1.5-flash

   # India Alerts
   INDIA_ALERTS_URL=https://mausam.imd.gov.in/alerts.rss

   # Alert Cache Duration (milliseconds)
   ALERT_REFRESH_MS=300000    # 5 minutes default

   # MongoDB Requirement (set to false for development fallback)
   REQUIRE_MONGO=false
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

   - **Frontend** (React): http://localhost:5173
   - **Backend** (API): http://localhost:5000
   - **Mobile** (Expo): Run with Expo Go app

### Development Without MongoDB

If MongoDB is unavailable during development, the API automatically switches to an in-memory fallback store. This allows testing:
- Weather endpoints (deterministic data)
- Authentication flow
- Chat functionality (basic)

To enforce MongoDB availability, set `REQUIRE_MONGO=true` in `.env`.

## 🔌 API Endpoints

All endpoints follow the `/api/v1` contract:

### Weather
- `GET /weather/current` - Current weather for a location
- `GET /weather/forecast` - 7-day forecast with hourly details

### Location Services
- `GET /location/search?query=...` - Search Indian locations with typo tolerance
- `GET /location/reverse-geocode?lat=...&lon=...` - Get location from coordinates

### Alerts
- `GET /alerts?latitude=...&longitude=...&location=...` - Get location-specific alerts (combines IMD + AI safety alerts)
- `GET /alerts/:alertId` - Fetch individual alert details

### Authentication
- `POST /users/register` - Create new account
- `POST /users/login` - Login and receive JWT
- `GET /users/me` - Fetch current user profile (requires auth)

### Chat
- `POST /chat` - Send message, receive AI-powered response with weather context

## 🧪 Testing & Build

### Run Tests
```bash
npm test
```
Tests cover:
- API contract validation
- Authentication flows
- Weather data parsing
- Alert aggregation

### Build for Production
```bash
npm run build
```
Generates optimized builds for:
- React frontend (Vite)
- Node.js backend
- React Native mobile

### Mobile Development
```bash
npm run mobile
```
Launches Expo Metro bundler for React Native testing.

## 🌐 Multilingual & Regional Features

WeatherGPT is optimized for India:
- **Language Support**: English + regional Indian languages
- **Location Database**: Comprehensive Indian city/district coverage
- **Alert System**: Integrates with Indian Meteorological Department (IMD)
- **Timezone Handling**: IST (UTC+5:30) by default
- **Coordinate Boundaries**: Enforces India-only location searches

## 🔒 Security Features

- **JWT Tokens**: Secure, stateless authentication
- **CORS Protection**: Configurable allowed origins
- **Input Validation**: Location and coordinate validation
- **Rate Limiting**: Built-in API request throttling (configurable)
- **Environment Secrets**: Never commit `.env` files

## 📊 Data Sources

| Source | Purpose | Status |
|--------|---------|--------|
| **Open-Meteo** | Live weather data | Recommended |
| **IMD CAP/RSS** | Official India weather alerts | Production |
| **Google Gemini** | Conversational AI | Optional |
| **Mock Provider** | Offline testing | Development only |

## 🤝 Architecture Highlights

### Backend
- **Express 5** with async/await request handlers
- **Mongoose** ODM for type-safe MongoDB queries
- **JWT Middleware** for protected routes
- **In-Memory Fallback** for graceful MongoDB unavailability
- **Alert Caching** (5-min TTL by default)

### Frontend
- **React 19** with hooks
- **Vite** for lightning-fast HMR and builds
- **Responsive Design** CSS for mobile/tablet/desktop
- **Voice Integration** via Web Speech API
- **Real-time Updates** via websocket-ready API

### Mobile
- **Expo** for cross-platform React Native
- **Same API Client** as web frontend
- **Native Device Features**: GPS, microphone, speaker

## 📦 Environment Defaults

If `.env` is missing, the API will:
- Attempt to connect to `mongodb://localhost:27017/weathergpt`
- Use `mock` weather provider (returns test data)
- Allow all CORS origins (not recommended for production)
- Skip Gemini integration (basic chat only)

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB is running
mongod --version

# Use local fallback (dev only)
REQUIRE_MONGO=false npm run dev
```

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or use different port
PORT=5001 npm run dev
```

### Missing API Keys
- **Gemini**: Chat works without it; responses use basic logic
- **IMD Alerts**: Uses cache if feed is unreachable
- **Open-Meteo**: Falls back to `mock` provider if configured

## 📖 Documentation

- **Backend** → See `backend/README.md` for API details
- **Frontend** → See `frontend/README.md` for component architecture
- **Mobile** → See `mobile/README.md` for setup instructions

## 🎯 Future Enhancements

- [ ] Push notifications for weather alerts
- [ ] Integration with weather IoT devices
- [ ] Predictive crop advisory for farmers
- [ ] Hyperlocal weather (neighborhood-level)
- [ ] Multi-user alert subscriptions
- [ ] Weather impact scoring for events

## 📝 License

This project is part of Smart India Hackathon (SIH). Check `LICENSE` file for details.

## 👥 Contributors

Built for Smart India Hackathon by Ahmad Ismail and team.

## 📞 Support

For issues, feature requests, or questions:
- GitHub Issues: [WeatherGPT Issues](https://github.com/AhmadIsmail777/WeatherGPT-SIH-/issues)
- Email: Contact through GitHub profile

---

**Made with ☀️ 🌧️ ❄️ for India's Weather Intelligence**
