import { ArrowLeft } from "lucide-react";
import ForecastCharts from "../components/ForecastCharts";
import { translateCondition } from "../i18n";

function ForecastPage({ forecast = [], hourly = [], location, labels, language, onBack }) {
  return (
    <main className="dashboard forecast-page">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {labels.backDashboard}</button>
      <div className="page-heading"><span>{labels.weatherForecast}</span><h1>{labels.forecastTitle}</h1><p>{labels.forecastSubtitle(location)}</p></div>

      <div className="forecast-summary-grid">
        {forecast.map((day) => (
          <div className="forecast-summary" key={day.date}>
            <strong>{day.day}</strong><span>{day.date}</span><span className="summary-condition">{day.condition || translateCondition(day.conditionRaw, language)}</span>
            <b>{day.high}° <small>{day.low}°</small></b><em>{day.rainProbability}%</em>
          </div>
        ))}
      </div>

      <ForecastCharts forecast={forecast} hourly={hourly} labels={labels} language={language} expanded />
    </main>
  );
}

export default ForecastPage;
