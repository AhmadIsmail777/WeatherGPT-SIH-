"""Small, provider-independent helper functions."""


def location_label(latitude: float, longitude: float) -> str:
    """Return a neutral coordinate label until reverse geocoding is configured."""

    return f"{latitude:.4f}, {longitude:.4f}"
