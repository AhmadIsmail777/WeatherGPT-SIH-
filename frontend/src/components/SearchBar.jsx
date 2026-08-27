import { MapPin, Search } from "lucide-react";

function SearchBar({ location, setLocation, onSearch, loading, suggestions = [], onSelect, onUseCurrentLocation, labels }) {
  return (
    <div className="search-wrap">
      <form className="search-container" onSubmit={(event) => { event.preventDefault(); onSearch(location); }}>
        <MapPin size={20} className="search-icon" />
        <input aria-label={labels.searchPlaceholder} type="text" placeholder={labels.searchPlaceholder} value={location} onChange={(event) => setLocation(event.target.value)} autoComplete="off" />
        <button type="submit" disabled={loading || !location.trim()}><Search size={18} />{loading ? labels.loading : labels.search}</button>
      </form>
      <div className="search-actions"><button type="button" onClick={onUseCurrentLocation} disabled={loading}>⌖ {labels.useMyLocation}</button><span>{labels.indiaOnly}</span></div>
      {suggestions.length > 1 && <div className="location-suggestions" role="listbox" aria-label={labels.similarLocations}>{suggestions.map((suggestion) => <button type="button" role="option" key={`${suggestion.latitude}-${suggestion.longitude}`} onClick={() => onSelect(suggestion)}>{suggestion.location}</button>)}</div>}
    </div>
  );
}

export default SearchBar;
