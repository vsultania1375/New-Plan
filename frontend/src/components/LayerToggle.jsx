import React from 'react';
import { Activity, Layers, Map, MapPinned, MapPin, Ticket, Users } from 'lucide-react';
import { MAP_LAYERS } from './territoryUtils.js';

const layerIcons = {
  coverage: Map,
  offline: Activity,
  tickets: Ticket,
  productivity: Users
};

export function LayerToggle({
  activeLayer,
  showPopMarkers,
  showServiceAreaTerritories,
  selectedState,
  onLayerChange,
  onTogglePopMarkers,
  onToggleServiceAreaTerritories
}) {
  return (
    <div className="layer-buttons territory-layer-buttons">
      <span><Layers size={15} /> Layer</span>
      {MAP_LAYERS.map((layer) => {
        const Icon = layerIcons[layer.key];
        return (
          <button
            key={layer.key}
            className={activeLayer === layer.key ? 'active' : ''}
            type="button"
            onClick={() => onLayerChange(layer.key)}
          >
            {Icon && <Icon size={15} />}
            {layer.label}
          </button>
        );
      })}
      {selectedState && (
        <button
          className={showServiceAreaTerritories ? 'active subtle-active' : ''}
          type="button"
          onClick={onToggleServiceAreaTerritories}
        >
          <MapPinned size={15} />
          Service Area Territories
        </button>
      )}
      <button
        className={showPopMarkers ? 'active subtle-active' : ''}
        type="button"
        onClick={onTogglePopMarkers}
      >
        <MapPin size={15} />
        Service Area markers
      </button>
    </div>
  );
}
