import { AlertTriangle, Bell, CheckCircle, X } from "lucide-react";

function WeatherAlerts({
alerts = [],
location,
labels = {},
onClose
}) {

return (
<div className="alerts-popup">

<div className="alerts-popup-header">

<div className="alerts-popup-title">

<div className="alerts-bell">
<Bell size={18} />
</div>

<div>
<h3>{labels.alerts || "Weather Alerts"}</h3>
<span>{location}</span>
</div>

</div>

<button
className="alerts-close"
type="button"
onClick={onClose}
>
<X size={18} />
</button>

</div>

<div className="alerts-popup-body">

{alerts.length === 0 ? (

<div className="no-alerts">

<CheckCircle size={24} />

<div>

<strong>{labels.noAlerts || "No active weather alerts"}</strong>

<p>
{labels.noAlertsFor ? labels.noAlertsFor(location) : `There are currently no weather alerts for ${location}.`}
</p>

</div>

</div>

) : (

<div className="alerts-list">

{alerts.map((alert, index) => (

<div
className="alert-item"
key={index}
>

<div className="alert-icon">
<AlertTriangle size={20} />
</div>

<div className="alert-content">

<strong>{alert.title || labels.alertFallbackTitle || "Weather Alert"}</strong>

<p>
{alert.message || alert.description || labels.alertFallbackMessage || "Weather alert for this location."}
</p>

{(alert.expires_at || alert.validUntil) && (
<span>
{alert.severity ? `${alert.severity} · ` : ""}{alert.source || labels.alertSafetySource || "WeatherGPT safety rules"}{alert.expires_at || alert.validUntil ? ` · ${labels.validUntil || "Valid until"}: ${alert.expires_at || alert.validUntil}` : ""}
</span>
)}

</div>

</div>

))}

</div>

)}

</div>

</div>
);
}

export default WeatherAlerts;
