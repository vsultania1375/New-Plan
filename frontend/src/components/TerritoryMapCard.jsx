import React, { useMemo, useState } from 'react';
import { MapPinned } from 'lucide-react';
import { LayerToggle } from './LayerToggle.jsx';
import { MapBreadcrumb } from './MapBreadcrumb.jsx';
import { MapLegend } from './MapLegend.jsx';
import { MapInfoPanel } from './MapInfoPanel.jsx';
import { OperationsSummaryPanel } from './OperationsSummaryPanel.jsx';
import { PopRankingPanel } from './PopRankingPanel.jsx';
import { StateTerritoryMap } from './StateTerritoryMap.jsx';
import { finalizeSummary, getMetricValue, normalizeStateName, sumStateRows } from './territoryUtils.js';

export function TerritoryMapCard({ states = [], popMarkers = [], stateRisk = [], overview = {}, onSelectPop }) {
  const [activeLayer, setActiveLayer] = useState('offline');
  const [selectedStateKey, setSelectedStateKey] = useState('');
  const [hoveredState, setHoveredState] = useState(null);
  const [hoveredStateAnchor, setHoveredStateAnchor] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedStateAnchor, setSelectedStateAnchor] = useState(null);
  const [showPopMarkers, setShowPopMarkers] = useState(false);
  const [selectedPop, setSelectedPop] = useState(null);

  const panIndiaSummary = useMemo(() => finalizeSummary(sumStateRows(states)), [states]);
  const maxMetric = useMemo(() => Math.max(0, ...states.map((state) => getMetricValue(state, activeLayer))), [activeLayer, states]);

  const visiblePops = useMemo(() => {
    if (!selectedStateKey) return [];
    return popMarkers
      .filter((m) => normalizeStateName(m.state) === selectedStateKey)
      .sort((a, b) => {
        const order = { critical: 0, warning: 1, normal: 2 };
        const diff = (order[a.riskLevel] || 2) - (order[b.riskLevel] || 2);
        return diff !== 0 ? diff : (Number(b.offline_sites) || 0) - (Number(a.offline_sites) || 0);
      });
  }, [popMarkers, selectedStateKey]);

  const activeSummary = useMemo(() => {
    if (selectedPop) {
      const sc = selectedPop.ticket_status_counts || {};
      return {
        total_sites: selectedPop.total_mapped_sites,
        total_offline: selectedPop.offline_sites,
        offline_gt_3_days: null,
        open_tickets: sc.OPEN || 0,
        pending_tickets: sc.PENDING || 0,
        completed_tickets: sc.COMPLETED || 0,
        closed_tickets: sc.CLOSED || 0,
        active_engineers: null,
        total_pops: null,
        avg_tat: selectedPop.avg_ticket_aging
      };
    }
    return selectedState || panIndiaSummary;
  }, [selectedPop, selectedState, panIndiaSummary]);

  const scopeLabel = selectedPop
    ? `${selectedPop.service_area_name} — ${selectedPop.state}`
    : selectedState
    ? `${selectedState.state} Operations`
    : 'PAN India Operations';

  function handleHoverState(state, anchor) {
    setHoveredState(state);
    setHoveredStateAnchor(anchor);
  }

  function handleSelectState(state, key, anchor) {
    const cleanedKey = key || normalizeStateName(state?.state);
    setSelectedStateKey(cleanedKey);
    setSelectedState(state);
    setHoveredState(state);
    setHoveredStateAnchor(anchor);
    setSelectedStateAnchor(anchor);
    setShowPopMarkers(true);
    setSelectedPop(null);
  }

  function handleBack() {
    setSelectedStateKey('');
    setHoveredState(null);
    setHoveredStateAnchor(null);
    setSelectedState(null);
    setSelectedStateAnchor(null);
    setShowPopMarkers(false);
    setSelectedPop(null);
  }

  function handleClickPop(marker) {
    setSelectedPop(marker);
    if (onSelectPop) onSelectPop(marker);
  }

  const infoAnchor = selectedPop
    ? [Number(selectedPop.latitude), Number(selectedPop.longitude)]
    : selectedState
    ? selectedStateAnchor
    : hoveredStateAnchor;

  return (
    <section className="panel territory-map-card">
      <div className="panel-heading territory-heading">
        <div>
          <p>State Territory</p>
          <h2>PAN India Ground Risk Territory Map</h2>
        </div>
        <LayerToggle
          activeLayer={activeLayer}
          showPopMarkers={showPopMarkers}
          selectedState={selectedState}
          onLayerChange={setActiveLayer}
          onTogglePopMarkers={() => setShowPopMarkers((current) => !current)}
        />
      </div>

      <MapBreadcrumb
        selectedState={selectedState?.state}
        selectedPop={selectedPop?.service_area_name}
        onBack={handleBack}
        onBackToState={() => setSelectedPop(null)}
      />

      <div className="territory-map-grid">
        <div className="map-frame">
          <StateTerritoryMap
            activeLayer={activeLayer}
            states={states}
            selectedStateKey={selectedStateKey}
            showPopMarkers={showPopMarkers}
            popMarkers={popMarkers}
            selectedPop={selectedPop}
            onSelectState={handleSelectState}
            onHoverState={handleHoverState}
            onClickPop={handleClickPop}
            infoPanel={(
              <MapInfoPanel
                hoveredState={hoveredState}
                selectedState={selectedState}
                selectedPop={selectedPop}
              />
            )}
            infoAnchor={infoAnchor}
          />
        </div>

        <aside className="map-side-panel territory-side-panel">
          {selectedState && (
            <PopRankingPanel
              pops={visiblePops}
              selectedPop={selectedPop}
              onSelectPop={handleClickPop}
            />
          )}
          <MapLegend activeLayer={activeLayer} maxValue={maxMetric} />
          <div className="territory-note">
            <MapPinned size={15} />
            <span>POP Centroid Markers — Territory Boundaries Pending Real GeoJSON</span>
          </div>
        </aside>
      </div>

      <OperationsSummaryPanel
        scopeType={selectedPop ? 'POP' : selectedState ? 'STATE' : 'PAN_INDIA'}
        scopeData={{
          ...overview,
          states_count: states?.length || 0,
          data_date: '13-05-2026'
        }}
        topRiskStates={stateRisk || []}
        popList={visiblePops}
        selectedState={selectedState}
        selectedPop={selectedPop}
        onSelectState={(stateObj) => {
          if (typeof stateObj === 'string') {
            // If it's a state name string, find the corresponding state object
            const foundState = states.find(s => s.state === stateObj);
            if (foundState) {
              handleSelectState(foundState, stateObj);
            }
          } else if (stateObj.id) {
            // If it's an object with id, find by normalized key
            const foundState = states.find(s => normalizeStateName(s.state) === stateObj.id);
            if (foundState) {
              handleSelectState(foundState, stateObj.id);
            }
          }
        }}
        onSelectPop={(popObj) => {
          if (typeof popObj === 'string') {
            const foundPop = visiblePops.find(p => p.service_area_name === popObj);
            if (foundPop) handleClickPop(foundPop);
          } else if (popObj.id) {
            const foundPop = visiblePops.find(p => p.service_area_name === popObj.id);
            if (foundPop) handleClickPop(foundPop);
          }
        }}
      />
    </section>
  );
}
