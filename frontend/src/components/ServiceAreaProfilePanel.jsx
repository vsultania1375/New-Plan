import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Clock, MapPinned, Phone, ShieldCheck, Ticket, UserCheck } from 'lucide-react';
import { getServiceAreaProfile } from '../api.js';
import { formatNumber } from './format.js';

function valueOrDash(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatNumber(value)}${suffix}`;
}

function percentOrDash(value) {
  if (value === null || value === undefined || value === '') return '—';
  return `${value}%`;
}

function ProfileMetricCard({ label, value, icon: Icon, tone = 'neutral' }) {
  return (
    <article className={`service-profile-metric ${tone}`}>
      <span>{Icon && <Icon size={15} />} {label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SiteListTable({ title, rows = [] }) {
  return (
    <div className="service-profile-list">
      <div className="service-profile-list-heading">
        <h3>{title}</h3>
        <span>{formatNumber(rows.length)} shown</span>
      </div>
      <div className="service-profile-table-wrap">
        <table>
          <thead>
            <tr>
              <th>CS ID</th>
              <th>Oracle Site No</th>
              <th>Site Name</th>
              <th>State</th>
              <th>Last Visit Date</th>
              <th>Offline Aging</th>
              <th>Ticket Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={`${row.cs_id || row.oracle_site_no || title}-${index}`}>
                <td>{row.cs_id || '—'}</td>
                <td>{row.oracle_site_no || '—'}</td>
                <td>{row.site_name || '—'}</td>
                <td>{row.state || '—'}</td>
                <td>{row.last_visit_date || '—'}</td>
                <td>{row.offline_aging ?? '—'}</td>
                <td>{row.ticket_status || '—'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="service-profile-empty-cell">No rows available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ServiceAreaProfilePanel({ selectedServiceArea }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const serviceAreaName = selectedServiceArea?.service_area_name;
  const state = selectedServiceArea?.state;

  useEffect(() => {
    if (!serviceAreaName) {
      setProfile(null);
      setError('');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');
    getServiceAreaProfile({ state, serviceArea: serviceAreaName })
      .then((result) => {
        if (active) setProfile(result);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Service Area Profile could not load');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [serviceAreaName, state]);

  const health = profile?.current_health || {};
  const quality = profile?.engineer_quality || {};
  const coverage = profile?.site_coverage || {};
  const ownership = profile?.ownership || {};
  const lists = profile?.lists || {};
  const engineerId = ownership.active_engineer_id || ownership.engineer_id || ownership.employee_id;
  const ownershipMapped = Boolean(
    ownership.active_engineer_name
    || engineerId
    || (ownership.active_engineer_status && ownership.active_engineer_status !== 'Mapping Pending')
  );

  const healthCards = useMemo(() => [
    { label: 'Total Sites', value: valueOrDash(health.total_sites), icon: ShieldCheck },
    { label: 'Offline Sites', value: valueOrDash(health.offline_sites), icon: AlertTriangle, tone: 'warning' },
    { label: 'Offline %', value: percentOrDash(health.offline_percentage), icon: Activity, tone: 'warning' },
    { label: 'Offline >3 Days', value: valueOrDash(health.offline_gt_3_days), icon: AlertTriangle, tone: 'critical' },
    { label: 'Active Tickets', value: valueOrDash(health.active_tickets), icon: Ticket },
    { label: 'Tickets with No Visit', value: valueOrDash(health.tickets_without_visit), icon: Ticket, tone: 'warning' },
    { label: 'Offline without Ticket', value: valueOrDash(health.offline_without_ticket), icon: AlertTriangle, tone: 'critical' },
    { label: 'Avg TAT', value: valueOrDash(health.avg_tat, ' days'), icon: Clock }
  ], [health]);

  const qualityCards = useMemo(() => [
    { label: 'Visits this month', value: valueOrDash(quality.visits_this_month), icon: UserCheck },
    { label: 'Productive days', value: valueOrDash(quality.productive_days), icon: Activity },
    { label: 'Avg visits/day', value: valueOrDash(quality.avg_visits_per_day), icon: Activity },
    { label: 'Active tickets', value: valueOrDash(quality.active_tickets), icon: Ticket },
    { label: 'Zero-visit tickets', value: valueOrDash(quality.zero_visit_tickets), icon: AlertTriangle, tone: 'warning' },
    { label: 'Repeat visit rate', value: percentOrDash(quality.repeat_visit_rate), icon: Activity },
    { label: 'Avg TAT', value: valueOrDash(quality.avg_tat, ' days'), icon: Clock }
  ], [quality]);

  const coverageCards = useMemo(() => [
    { label: 'Never Visited Sites', value: valueOrDash(coverage.never_visited_count), icon: AlertTriangle, tone: 'critical' },
    { label: 'Not Visited 30 Days', value: valueOrDash(coverage.not_visited_30_count), icon: Clock, tone: 'warning' },
    { label: 'Not Visited 60 Days', value: valueOrDash(coverage.not_visited_60_count), icon: Clock, tone: 'warning' },
    { label: 'Not Visited 90 Days', value: valueOrDash(coverage.not_visited_90_count), icon: Clock, tone: 'critical' }
  ], [coverage]);

  if (!selectedServiceArea) return null;

  return (
    <section className="panel service-area-profile-panel">
      <div className="service-profile-heading">
        <div>
          <p>Service Area Profile</p>
          <h2>{serviceAreaName || 'Selected Service Area'}</h2>
          <span>{state || '—'}{profile?.service_area_code ? ` · Code ${profile.service_area_code}` : ''}</span>
        </div>
        <span className={ownershipMapped ? 'ownership-mapped' : 'mapping-pending'}>
          {ownershipMapped ? 'Ownership Mapped' : 'Ownership Mapping Pending'}
        </span>
      </div>

      {loading && <div className="service-profile-empty">Loading Service Area Profile…</div>}
      {error && <div className="service-profile-empty error">{error}</div>}

      {!loading && !error && profile && (
        <>
          <div className="service-profile-section">
            <div className="service-profile-section-title">
              <h3>Ownership</h3>
              <span>Official ownership requires ServiceAreaEngineerMapping.xlsx</span>
            </div>
            <div className="service-profile-ownership-grid">
              <div><span>Service Area</span><strong>{profile.service_area_name || '—'}</strong></div>
              <div><span>State</span><strong>{profile.state || '—'}</strong></div>
              <div><span>State Head</span><strong>{ownership.state_head_name || ownership.state_head_status || 'Mapping Pending'}</strong></div>
              <div><span>Active Engineer</span><strong>{ownership.active_engineer_name || ownership.active_engineer_status || 'Mapping Pending'}</strong></div>
              <div><span>Engineer ID</span><strong>{engineerId || '—'}</strong></div>
              <div><span>Manager</span><strong>{ownership.engineer_manager || '—'}</strong></div>
              <div><span>Engineer Phone</span><strong><Phone size={13} /> {ownership.engineer_phone || '—'}</strong></div>
              <div><span>Backup Engineer</span><strong>{ownership.backup_engineer_name || '—'}</strong></div>
              <div><span>Assignment Start Date</span><strong>{ownership.assignment_start_date || '—'}</strong></div>
            </div>
          </div>

          <div className="service-profile-section">
            <div className="service-profile-section-title">
              <h3>Current Health</h3>
            </div>
            <div className="service-profile-metric-grid">
              {healthCards.map((card) => <ProfileMetricCard key={card.label} {...card} />)}
            </div>
          </div>

          <div className="service-profile-section">
            <div className="service-profile-section-title">
              <h3>Engineer Quality</h3>
              <span>Operational aggregate only; not official owner attribution yet.</span>
            </div>
            <div className="service-profile-metric-grid compact">
              {qualityCards.map((card) => <ProfileMetricCard key={card.label} {...card} />)}
            </div>
          </div>

          <div className="service-profile-section">
            <div className="service-profile-section-title">
              <h3>Site Coverage</h3>
            </div>
            <div className="service-profile-metric-grid coverage">
              {coverageCards.map((card) => <ProfileMetricCard key={card.label} {...card} />)}
            </div>
          </div>

          <div className="service-profile-lists-grid">
            <SiteListTable title="Current Offline Sites" rows={lists.current_offline_sites || []} />
            <SiteListTable title="Never Visited Sites" rows={lists.never_visited_sites || []} />
            <SiteListTable title="Not Visited 30 Days" rows={lists.not_visited_30_sites || []} />
          </div>
        </>
      )}
    </section>
  );
}
