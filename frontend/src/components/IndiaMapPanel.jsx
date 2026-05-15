import React, { useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet';
import { Layers } from 'lucide-react';
import { formatNumber, markerColor } from './format.js';
import { PopTooltip } from './PopTooltip.jsx';

export function IndiaMapPanel({ markers, selectedPop, onSelectPop }) {
  const [layer, setLayer] = useState('Offline Severity');
  const topPop = useMemo(() => markers[0], [markers]);

  return (
    <section className="panel map-panel">
      <div className="panel-heading">
        <div>
          <p>POP Territory</p>
          <h2>PAN India Ground Risk Map</h2>
        </div>
        <div className="layer-buttons">
          <span><Layers size={15} /> Layer</span>
          {['POP Coverage', 'Offline Severity', 'Ticket Load', 'Engineer Productivity'].map((item) => (
            <button key={item} className={layer === item ? 'active' : ''} onClick={() => setLayer(item)}>{item}</button>
          ))}
        </div>
      </div>

      <div className="map-grid">
        <div className="map-frame">
          <MapContainer center={[22.9, 79.8]} zoom={5} minZoom={4} maxZoom={10} scrollWheelZoom className="india-map">
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {markers.map((marker) => (
              <CircleMarker
                key={`${marker.service_area_name}-${marker.state}`}
                center={[Number(marker.latitude), Number(marker.longitude)]}
                radius={Math.max(7, Math.min(20, Number(marker.offline_sites) / 1.6))}
                eventHandlers={{
                  mouseover: () => onSelectPop(marker),
                  click: () => onSelectPop(marker)
                }}
                pathOptions={{
                  color: markerColor(marker.riskLevel),
                  fillColor: markerColor(marker.riskLevel),
                  fillOpacity: selectedPop?.service_area_name === marker.service_area_name ? 0.92 : 0.66,
                  weight: selectedPop?.service_area_name === marker.service_area_name ? 4 : 2
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  <PopTooltip marker={marker} />
                </Tooltip>
                <Popup>
                  <strong>{marker.service_area_name}</strong>
                  <p>{marker.state}</p>
                  <p>{marker.offline_sites} offline sites, {marker.offline_more_than_5_days} older than 5 days.</p>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <aside className="map-side-panel">
          <p>Layer Summary</p>
          <h3>{selectedPop?.service_area_name || topPop?.service_area_name || 'PAN India'}</h3>
          <dl>
            <dt>Active Layer</dt><dd>{layer}</dd>
            <dt>State</dt><dd>{selectedPop?.state || topPop?.state || '-'}</dd>
            <dt>Offline sites</dt><dd>{formatNumber(selectedPop?.offline_sites || topPop?.offline_sites)}</dd>
            <dt>Offline {`>`} 5 days</dt><dd>{formatNumber(selectedPop?.offline_more_than_5_days || topPop?.offline_more_than_5_days)}</dd>
            <dt>Avg TAT</dt><dd>{selectedPop?.avg_ticket_aging || topPop?.avg_ticket_aging || '-'}</dd>
          </dl>
          <div className="legend stacked">
            <span><i className="dot critical" /> Critical</span>
            <span><i className="dot warning" /> Warning</span>
            <span><i className="dot normal" /> Normal</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
