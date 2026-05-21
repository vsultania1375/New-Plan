import React from 'react';
import { MAP_LAYERS } from './territoryUtils.js';

const legendText = {
  coverage: 'Darker blue means more mapped sites.',
  offline: 'Normal: 0–2% · Warning: >2–5% · High: >5–10% · Critical: >10%',
  tickets: 'Darker orange means heavier active engineer ticket load.',
  productivity: 'Darker green means more visits per active engineer.'
};

export function MapLegend({ activeLayer, maxValue, className = '' }) {
  const layer = MAP_LAYERS.find((item) => item.key === activeLayer);
  const segmentCount = activeLayer === 'offline' ? 4 : 3;

  return (
    <div className={`map-legend map-legend-${layer?.tone || 'blue'} ${className}`.trim()}>
      <div className={`legend-scale ${activeLayer === 'offline' ? 'legend-scale-offline' : ''}`}>
        {Array.from({ length: segmentCount }).map((_, index) => (
          <i key={index} />
        ))}
      </div>
      <strong>{layer?.label}</strong>
      <span>{activeLayer === 'offline' || maxValue ? legendText[activeLayer] : 'Data pending for this layer.'}</span>
    </div>
  );
}
