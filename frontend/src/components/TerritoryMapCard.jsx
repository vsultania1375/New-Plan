import React, { useEffect, useMemo, useState } from 'react';
import { getServiceAreaTerritories } from '../api.js';
import { LayerToggle } from './LayerToggle.jsx';
import { MapBreadcrumb } from './MapBreadcrumb.jsx';
import { MapLegend } from './MapLegend.jsx';
import { MapInfoPanel } from './MapInfoPanel.jsx';
import { OperationsSummaryPanel } from './OperationsSummaryPanel.jsx';
import { PopRankingPanel } from './PopRankingPanel.jsx';
import { ServiceAreaProfilePanel } from './ServiceAreaProfilePanel.jsx';
import { StateTerritoryMap } from './StateTerritoryMap.jsx';
import { calculatePercentage, finalizeSummary, getMetricValue, getOfflinePercentage, getOfflineSeverityLabelByPercentage, normalizeStateName, sumStateRows } from './territoryUtils.js';
import { formatNumber } from './format.js';

function valueOrDash(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatNumber(value)}${suffix}`;
}

function PanIndiaSummaryPanel({ overview = {}, summary = {}, states = [] }) {
  const totalSites = overview.total_sites ?? summary.total_sites;
  const totalOffline = overview.total_offline_sites ?? summary.total_offline;
  const offlineGt3 = summary.offline_gt_3_days;
  const offlinePercent = calculatePercentage(totalOffline, totalSites);
  const avgTat = overview.avg_tat ?? overview.avg_ticket_aging ?? summary.avg_tat;
  const avgTatUnit = overview.avg_tat_unit || 'days';
  const riskCounts = states.reduce((counts, state) => {
    const severity = getOfflineSeverityLabelByPercentage(getOfflinePercentage(state));
    if (severity === 'Critical') counts.critical += 1;
    else if (severity === 'Warning') counts.warning += 1;
    else if (severity === 'Good') counts.good += 1;
    return counts;
  }, { critical: 0, warning: 0, good: 0 });

  const rows = [
    ['Total Sites', totalSites],
    ['Total Offline Sites', totalOffline],
    ['Offline > 3 Days', offlineGt3],
    ['Offline %', offlinePercent === null ? null : `${offlinePercent}%`],
    ['Open Tickets', summary.open_tickets],
    ['Pending Tickets', summary.pending_tickets],
    ['Ticket But No Visit', overview.active_ticket_without_visit],
    ['Active Engineers', overview.active_engineers ?? summary.active_engineers],
    ['Total Service Areas', overview.total_pops ?? summary.total_pops],
    ['Avg TAT', avgTat === null || avgTat === undefined ? null : `${formatNumber(avgTat)} ${avgTatUnit}`]
  ];

  return (
    <div className="pan-india-side-summary">
      <div className="pan-india-summary-heading">
        <p>PAN India Summary</p>
        <strong>{valueOrDash(states.length)} states</strong>
      </div>
      <dl>
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt>{label}</dt>
            <dd>{typeof value === 'string' ? value : valueOrDash(value)}</dd>
          </React.Fragment>
        ))}
      </dl>
      {states.length > 0 && (
        <div className="pan-india-risk-strip">
          <span><b>{formatNumber(riskCounts.critical)}</b> Critical</span>
          <span><b>{formatNumber(riskCounts.warning)}</b> Warning</span>
          <span><b>{formatNumber(riskCounts.good)}</b> Good</span>
        </div>
      )}
      <small>Select a state to view Service Area ranking.</small>
    </div>
  );
}

export function TerritoryMapCard({ states = [], popMarkers = [], stateRisk = [], overview = {}, onSelectState, onSelectPop }) {
  const [activeLayer, setActiveLayer] = useState('serviceHealth');
  const [selectedStateKey, setSelectedStateKey] = useState('');
  const [hoveredState, setHoveredState] = useState(null);
  const [hoveredStateAnchor, setHoveredStateAnchor] = useState(null);
  const [hoveredStateBounds, setHoveredStateBounds] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedStateAnchor, setSelectedStateAnchor] = useState(null);
  const [selectedStateBounds, setSelectedStateBounds] = useState(null);
  const [showPopMarkers, setShowPopMarkers] = useState(false);
  const [selectedPop, setSelectedPop] = useState(null);
  const [selectedPopAnchor, setSelectedPopAnchor] = useState(null);
  const [selectedPopBounds, setSelectedPopBounds] = useState(null);
  const [hoveredPop, setHoveredPop] = useState(null);
  const [hoveredPopAnchor, setHoveredPopAnchor] = useState(null);
  const [hoveredPopBounds, setHoveredPopBounds] = useState(null);
  const [showServiceAreaTerritories, setShowServiceAreaTerritories] = useState(true);
  const [serviceAreaTerritories, setServiceAreaTerritories] = useState(null);
  const [territoryStatus, setTerritoryStatus] = useState({ loading: false, error: null });

  const panIndiaSummary = useMemo(() => states.length
    ? finalizeSummary(sumStateRows(states))
    : {
        state: 'PAN India',
        total_sites: null,
        total_offline: null,
        offline_gt_3_days: null,
        open_tickets: null,
        pending_tickets: null,
        completed_tickets: null,
        closed_tickets: null,
        active_engineers: null,
        total_pops: null,
        avg_tat: null
      }, [states]);
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

  function handleHoverState(state, anchor, bounds) {
    setHoveredState(state);
    setHoveredStateAnchor(anchor);
    setHoveredStateBounds(bounds || null);
  }

  function handleSelectState(state, key, anchor, bounds) {
    const cleanedKey = key || normalizeStateName(state?.state);
    setSelectedStateKey(cleanedKey);
    setSelectedState(state);
    setHoveredState(state);
    setHoveredStateAnchor(anchor);
    setHoveredStateBounds(bounds || null);
    setSelectedStateAnchor(anchor);
    setSelectedStateBounds(bounds || null);
    setShowPopMarkers(true);
    setShowServiceAreaTerritories(true);
    setSelectedPop(null);
    setSelectedPopAnchor(null);
    setSelectedPopBounds(null);
    setHoveredPop(null);
    setHoveredPopAnchor(null);
    setHoveredPopBounds(null);
    onSelectState?.(state);
    onSelectPop?.(null);
  }

  function handleBack() {
    setSelectedStateKey('');
    setHoveredState(null);
    setHoveredStateAnchor(null);
    setHoveredStateBounds(null);
    setSelectedState(null);
    setSelectedStateAnchor(null);
    setSelectedStateBounds(null);
    setShowPopMarkers(false);
    setShowServiceAreaTerritories(true);
    setSelectedPop(null);
    setSelectedPopAnchor(null);
    setSelectedPopBounds(null);
    setHoveredPop(null);
    setHoveredPopAnchor(null);
    setHoveredPopBounds(null);
    setServiceAreaTerritories(null);
    setTerritoryStatus({ loading: false, error: null });
    onSelectState?.(null);
    onSelectPop?.(null);
  }

  function handleClickPop(marker, anchor, bounds) {
    setSelectedPop(marker);
    setSelectedPopAnchor(anchor || (Number.isFinite(Number(marker?.latitude)) && Number.isFinite(Number(marker?.longitude))
      ? [Number(marker.latitude), Number(marker.longitude)]
      : null));
    setSelectedPopBounds(bounds || null);
    setHoveredPop(null);
    setHoveredPopAnchor(null);
    setHoveredPopBounds(null);
    if (onSelectPop) onSelectPop(marker);
  }

  function handleHoverPop(marker, anchor, bounds) {
    if (!marker) {
      setHoveredPop(null);
      setHoveredPopAnchor(null);
      setHoveredPopBounds(null);
      return;
    }
    setHoveredPop(marker);
    setHoveredPopAnchor(anchor || (Number.isFinite(Number(marker.latitude)) && Number.isFinite(Number(marker.longitude))
      ? [Number(marker.latitude), Number(marker.longitude)]
      : null));
    setHoveredPopBounds(bounds || null);
  }

  useEffect(() => {
    let active = true;
    if (!selectedState?.state) {
      setServiceAreaTerritories(null);
      setTerritoryStatus({ loading: false, error: null });
      return () => {
        active = false;
      };
    }

    setTerritoryStatus({ loading: true, error: null });
    getServiceAreaTerritories(selectedState.state)
      .then((data) => {
        if (!active) return;
        setServiceAreaTerritories(data);
        setTerritoryStatus({ loading: false, error: null });
      })
      .catch((error) => {
        if (!active) return;
        setServiceAreaTerritories(null);
        setTerritoryStatus({ loading: false, error: error.message || 'Service Area territory geometry unavailable' });
      });

    return () => {
      active = false;
    };
  }, [selectedState?.state]);

  const displayPop = selectedPop || hoveredPop;
  const showMapInfoOverlay = Boolean(displayPop || selectedState || hoveredState);

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
          showServiceAreaTerritories={showServiceAreaTerritories}
          selectedState={selectedState}
          onLayerChange={setActiveLayer}
          onTogglePopMarkers={() => setShowPopMarkers((current) => !current)}
          onToggleServiceAreaTerritories={() => setShowServiceAreaTerritories((current) => !current)}
        />
      </div>

      <MapBreadcrumb
        selectedState={selectedState?.state}
        selectedPop={selectedPop?.service_area_name}
        onBack={handleBack}
        onBackToState={() => {
          setSelectedPop(null);
          setSelectedPopAnchor(null);
          setSelectedPopBounds(null);
        }}
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
            serviceAreaTerritories={serviceAreaTerritories}
            showServiceAreaTerritories={showServiceAreaTerritories}
            onSelectState={handleSelectState}
            onHoverState={handleHoverState}
            onClickPop={handleClickPop}
            onHoverPop={handleHoverPop}
          />
          <div className="map-bottom-left-overlays">
            {showMapInfoOverlay && (
              <div className="map-bottom-left-info">
                <MapInfoPanel
                  hoveredState={hoveredState}
                  selectedState={selectedState}
                  selectedPop={displayPop}
                  panIndiaSummary={panIndiaSummary}
                  variant="compact"
                />
              </div>
            )}
            <div className="map-bottom-left-legend">
              <MapLegend activeLayer={activeLayer} maxValue={maxMetric} className="map-overlay-legend" />
            </div>
          </div>
        </div>

        <aside className="map-side-panel territory-side-panel">
          {selectedState ? (
            <PopRankingPanel
              pops={visiblePops}
              selectedPop={selectedPop || hoveredPop}
              onSelectPop={handleClickPop}
            />
          ) : (
            <PanIndiaSummaryPanel overview={overview} summary={panIndiaSummary} states={states} />
          )}
        </aside>
      </div>

      <OperationsSummaryPanel
        scopeType={selectedPop ? 'POP' : selectedState ? 'STATE' : 'PAN_INDIA'}
        scopeData={{
          ...overview,
          ...panIndiaSummary,
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

      <ServiceAreaProfilePanel selectedServiceArea={selectedPop} />
    </section>
  );
}
