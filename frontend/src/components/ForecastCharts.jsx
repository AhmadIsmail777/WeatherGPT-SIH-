function safeLocale(language) {
  return language === "en" ? "en-IN" : language;
}

function chartPoints(values, width, height, padding, minValue, maxValue) {
  const range = Math.max(maxValue - minValue, 1);
  return values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
    const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");
}

function LineChart({ title, values, labels, color = "#2878d4", unit = "°" }) {
  if (!values.length) return <div className="chart-empty">{labels.hourlyUnavailable}</div>;
  const width = 760;
  const height = 230;
  const padding = 28;
  const min = Math.floor(Math.min(...values.map((item) => item.value)) - 2);
  const max = Math.ceil(Math.max(...values.map((item) => item.value)) + 2);
  const points = chartPoints(values.map((item) => item.value), width, height, padding, min, max);

  return (
    <div className="chart-panel">
      <div className="chart-heading"><h3>{title}</h3><span>{unit}</span></div>
      <svg className="forecast-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {[0, 1, 2, 3].map((line) => {
          const y = padding + (line * (height - padding * 2)) / 3;
          return <line key={line} x1={padding} x2={width - padding} y1={y} y2={y} className="chart-grid-line" />;
        })}
        <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((item, index) => {
          const [x, y] = points.split(" ")[index].split(",");
          return <g key={`${item.label}-${index}`}><circle cx={x} cy={y} r="5" fill={color} /><title>{`${item.label}: ${item.value}${unit}`}</title></g>;
        })}
      </svg>
      <div className="chart-labels">{values.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}</div>
    </div>
  );
}

function ForecastCharts({ forecast = [], hourly = [], labels, language = "en", expanded = false }) {
  const locale = safeLocale(language);
  const dailyTemperature = forecast.map((day) => ({ label: day.day, value: Number(day.high) || 0 }));
  const dailyRain = forecast.map((day) => ({ label: day.day, value: Number(day.rainProbability) || 0 }));
  const hourlyTemperature = hourly.slice(0, expanded ? 48 : 24).filter((hour) => hour.temperature != null).map((hour) => ({
    label: new Date(hour.time).toLocaleTimeString(locale, { hour: "numeric" }), value: Number(hour.temperature),
  }));
  const hourlyRain = hourly.slice(0, expanded ? 48 : 24).filter((hour) => hour.rainProbability != null).map((hour) => ({
    label: new Date(hour.time).toLocaleTimeString(locale, { hour: "numeric" }), value: Number(hour.rainProbability),
  }));

  return (
    <div className={`forecast-charts ${expanded ? "forecast-charts-expanded" : ""}`}>
      <div className="chart-grid">
        <LineChart title={labels.dailyTemperature} values={dailyTemperature} labels={labels} />
        <LineChart title={labels.rainProbability} values={dailyRain} labels={labels} color="#35a77a" unit="%" />
        <LineChart title={`${labels.next24Hours} · ${labels.hourlyTemperature}`} values={hourlyTemperature} labels={labels} />
        <LineChart title={`${labels.next24Hours} · ${labels.hourlyRain}`} values={hourlyRain} labels={labels} color="#35a77a" unit="%" />
      </div>
    </div>
  );
}

export default ForecastCharts;
