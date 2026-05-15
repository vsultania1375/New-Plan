import React from 'react';
import { MAP_LAYERS } from './territoryUtils.js';

const legendText = {
  coverage: 'Darker blue means more mapped sites.',
  offline: 'Darker red means more PSU offline sites older than 3 days.',
  tickets: 'Darker orange means heavier active engineer ticket load.',
  productivity: 'Darker green means more visits per active engineer.'
};

export function MapLegend({ activeLayer, maxValue }) {
  const layer = MAP_LAYERS.find((item) => item.key === activeLayer);

  return (
    <div className={`map-legend map-legend-${layer?.tone || 'blue'}`}>
      <div className="legend-scale">
        <i />
        <i />
        <i />
      </div>
      <strong>{layer?.label}</strong>
      <span>{maxValue ? legendText[activeLayer] : 'Data pending for this layer.'}</span>
    </div>
  );
}
