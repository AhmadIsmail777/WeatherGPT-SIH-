import { Cloud, CloudLightning, CloudRain, CloudSun, Droplets, Eye, Gauge, Snowflake, Sun, Sunrise, Sunset, Wind } from "lucide-react";

function WeatherIcon({ condition }) {
  const value = condition?.toLowerCase() || "";
  if (value.includes("thunder")) return <CloudLightning size={54} />;
  if (value.includes("rain") || value.includes("drizzle")) return <CloudRain size={54} />;
  if (value.includes("snow")) return <Snowflake size={54} />;
  if (value.includes("cloud")) return <CloudSun size={54} />;
  if (value.includes("clear") || value.includes("sun")) return <Sun size={54} />;
  return <Cloud size={54} />;
}

function CurrentWeather({ weather, details = {}, labels }) {
  const items = [
    { label: labels.feelsLike, value: weather?.feelsLike, suffix: "°", icon: Sun },
    { label: labels.humidity, value: weather?.humidity, suffix: "%", icon: Droplets },
    { label: labels.wind, value: weather?.wind, suffix: " km/h", icon: Wind },
    { label: labels.rainChance, value: weather?.rainProbability, suffix: "%", icon: CloudRain },
    { label: labels.visibility, value: details.visibility, suffix: "", icon: Eye },
    { label: labels.pressure, value: details.pressure, suffix: " hPa", icon: Gauge },
    { label: labels.uvIndex, value: details.uvIndex, suffix: "", icon: Sun },
    { label: labels.sunrise, value: details.sunrise, suffix: "", icon: Sunrise },
    { label: labels.sunset, value: details.sunset, suffix: "", icon: Sunset },
  ];

  return (
    <section className="current-weather">
      <div className="weather-top">
        <div>
          <span className="weather-label">{labels.currentWeather}</span>
          <h2>{weather?.location || "—"}</h2>
        </div>
        <div className="weather-icon"><WeatherIcon condition={weather?.conditionRaw || weather?.condition} /></div>
      </div>

      <div className="temperature">{weather?.temperature ?? "—"}{weather?.temperature != null && "°"}</div>
      <div className="condition">{weather?.condition || "—"}</div>

      <div className="current-detail-grid">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div className="current-detail-item" key={item.label}>
              <Icon size={15} />
              <span>{item.label}</span>
              <strong>{item.value ?? "—"}{item.value != null && item.suffix}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default CurrentWeather;
