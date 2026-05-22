import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Clock, RadioTower, Repeat2, ShieldCheck, Ticket, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  getV3DashboardSummary,
  getV3OfflineTrend,
  getV3RepeatFailures,
  getV3ServiceAreaHealth,
  getV3SiteIntelligence,
  getV3StateHealth,
  getV3VisitPerformance
} from '../api.js';
import { formatNumber } from './format.js';

const STATUS_COLORS = ['#dc2626', '#f97316', '#10b981', '#2563eb', '#7c3aed', '#64748b'];

function metricValue(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '-';
  return `${formatNumber(value)}${suffix}`;
}

function compactDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function CommandCard({ label, value, note, icon: Icon, tone = 'neutral' }) {
  return (
    <article className={`v3-metric-card ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
      <Icon size={20} />
    </article>
  );
}

function ScoreCard({ label, value, tone = 'normal' }) {
  return (
    <article className={`v3-score-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SiteDrawer({ siteId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    getV3SiteIntelligence(siteId)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Site intelligence could not load.');
      });
    return () => {
      active = false;
    };
  }, [siteId]);

  const site = data?.site || {};
  const visits = data?.visits || [];
  const lastVisit = visits.find((visit) => visit.visit_date)?.visit_date;
  const avgRepeatDays = data?.repeat_failures?.length
    ? Math.round((data.repeat_failures.reduce((sum, row) => sum + Number(row.repeat_after_days || 0), 0) / data.repeat_failures.length) * 10) / 10
    : null;

  return (
    <div className="site-drawer-backdrop">
      <aside className="site-drawer">
        <button type="button" className="site-drawer-close" onClick={onClose} aria-label="Close site intelligence">
          <X size={18} />
        </button>
        <div className="site-drawer-heading">
          <p>Site Intelligence</p>
          <h2>{site.oracle_site_name || siteId}</h2>
          <span>{site.service_area_name || '-'} · {site.state || '-'}</span>
        </div>
        {error && <div className="service-profile-empty error">{error}</div>}
        {!data && !error && <div className="service-profile-empty">Loading site intelligence...</div>}
        {data && (
          <>
            <div className="site-drawer-grid">
              <ScoreCard label="CS ID" value={site.cs_id || '-'} />
              <ScoreCard label="ATM ID" value={site.atm_id || '-'} />
              <ScoreCard label="Open SR" value={metricValue(data.current_open_sr_count)} tone="warning" />
              <ScoreCard label="Total SR" value={metricValue(data.total_sr_till_date)} />
              <ScoreCard label="Total Visits" value={metricValue(data.total_visits_till_date)} />
              <ScoreCard label="Last Visit" value={compactDate(lastVisit)} />
              <ScoreCard label="Offline Dates" value={metricValue(data.offline_dates?.length || data.offline_frequency)} />
              <ScoreCard label="Repeat Failures" value={metricValue(data.repeat_failure_count)} tone="critical" />
              <ScoreCard label="Avg Reopened After" value={metricValue(avgRepeatDays, 'd')} />
            </div>
            <div className="site-offline-dates">
              {(data.offline_dates || []).slice(0, 12).map((date) => <span key={date}>{compactDate(date)}</span>)}
            </div>
            <div className="site-timeline">
              {(data.timeline || []).map((event, index) => (
                <div key={`${event.type}-${event.date}-${index}`} className={`timeline-event ${event.type}`}>
                  <span>{compactDate(event.date)}</span>
                  <strong>{event.label}</strong>
                  {event.detail && <small>{event.detail}</small>}
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function IntelligencePanel({ selectedState, selectedPop, stateHealth, serviceAreas, repeatTrend, visitTrend, onOpenSite }) {
  if (selectedPop) {
    const pop = serviceAreas.find((row) =>
      row.service_area_name === selectedPop.service_area_name &&
      (!selectedPop.state || row.state === selectedPop.state)
    ) || selectedPop;
    return (
      <aside className="v3-intelligence-panel">
        <p>POP Intelligence</p>
        <h2>{pop.service_area_name}</h2>
        <div className="v3-panel-grid">
          <ScoreCard label="Total SR" value={metricValue(pop.total_sr || pop.active_tickets)} />
          <ScoreCard label="Open SR" value={metricValue(pop.open_sr || pop.active_tickets)} tone="critical" />
          <ScoreCard label="Pending SR" value={metricValue(pop.pending_sr)} tone="warning" />
          <ScoreCard label="Complete SR" value={metricValue(pop.complete_sr)} />
          <ScoreCard label="Sites with Open SR" value={metricValue(pop.sites_with_open_sr)} />
          <ScoreCard label="Open Site Issue %" value={metricValue(pop.open_site_issue_percentage, '%')} />
          <ScoreCard label="Avg Visit Time" value={metricValue(pop.avg_first_visit_time_hours || pop.avg_first_visit_hours, 'h')} />
          <ScoreCard label="Avg Closure Time" value={metricValue(pop.avg_closure_time_hours, 'h')} />
          <ScoreCard label="Repeat Failure Sites" value={metricValue(pop.repeat_failure_sites || pop.offline_gt_3_days)} />
          <ScoreCard label="Offline Avg 30D" value={metricValue(pop.offline_avg_30_days || pop.offline_sites)} />
        </div>
        {(selectedPop.oracle_site_no || selectedPop.cs_id) && (
          <button className="v3-panel-action" type="button" onClick={() => onOpenSite(selectedPop.oracle_site_no || selectedPop.cs_id)}>
            Open site drawer
          </button>
        )}
      </aside>
    );
  }

  if (selectedState) {
    const stateName = selectedState.state;
    const state = stateHealth.find((row) => row.state === stateName) || selectedState;
    const rankedPops = serviceAreas.slice(0, 8);
    return (
      <aside className="v3-intelligence-panel">
        <p>State Intelligence</p>
        <h2>{stateName}</h2>
        <div className="v3-panel-grid">
          <ScoreCard label="Total SR" value={metricValue(state.total_sr || state.active_tickets)} />
          <ScoreCard label="Open SR" value={metricValue(state.open_sr || state.active_tickets)} tone="critical" />
          <ScoreCard label="Pending SR" value={metricValue(state.pending_sr)} tone="warning" />
          <ScoreCard label="Complete SR" value={metricValue(state.complete_sr)} />
          <ScoreCard label="Sites with Open SR" value={metricValue(state.sites_with_open_sr)} />
          <ScoreCard label="Open Issue %" value={metricValue(state.open_site_issue_percentage, '%')} />
        </div>
        <div className="v3-mini-chart">
          <strong>POP ranking</strong>
          {rankedPops.map((pop) => (
            <div key={`${pop.state}-${pop.service_area_name}`}>
              <span>{pop.service_area_name}</span>
              <b>{metricValue(pop.open_sr)}</b>
            </div>
          ))}
        </div>
        <div className="v3-mini-chart">
          <strong>Repeat failures</strong>
          <span>{metricValue(repeatTrend.reduce((sum, row) => sum + Number(row.repeat_failure || 0), 0))} repeat events in scope</span>
        </div>
      </aside>
    );
  }

  const worstStates = stateHealth.slice(0, 5);
  const repeatTotal = repeatTrend.reduce((sum, row) => sum + Number(row.repeat_failure || 0), 0);
  const delayedTrend = visitTrend.slice(-5);
  return (
    <aside className="v3-intelligence-panel">
      <p>Today&apos;s Alerts</p>
      <h2>Command watchlist</h2>
      <div className="v3-alert-stack">
        <div>
          <strong>Worst states</strong>
          {worstStates.map((state) => <span key={state.state}>{state.state}: {metricValue(state.open_sr)} open SR</span>)}
        </div>
        <div>
          <strong>Highest repeat failure areas</strong>
          <span>{metricValue(repeatTotal)} repeat failure events detected</span>
        </div>
        <div>
          <strong>Delayed visit areas</strong>
          {delayedTrend.map((row) => <span key={row.metric_date}>{compactDate(row.metric_date)}: {metricValue(row.avg_first_visit_time_hours, 'h')}</span>)}
        </div>
      </div>
    </aside>
  );
}

export function V3CommandCenter({ selectedState, selectedPop }) {
  const [summary, setSummary] = useState(null);
  const [stateHealth, setStateHealth] = useState([]);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [offlineTrend, setOfflineTrend] = useState([]);
  const [repeatTrend, setRepeatTrend] = useState([]);
  const [visitTrend, setVisitTrend] = useState([]);
  const [drawerSiteId, setDrawerSiteId] = useState('');
  const [error, setError] = useState('');

  const scope = useMemo(() => ({
    state: selectedState?.state || selectedPop?.state || '',
    serviceArea: selectedPop?.service_area_name || ''
  }), [selectedState?.state, selectedPop?.state, selectedPop?.service_area_name]);

  useEffect(() => {
    let active = true;
    setError('');
    Promise.all([
      getV3DashboardSummary(scope),
      getV3StateHealth(),
      getV3ServiceAreaHealth({ state: scope.state }),
      getV3OfflineTrend(scope),
      getV3RepeatFailures(scope),
      getV3VisitPerformance(scope)
    ])
      .then(([nextSummary, nextStates, nextServiceAreas, nextOfflineTrend, nextRepeatTrend, nextVisitTrend]) => {
        if (!active) return;
        setSummary(nextSummary);
        setStateHealth(nextStates || []);
        setServiceAreas(nextServiceAreas || []);
        setOfflineTrend(nextOfflineTrend || []);
        setRepeatTrend(nextRepeatTrend || []);
        setVisitTrend(nextVisitTrend || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'V3 service command center could not load.');
      });
    return () => {
      active = false;
    };
  }, [scope]);

  const statusDonut = useMemo(() => [
    { name: 'Open', value: Number(summary?.open_sr || 0) },
    { name: 'Pending', value: Number(summary?.pending_sr || 0) },
    { name: 'Completed', value: Number(summary?.complete_sr || 0) }
  ], [summary]);

  const ageBuckets = useMemo(() => {
    const rows = visitTrend || [];
    return [
      { name: '< 4h', value: rows.filter((row) => Number(row.avg_first_visit_time_hours || 0) < 4).length },
      { name: '4-12h', value: rows.filter((row) => Number(row.avg_first_visit_time_hours || 0) >= 4 && Number(row.avg_first_visit_time_hours || 0) < 12).length },
      { name: '12h+', value: rows.filter((row) => Number(row.avg_first_visit_time_hours || 0) >= 12).length }
    ];
  }, [visitTrend]);

  const offlineChart = offlineTrend.map((row) => ({ ...row, date: compactDate(row.snapshot_date).slice(5) }));
  const repeatChart = repeatTrend.map((row) => ({ ...row, date: compactDate(row.repeat_date).slice(5) }));
  const visitChart = visitTrend.map((row) => ({ ...row, date: compactDate(row.metric_date).slice(5) }));

  return (
    <section className="v3-command-center">
      {error && <div className="service-profile-empty error">{error}</div>}
      <div className="v3-command-grid">
        <CommandCard label="Total Open SR" value={metricValue(summary?.open_sr)} note="Ticket-level active load" icon={Ticket} tone="critical" />
        <CommandCard label="Pending SR" value={metricValue(summary?.pending_sr)} note="Awaiting action" icon={Clock} tone="warning" />
        <CommandCard label="Completed SR" value={metricValue(summary?.complete_sr)} note="Completed tickets" icon={ShieldCheck} tone="good" />
        <CommandCard label="Sites With Open Issues" value={metricValue(summary?.sites_with_open_sr)} note="Distinct site IDs" icon={RadioTower} />
        <CommandCard label="Open Site Issue %" value={metricValue(summary?.open_site_issue_percentage, '%')} note="Open sites / total sites" icon={AlertTriangle} tone="warning" />
        <CommandCard label="Avg First Visit Time" value={metricValue(summary?.avg_first_visit_time_hours, 'h')} note="First visit - open date" icon={Clock} />
        <CommandCard label="Repeat Failure Sites" value={metricValue(summary?.repeat_failure_sites || repeatTrend.reduce((sum, row) => sum + Number(row.repeat_failure_sites || 0), 0))} note="Reopened after complete" icon={Repeat2} tone="warning" />
        <CommandCard label="Offline Sites Last 30D Avg" value={metricValue(summary?.offline_sites_avg_30_days)} note="Daily snapshot average" icon={Activity} />
      </div>

      <div className="v3-main-grid">
        <div className="v3-visual-stack">
          <div className="v3-score-grid">
            <ScoreCard label="Service health score" value={metricValue(Math.max(0, 100 - Number(summary?.open_site_issue_percentage || 0)), '%')} tone="normal" />
            <ScoreCard label="Total SR" value={metricValue(summary?.total_sr)} />
            <ScoreCard label="Total Sites in scope" value={metricValue(summary?.total_sites_in_scope ?? summary?.total_active_sites_in_scope)} />
            <ScoreCard label="Avg closure time" value={metricValue(summary?.avg_closure_time_hours, 'h')} />
          </div>

          <div className="v3-chart-grid">
            <article className="panel chart-card">
              <div className="panel-heading compact"><div><p>SR Status</p><h2>Status split</h2></div></div>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={statusDonut} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88}>
                    {statusDonut.map((_entry, index) => <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </article>

            <article className="panel chart-card">
              <div className="panel-heading compact"><div><p>Offline Trend</p><h2>Daily offline sites</h2></div></div>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={offlineChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="offline_sites" stroke="#dc2626" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </article>

            <article className="panel chart-card">
              <div className="panel-heading compact"><div><p>Repeat Failures</p><h2>Repeat failure trend</h2></div></div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={repeatChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="repeat_failure" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </article>

            <article className="panel chart-card">
              <div className="panel-heading compact"><div><p>Visit Delay</p><h2>Visit time trend</h2></div></div>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={visitChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg_first_visit_time_hours" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="avg_closure_time_hours" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </article>

            <article className="panel chart-card">
              <div className="panel-heading compact"><div><p>Aging Buckets</p><h2>Visit delay buckets</h2></div></div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={ageBuckets}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#64748b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </article>
          </div>
        </div>

        <IntelligencePanel
          selectedState={selectedState}
          selectedPop={selectedPop}
          stateHealth={stateHealth}
          serviceAreas={serviceAreas}
          repeatTrend={repeatTrend}
          visitTrend={visitTrend}
          onOpenSite={(siteId) => siteId && setDrawerSiteId(siteId)}
        />
      </div>

      {drawerSiteId && <SiteDrawer siteId={drawerSiteId} onClose={() => setDrawerSiteId('')} />}
    </section>
  );
}
