import { useState } from "react";
import { CloudSun, Moon, Sun, Bell, UserCircle } from "lucide-react";
import WeatherAlerts from "./WeatherAlerts";

function Navbar({
darkMode,
setDarkMode,
  alerts = [],
  location = "Bhubaneswar",
  labels = {},
language = "en",
languages = [],
  onLanguageChange,
  activeView = "dashboard",
  onNavigate,
  authUser,
onAuth,
onSignOut,
}) {

const [showAlerts, setShowAlerts] = useState(false);
const [dismissedAlertKey, setDismissedAlertKey] = useState(null);

const alertKey = `${location}-${alerts
.map((alert) => alert.title || alert.description || "")
.join("|")}`;

const autoShowAlert =
alerts.length > 0 &&
dismissedAlertKey !== alertKey;

const popupOpen = showAlerts || autoShowAlert;

function handleAlertClick() {
setShowAlerts((previous) => !previous);

if (dismissedAlertKey === alertKey) {
setDismissedAlertKey(null);
}
}

function closeAlerts() {
setShowAlerts(false);
setDismissedAlertKey(alertKey);
}

return (
<nav className="navbar">

<div className="brand">

<div className="brand-icon">
<CloudSun size={26} />
</div>

<div>
<h2>WeatherGPT</h2>
<span>{labels.brandTag}</span>
</div>

</div>

<div className="nav-actions">

<div className="nav-tabs" role="navigation" aria-label="Primary navigation">
<button className={activeView === "dashboard" ? "nav-tab active" : "nav-tab"} type="button" onClick={() => onNavigate("dashboard")}>{labels.dashboard}</button>
<button className={activeView === "forecast" ? "nav-tab active" : "nav-tab"} type="button" onClick={() => onNavigate("forecast")}>{labels.forecastTrends}</button>
</div>

<button
className="icon-button"
type="button"
onClick={() => setDarkMode(!darkMode)}
>
{darkMode ? <Sun size={20} /> : <Moon size={20} />}
</button>

<div className="alerts-wrapper">

<button
className="icon-button alerts-button"
type="button"
onClick={handleAlertClick}
>
<Bell size={20} />

{alerts.length > 0 && (
<span className="alert-dot"></span>
)}

</button>

{popupOpen && (
<WeatherAlerts
alerts={alerts}
location={location}
labels={labels}
onClose={closeAlerts}
/>
)}

</div>

<select className="language-select" aria-label={labels.language || "Language"} value={language} onChange={(event) => onLanguageChange(event.target.value)}>{languages.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select>
<button className="profile-button" type="button" onClick={authUser ? onSignOut : onAuth} title={authUser ? labels.signOut : labels.signIn}><UserCircle size={22} /><span>{authUser ? labels.signOut : labels.signIn}</span></button>

</div>

</nav>
);
}

export default Navbar;
