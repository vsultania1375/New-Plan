import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { CircleMarker, GeoJSON, MapContainer, Pane, TileLayer, Tooltip, useMap } from 'react-leaflet';
import {
  getFeatureStateName,
  getMetricValue,
  getOfflineSeverityColorByPercentage,
  getTerritoryFill,
  normalizeStateName
} from './territoryUtils.js';
import { PopTooltip } from './PopTooltip.jsx';
import { markerColor } from './format.js';

function FitToIndia({ selectedBounds, indiaBounds }) {
  const map = useMap();

  useEffect(() => {
    if (selectedBounds) {
      map.fitBounds(selectedBounds, { padding: [24, 24], maxZoom: 9 });
      return;
    }
    if (indiaBounds?.isValid()) {
      map.fitBounds(indiaBounds, { padding: [22, 22], maxZoom: 5 });
    }
  }, [map, selectedBounds, indiaBounds]);

  return null;
}

function FloatingMapInfoCard({ anchor, bounds, children }) {
  const map = useMap();
  const [position, setPosition] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!anchor) {
      setPosition(null);
      return;
    }

    function updatePosition() {
      const container = map.getContainer();
      const containerWidth = container.clientWidth || 0;
      const containerHeight = container.clientHeight || 0;
      const cardWidth = cardRef.current?.offsetWidth || 292;
      const cardHeight = cardRef.current?.offsetHeight || 330;
      const padding = 12;
      const gap = 14;
      const anchorPoint = map.latLngToContainerPoint(anchor);

      let minX = anchorPoint.x;
      let maxX = anchorPoint.x;
      let minY = anchorPoint.y;
      let maxY = anchorPoint.y;
      let centerY = anchorPoint.y;

      if (bounds?.isValid?.()) {
        const northEast = map.latLngToContainerPoint(bounds.getNorthEast());
        const southWest = map.latLngToContainerPoint(bounds.getSouthWest());
        minX = Math.min(northEast.x, southWest.x);
        maxX = Math.max(northEast.x, southWest.x);
        minY = Math.min(northEast.y, southWest.y);
        maxY = Math.max(northEast.y, southWest.y);
        centerY = map.latLngToContainerPoint(bounds.getCenter()).y;
      }

      const shouldPlaceRight = anchorPoint.x < containerWidth / 2;
      const clampLeft = (value) => Math.max(padding, Math.min(value, containerWidth - cardWidth - padding));
      const clampTop = (value) => Math.max(padding, Math.min(value, containerHeight - cardHeight - padding));
      const candidates = [
        {
          side: 'right',
          preferred: shouldPlaceRight,
          fits: maxX + gap + cardWidth <= containerWidth - padding,
          left: maxX + gap,
          top: centerY - cardHeight / 2
        },
        {
          side: 'left',
          preferred: !shouldPlaceRight,
          fits: minX - cardWidth - gap >= padding,
          left: minX - cardWidth - gap,
          top: centerY - cardHeight / 2
        },
        {
          side: 'bottom',
          preferred: false,
          fits: maxY + gap + cardHeight <= containerHeight - padding,
          left: anchorPoint.x - cardWidth / 2,
          top: maxY + gap
        },
        {
          side: 'top',
          preferred: false,
          fits: minY - cardHeight - gap >= padding,
          left: anchorPoint.x - cardWidth / 2,
          top: minY - cardHeight - gap
        }
      ];

      const chosen =
        candidates.find((candidate) => candidate.preferred && candidate.fits) ||
        candidates.find((candidate) => candidate.fits) ||
        candidates.find((candidate) => candidate.preferred) ||
        candidates[0];

      const left = clampLeft(chosen.left);
      const top = clampTop(chosen.top);

      setPosition({ left, top });
    }

    updatePosition();
    map.on('zoom move resize', updatePosition);
    return () => {
      map.off('zoom move resize', updatePosition);
    };
  }, [anchor, bounds, map]);

  if (!anchor || !position) return null;

  return createPortal(
    <div ref={cardRef} className="map-floating-info-card" style={position}>
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
  serviceAreaTerritories,
  showServiceAreaTerritories = true,
  onSelectState,
  onHoverState,
  onClickPop,
  onHoverPop,
  infoPanel,
  infoAnchor,
  infoBounds
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
    const isStateDrilldown = Boolean(selectedStateKey);

    if (isStateDrilldown) {
      return {
        color: isSelected ? '#0f172a' : '#94a3b8',
        weight: isSelected ? 2.6 : 0.8,
        opacity: isSelected ? 0.86 : 0.24,
        fillColor: isSelected ? '#f8fafc' : '#e5e7eb',
        fillOpacity: isSelected ? 0.1 : 0.045
      };
    }

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
        if (selectedStateKey) {
          layer.setStyle({
            weight: key === selectedStateKey ? 2.8 : 1.1,
            opacity: key === selectedStateKey ? 0.9 : 0.36,
            fillOpacity: key === selectedStateKey ? 0.14 : 0.075
          });
        } else {
          layer.setStyle({ weight: 2.4, fillOpacity: 0.72 });
        }
        layer.bringToFront();
        const bounds = layer.getBounds();
        onHoverState?.(metricState, bounds.getCenter(), bounds);
      },
      mouseout: () => {
        layer.setStyle(styleFeature(feature));
        if (!selectedStateKey) onHoverState?.(null, null);
      },
      click: () => {
        const bounds = layer.getBounds();
        setSelectedBounds(bounds);
        onSelectState(metricState, key, bounds.getCenter(), bounds);
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

  const serviceAreaFeatureCollection = useMemo(() => {
    const features = serviceAreaTerritories?.features || [];
    return { type: 'FeatureCollection', features };
  }, [serviceAreaTerritories]);

  function featureToServiceAreaModel(feature) {
    const properties = feature?.properties || {};
    return {
      service_area_name: properties.service_area_name,
      service_area_code: properties.service_area_code,
      state: properties.state,
      total_mapped_sites: properties.total_sites,
      offline_sites: properties.offline_sites,
      offline_gt_3_days: properties.offline_gt_3_days,
      offline_more_than_5_days: properties.offline_gt_3_days,
      active_tickets: properties.active_tickets,
      avg_ticket_aging: properties.avg_tat,
      ticket_status_counts: properties.ticket_status_counts || {},
      riskLevel: properties.riskLevel || 'normal',
      pincode_count: properties.pincode_count,
      matched_pincode_count: properties.matched_pincode_count,
      unmatched_pincode_count: properties.unmatched_pincode_count
    };
  }

  const styleServiceAreaFeature = (feature) => {
    const properties = feature?.properties || {};
    const isSelected =
      selectedPop?.service_area_name === properties.service_area_name &&
      normalizeStateName(selectedPop?.state) === normalizeStateName(properties.state);
    return {
      color: isSelected ? '#0f172a' : getOfflineSeverityColorByPercentage(properties.offline_percentage),
      weight: isSelected ? 2.35 : 0.38,
      opacity: isSelected ? 0.96 : 0.18,
      fillColor: getOfflineSeverityColorByPercentage(properties.offline_percentage),
      fillOpacity: isSelected ? 0.5 : 0.38,
      className: 'service-area-territory-path'
    };
  };

  const onEachServiceAreaFeature = (feature, layer) => {
    const model = featureToServiceAreaModel(feature);
    layer.on({
      add: () => {
        const element = layer.getElement?.();
        if (element) element.style.cursor = 'pointer';
      },
      mouseover: () => {
        layer.setStyle({
          color: '#0f172a',
          weight: 2.15,
          opacity: 0.94,
          fillOpacity: 0.56
        });
        layer.bringToFront();
        const bounds = layer.getBounds();
        onHoverPop?.(model, bounds.getCenter(), bounds);
      },
      mouseout: () => {
        layer.setStyle(styleServiceAreaFeature(feature));
        onHoverPop?.(null);
      },
      click: () => {
        const bounds = layer.getBounds();
        onClickPop?.(model, bounds.getCenter(), bounds);
      }
    });
  };

  return (
    <MapContainer center={[22.9, 79.8]} zoom={5} minZoom={4} maxZoom={12} scrollWheelZoom className="india-map territory-map">
      <FitToIndia selectedBounds={selectedBounds} indiaBounds={indiaBounds} />
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={12} maxNativeZoom={12} />
      <Pane name="state-territory-pane" style={{ zIndex: 410 }}>
        {geoJson && (
          <GeoJSON
            key={`${activeLayer}-${selectedStateKey || 'india'}-${states.length}`}
            data={geoJson}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
      </Pane>
      <Pane name="service-area-territory-pane" style={{ zIndex: 430 }}>
        {selectedStateKey && showServiceAreaTerritories && serviceAreaFeatureCollection.features.length > 0 && (
          <GeoJSON
            key={`service-area-territories-${selectedStateKey}-${serviceAreaFeatureCollection.features.length}-${selectedPop?.service_area_name || 'none'}`}
            data={serviceAreaFeatureCollection}
            style={styleServiceAreaFeature}
            onEachFeature={onEachServiceAreaFeature}
          />
        )}
      </Pane>
      <Pane name="service-area-marker-pane" style={{ zIndex: 450 }}>
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
                mouseover: () => onHoverPop?.(marker, [Number(marker.latitude), Number(marker.longitude)], null),
                mouseout: () => onHoverPop?.(null),
                click: () => onClickPop?.(marker, [Number(marker.latitude), Number(marker.longitude)], null)
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
      </Pane>
      <FloatingMapInfoCard anchor={infoAnchor} bounds={infoBounds}>{infoPanel}</FloatingMapInfoCard>
    </MapContainer>
  );
}
