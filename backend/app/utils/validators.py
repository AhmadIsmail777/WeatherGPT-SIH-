"""Validation helpers shared outside Pydantic schemas."""


def has_coordinate_pair(latitude: float | None, longitude: float | None) -> bool:
    """Return whether both coordinates are present."""

    return latitude is not None and longitude is not None
