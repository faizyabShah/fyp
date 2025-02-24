import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function parseLatLngString(str) {
  return str
    .replace(/LatLng\(/g, "")
    .split("),")
    .map((chunk) => {
      const cleaned = chunk.replace(/\)/g, "").trim();
      const [latStr, lngStr] = cleaned.split(",").map((s) => s.trim());
      return [parseFloat(latStr), parseFloat(lngStr)];
    });
}

// This component automatically fits the view to the polygon coords
const FitPolygonBounds = ({ coordinates }) => {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds);
    }
  }, [coordinates, map]);

  return null;
};

// This component toggles scrollWheelZoom on mouse enter/leave
const HoverScrollEnable = () => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    function handleMouseEnter() {
      map.scrollWheelZoom.enable(); // Turn on zoom when hovered
    }
    function handleMouseLeave() {
      map.scrollWheelZoom.disable(); // Turn off zoom when not hovered
    }

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    // Cleanup
    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [map]);

  return null;
};

const ReadOnlyMap = ({ selectedField }) => {
  const [polygonCoords, setPolygonCoords] = useState([]);

  useEffect(() => {
    if (selectedField?.coordinates) {
      setPolygonCoords(parseLatLngString(selectedField.coordinates));
    } else {
      setPolygonCoords([]);
    }
  }, [selectedField]);

  return (
    <MapContainer
      center={[0, 0]}
      zoom={2}
      style={{ height: "400px", width: "100%" }}
      scrollWheelZoom={false} // disabled by default
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Enables scroll wheel zoom only on hover */}
      <HoverScrollEnable />

      <FitPolygonBounds coordinates={polygonCoords} />

      {polygonCoords.length > 0 && (
        <Polygon pathOptions={{ color: "blue" }} positions={polygonCoords} />
      )}
    </MapContainer>
  );
};

export default ReadOnlyMap;
