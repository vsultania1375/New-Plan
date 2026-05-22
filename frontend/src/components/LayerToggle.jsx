import React from 'react';
import { Activity, AlertTriangle, Clock, Layers, MapPinned, MapPin, Repeat2, ShieldCheck, Ticket, Users, Wrench } from 'lucide-react';
import { MAP_LAYERS } from './territoryUtils.js';

const layerIcons = {
  serviceHealth: ShieldCheck,
  openSiteIssues: Ticket,
  offlineFrequency: Activity,
  repeatFailures: Repeat2,
  slaBreach: AlertTriangle,
  visitDelay: Clock,
  vendorDelay: Wrench,
  engineerActivity: Users
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
