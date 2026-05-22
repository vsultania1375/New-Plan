import React from 'react';
import { MAP_LAYERS, SERVICE_HEALTH_COLORS, SERVICE_HEALTH_LEGEND } from './territoryUtils.js';

const serviceHealthLegendText = SERVICE_HEALTH_LEGEND
  .map((item) => `${item.label} ${item.range}`)
  .join(' · ');

const layerLegend = {
  serviceHealth: {
    className: 'map-legend-health',
    text: serviceHealthLegendText
  },
  openSiteIssues: {
    className: 'map-legend-load',
    text: 'Lighter to darker orange shows increasing open site issue load.'
  },
  offlineFrequency: {
    className: 'map-legend-health',
    text: serviceHealthLegendText
  },
  repeatFailures: {
    className: 'map-legend-load',
    text: 'Lighter to darker orange shows increasing repeat failure load.'
  },
  slaBreach: {
    className: 'map-legend-load',
    text: 'Lighter to darker orange shows increasing SLA breach risk.'
  },
  visitDelay: {
    className: 'map-legend-load',
    text: 'Lighter to darker orange shows increasing visit delay.'
  },
  vendorDelay: {
    className: 'map-legend-load',
    text: 'Lighter to darker orange shows increasing vendor delay.'
  },
  engineerActivity: {
    className: 'map-legend-activity',
    text: 'Lighter to darker green shows higher engineer activity.'
  }
};

export function MapLegend({ activeLayer, maxValue, className = '' }) {
  const layer = MAP_LAYERS.find((item) => item.key === activeLayer);
  const legend = layerLegend[activeLayer] || {
    className: `map-legend-${layer?.tone || 'blue'}`,
    text: maxValue ? 'Darker color means higher value.' : 'Data pending for this layer.'
  };
  const segmentCount = legend.className === 'map-legend-health' ? 4 : 3;
  const healthScale = activeLayer === 'serviceHealth' || activeLayer === 'offlineFrequency';

  return (
    <div className={`map-legend ${legend.className} ${className}`.trim()}>
      <div className={`legend-scale ${segmentCount === 4 ? 'legend-scale-four' : ''}`} aria-hidden="true">
        {healthScale
          ? SERVICE_HEALTH_LEGEND.map((item) => (
            <i key={item.key} style={{ background: SERVICE_HEALTH_COLORS[item.key] }} />
          ))
          : Array.from({ length: segmentCount }).map((_, index) => (
            <i key={index} />
          ))}
      </div>
      <strong>{layer?.label || 'Map Layer'}</strong>
      <span>{legend.text}</span>
    </div>
  );
}
