import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { getFeatureStateName, getMetricValue, getTerritoryFill, normalizeStateName } from './territoryUtils.js';
import { PopTooltip } from './PopTooltip.jsx';
import { markerColor } from './format.js';

function FitToIndia({ selectedBounds, indiaBounds }) {
  const map = useMap();

  useEffect(() => {
    if (selectedBounds) {
      map.fitBounds(selectedBounds, { padding: [24, 24], maxZoom: 7 });
      return;
    }
    if (indiaBounds?.isValid()) {
      map.fitBounds(indiaBounds, { padding: [22, 22], maxZoom: 5 });
    }
  }, [map, selectedBounds, indiaBounds]);

  return null;
}

function FloatingMapInfoCard({ anchor, children }) {
  const map = useMap();
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (!anchor) {
      setPosition(null);
      return;
    }

    function updatePosition() {
      const point = map.latLngToContainerPoint(anchor);
      setPosition({ left: point.x, top: point.y });
    }

    updatePosition();
    map.on('zoom move resize', updatePosition);
    return () => {
      map.off('zoom move resize', updatePosition);
    };
  }, [anchor, map]);

  if (!anchor || !position) return null;

  return createPortal(
    <div className="map-floating-info-card" style={position}>
      {children}
    </div>,
    map.getContainer()
  );
}

export function StateTerritoryMap({
  activeLayer,
  states,
  selectedStateKey,
  showPopMarkers,
  popMarkers,
  selectedPop,
  onSelectState,
  onHoverState,
  onClickPop,
  onHoverPop,
  infoPanel,
  infoAnchor
}) {
  const [geoJson, setGeoJson] = useState(null);
  const [selectedBounds, setSelectedBounds] = useState(null);
  const [indiaBounds, setIndiaBounds] = useState(null);
  const layerRefs = useRef(new Map());

  useEffect(() => {
    let active = true;
    fetch('/geo/india-states.geojson')
      .then((response) => response.json())
      .then((data) => {
        if (active) {
          setGeoJson(data);
          setIndiaBounds(L.geoJSON(data).getBounds());
        }
      })
      .catch(() => {
        if (active) {
          setGeoJson({ type: 'FeatureCollection', features: [] });
          setIndiaBounds(null);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const stateByKey = useMemo(() => {
    return new Map(states.map((state) => [normalizeStateName(state.state_key || state.state), state]));
  }, [states]);

  const maxMetric = useMemo(() => {
    return Math.max(0, ...states.map((state) => getMetricValue(state, activeLayer)));
  }, [activeLayer, states]);

  const styleFeature = (feature) => {
    const key = normalizeStateName(getFeatureStateName(feature));
    const state = stateByKey.get(key);
    const metric = getMetricValue(state, activeLayer);
    const isSelected = selectedStateKey === key;

    return {
      color: isSelected ? '#0f172a' : '#1d4ed8',
      weight: isSelected ? 2.8 : 1.1,
      opacity: 0.88,
      fillColor: getTerritoryFill(metric, maxMetric, activeLayer),
      fillOpacity: isSelected ? 0.74 : 0.52
    };
  };

  const onEachFeature = (feature, layer) => {
    const featureName = getFeatureStateName(feature);
    const key = normalizeStateName(featureName);
    const metricState = stateByKey.get(key) || { state: featureName, riskLevel: 'normal' };
    layerRefs.current.set(key, layer);

    layer.on({
      mouseover: () => {
        layer.setStyle({ weight: 2.4, fillOpacity: 0.72 });
        layer.bringToFront();
        onHoverState?.(metricState, layer.getBounds().getCenter());
      },
      mouseout: () => {
        layer.setStyle(styleFeature(feature));
        if (!selectedStateKey) onHoverState?.(null, null);
      },
      click: () => {
        const bounds = layer.getBounds();
        setSelectedBounds(bounds);
        onSelectState(metricState, key, bounds.getCenter());
      }
    });

  };

  useEffect(() => {
    if (!selectedStateKey) {
      setSelectedBounds(null);
      return;
    }
    const selectedLayer = layerRefs.current.get(selectedStateKey);
    if (selectedLayer) {
      setSelectedBounds(selectedLayer.getBounds());
    }
  }, [selectedStateKey]);

  const visiblePopMarkers = useMemo(() => {
    if (!selectedStateKey) return popMarkers;
    return popMarkers.filter((marker) => normalizeStateName(marker.state) === selectedStateKey);
  }, [popMarkers, selectedStateKey]);

  return (
    <MapContainer center={[22.9, 79.8]} zoom={5} minZoom={4} maxZoom={9} scrollWheelZoom className="india-map territory-map">
      <FitToIndia selectedBounds={selectedBounds} indiaBounds={indiaBounds} />
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {geoJson && (
        <GeoJSON
          key={`${activeLayer}-${selectedStateKey || 'india'}-${states.length}`}
          data={geoJson}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      )}
      {showPopMarkers && visiblePopMarkers.map((marker) => {
        const isSelected =
          selectedPop?.service_area_name === marker.service_area_name &&
          normalizeStateName(selectedPop?.state) === normalizeStateName(marker.state);
        const base = markerColor(marker.riskLevel);
        return (
          <CircleMarker
            key={`${marker.service_area_name}-${marker.state}`}
            center={[Number(marker.latitude), Number(marker.longitude)]}
            radius={isSelected ? 14 : Math.max(5, Math.min(12, Number(marker.offline_sites || 0) / 3))}
            eventHandlers={{
              mouseover: () => onHoverPop?.(marker),
              click: () => onClickPop?.(marker)
            }}
            pathOptions={{
              color: isSelected ? '#0f172a' : base,
              fillColor: isSelected ? '#f97316' : base,
              fillOpacity: isSelected ? 0.95 : 0.72,
              weight: isSelected ? 3 : 1.8
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <PopTooltip marker={marker} />
            </Tooltip>
          </CircleMarker>
        );
      })}
      <FloatingMapInfoCard anchor={infoAnchor}>{infoPanel}</FloatingMapInfoCard>
    </MapContainer>
  );
}
