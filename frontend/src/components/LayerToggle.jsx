import React from 'react';
import { Layers } from 'lucide-react';
import { MAP_LAYERS } from './territoryUtils.js';

export function LayerToggle({ activeLayer, showPopMarkers, selectedState, onLayerChange, onTogglePopMarkers }) {
  return (
    <div className="layer-buttons territory-layer-buttons">
      <span><Layers size={15} /> Layer</span>
      {MAP_LAYERS.map((layer) => (
        <button
          key={layer.key}
          className={activeLayer === layer.key ? 'active' : ''}
          type="button"
          onClick={() => onLayerChange(layer.key)}
        >
          {layer.label}
        </button>
      ))}
      {!selectedState && (
        <button
          className={showPopMarkers ? 'active subtle-active' : ''}
          type="button"
          onClick={onTogglePopMarkers}
        >
          POP markers
        </button>
      )}
    </div>
  );
}
