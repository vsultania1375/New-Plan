import React from 'react';
import { AlertTriangle, Clock, MapPinned, Ticket } from 'lucide-react';
import { formatNumber } from './format.js';

export function PopRankingPanel({ pops = [], selectedPop, onSelectPop }) {
  if (!pops.length) {
    return (
      <div className="pop-ranking-empty">
        <MapPinned size={20} />
        <span>No POP markers found for this state.</span>
        <span className="pop-ranking-note">Sites may lack coordinates in customer_site_master.</span>
      </div>
    );
  }

  return (
    <div className="pop-ranking-panel">
      <div className="pop-ranking-header">
        <p>POP / Service Areas</p>
        <strong>{pops.length} locations</strong>
      </div>
      <ul className="pop-ranking-list">
        {pops.map((pop) => {
          const isSelected =
            selectedPop?.service_area_name === pop.service_area_name &&
            selectedPop?.state === pop.state;
          return (
            <li
              key={`${pop.service_area_name}-${pop.state}`}
              className={`pop-ranking-row${isSelected ? ' selected' : ''} risk-${pop.riskLevel || 'normal'}`}
              onClick={() => onSelectPop(pop)}
            >
              <div className="pop-row-top">
                <span className="pop-row-name">{pop.service_area_name}</span>
                <span className={`badge ${pop.riskLevel || 'normal'}`}>{pop.riskLevel || 'normal'}</span>
              </div>
              <div className="pop-row-stats">
                <span>
                  <AlertTriangle size={11} />
                  {formatNumber(pop.offline_sites)} offline
                </span>
                <span>
                  <Ticket size={11} />
                  {formatNumber(pop.active_tickets)} tickets
                </span>
                <span>
                  <Clock size={11} />
                  {pop.avg_ticket_aging ?? '—'} TAT
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {/* POP centroid fallback note */}
      {pops && pops.length > 0 && (
        <div className="pop-centroid-note">
          POP locations are shown as centroid markers. Territory boundaries will be available after POP polygon data is added.
        </div>
      )}
    </div>
  );
}
