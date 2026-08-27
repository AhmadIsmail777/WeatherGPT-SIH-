import { Cloud, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from "lucide-react";
import ForecastCharts from "./ForecastCharts";
import { translateCondition } from "../i18n";

function ForecastIcon({ condition, size = 28 }) {
  const value = condition?.toLowerCase() || "";
  if (value.includes("rain") || value.includes("drizzle")) return <CloudRain size={size} />;
  if (value.includes("thunder") || value.includes("storm")) return <CloudLightning size={size} />;
  if (value.includes("snow")) return <Snowflake size={size} />;
  if (value.includes("cloud")) return <CloudSun size={size} />;
  if (value.includes("clear") || value.includes("sun")) return <Sun size={size} />;
  return <Cloud size={size} />;
}

function Forecast({ forecast = [], hourly = [], labels, language = "en" }) {
  return (
    <section className="forecast-card">
      <div className="section-heading">
        <span>{labels.weatherForecast}</span>
        <h2>{labels.sevenDayForecast}</h2>
      </div>

      {forecast.length === 0 ? <div className="forecast-empty">{labels.noForecast}</div> : (
        <div className="forecast-list">
          {forecast.map((day, index) => (
            <div className="forecast-day" key={day.date || index}>
              <div className="forecast-date"><strong>{day.day || "—"}</strong><span>{day.date || "—"}</span></div>
              <div className="forecast-condition"><div className="forecast-icon"><ForecastIcon condition={day.conditionRaw || day.condition} /></div><span>{day.condition || translateCondition(day.conditionRaw, language)}</span></div>
              <div className="forecast-temperature"><strong>{day.high != null ? `${day.high}°` : "—"}</strong><span>{day.low != null ? `${day.low}°` : "—"}</span></div>
            </div>
          ))}
        </div>
      )}

      <ForecastCharts forecast={forecast} hourly={hourly} labels={labels} language={language} />
    </section>
  );
}

export default Forecast;
