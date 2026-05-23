import React from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { formatNumber } from './format.js';

function valueOrDash(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatNumber(value)}${suffix}`;
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function CalendarDay({ day, isEmpty = false }) {
  if (isEmpty) {
    return <div className="engineer-modal-calendar-day empty" />;
  }
  const dateObj = new Date(day.date);
  const dateNum = dateObj.getDate();
  const visitCount = Number(day.visit_count || 0);

  let colorClass = 'no-visits';
  if (visitCount >= 8) {
    colorClass = 'visits-8plus';
  } else if (visitCount >= 5) {
    colorClass = 'visits-5to7';
  } else if (visitCount >= 2) {
    colorClass = 'visits-2to4';
  } else if (visitCount === 1) {
    colorClass = 'visits-1';
  }

  return (
    <div
      className={`engineer-modal-calendar-day ${colorClass}`}
      title={`${day.date} · ${visitCount} site${visitCount !== 1 ? 's' : ''}`}
    >
      <strong>{dateNum}</strong>
      <span>{visitCount}</span>
    </div>
  );
}

function HourHistogram({ rows = [] }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.visits || 0)));

  let peakHour = null;
  let peakVisits = 0;
  rows.forEach((row) => {
    const visits = Number(row.visits || 0);
    if (visits > peakVisits) {
      peakVisits = visits;
      peakHour = row.hour;
    }
  });

  return (
    <div className="engineer-modal-histogram-container">
      <div className="engineer-modal-hour-chart">
        {rows.map((row) => {
          const visits = Number(row.visits || 0);
          const isPeak = row.hour === peakHour;
          return (
            <div
              className={`engineer-modal-hour-bar ${isPeak ? 'peak' : ''}`}
              key={row.hour}
              title={`${row.hour}:00 — ${visits} visits`}
            >
              <span style={{ height: `${Math.max(3, (visits / max) * 100)}%` }} />
              <small>{row.hour}</small>
            </div>
          );
        })}
      </div>
      {peakHour !== null && (
        <div className="engineer-modal-histogram-insight">
          Peak visit window: <strong>{peakHour}:00 – {peakHour + 1}:00</strong> ({peakVisits} visits)
        </div>
      )}
    </div>
  );
}

function RiskBadge({ risk }) {
  const normalized = String(risk || 'Unknown');
  const tone = normalized === 'Critical' ? 'critical' : normalized === 'Warning' ? 'warning' : normalized === 'Good' ? 'normal' : 'neutral';
  return <span className={`badge ${tone}`}>{normalized}</span>;
}

export function EngineerProfileModal({ engineer, detail, detailLoading, detailError, onClose }) {
  if (!engineer) return null;

  const selectedEngineer = detail?.engineer || engineer;

  const handleEscape = (e) => {
    if (e.key === 'Escape') onClose();
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="engineer-profile-modal-overlay" onClick={onClose}>
      <div className="engineer-profile-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header: Identity + Risk Card + Close Button */}
        <div className="engineer-profile-header">
          <div className="engineer-profile-identity">
            <div className="engineer-profile-avatar">
              {getInitials(selectedEngineer.engineer_name)}
            </div>
            <div className="engineer-profile-title-wrap">
              <h2>{selectedEngineer.engineer_name || '—'}</h2>
              <div className="engineer-profile-risk-line">
                <RiskBadge risk={selectedEngineer.risk} /> · Operational Score {valueOrDash(selectedEngineer.engineer_score)}
              </div>
              <div className="engineer-profile-id-state">
                {selectedEngineer.engineer_id} · {selectedEngineer.state || '—'}
              </div>
              <div className="engineer-profile-assignment">
                {selectedEngineer.service_area_name || '—'} · {selectedEngineer.service_area_code || '—'} · Reports to {selectedEngineer.manager_name || '—'}
              </div>
            </div>
          </div>

          <div className="engineer-profile-header-actions">
            <div className="engineer-risk-card">
              <div className="engineer-risk-card-label">Operational Risk Score</div>
              <div className="engineer-risk-card-score">
                {valueOrDash(selectedEngineer.engineer_score)}<span>/100</span>
              </div>
              <div className="engineer-risk-card-bar">
                <div className="engineer-risk-card-progress" style={{ width: `${(Number(selectedEngineer.engineer_score || 0) / 100) * 100}%` }} />
              </div>
            </div>
            <button type="button" onClick={onClose} className="engineer-profile-close" title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="engineer-profile-body">
          {detailLoading && <div className="engineer-modal-loading">Loading engineer profile…</div>}
          {detailError && <div className="engineer-modal-error">{detailError}</div>}
          {!detailLoading && !detailError && (
            <>
              {/* Contact & Assignment Section */}
              <section className="engineer-modal-section">
                <div className="engineer-modal-section-header">
                  <h3>Contact & Assignment</h3>
                </div>
                <div className="engineer-modal-contact-grid">
                  <div>
                    <span>Phone</span>
                    <strong>{selectedEngineer.phone || '—'}</strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{selectedEngineer.email || '—'}</strong>
                  </div>
                  <div>
                    <span>Reporting Manager 2</span>
                    <strong>{selectedEngineer.manager_name || '—'}</strong>
                  </div>
                  <div>
                    <span>Service Area</span>
                    <strong>{selectedEngineer.service_area_name || '—'}</strong>
                  </div>
                  <div>
                    <span>Service Area Code</span>
                    <strong>{selectedEngineer.service_area_code || '—'}</strong>
                  </div>
                  <div>
                    <span>State</span>
                    <strong>{selectedEngineer.state || '—'}</strong>
                  </div>
                </div>
              </section>

              {/* Attendance & Productivity Section */}
              <section className="engineer-modal-section">
                <div className="engineer-modal-section-header">
                  <h3>Attendance & Productivity (Last 30 Days)</h3>
                </div>
                <div className="engineer-modal-metrics-grid">
                  <div className="engineer-modal-metric-card neutral">
                    <span>Attendance Days</span>
                    <strong>{formatNumber(selectedEngineer.attendance_days || 0)}</strong>
                  </div>
                  <div className="engineer-modal-metric-card good">
                    <span>On-Time Days</span>
                    <strong>{formatNumber(selectedEngineer.on_time_attendance_days || 0)}</strong>
                  </div>
                  <div className="engineer-modal-metric-card warning">
                    <span>Late Days</span>
                    <strong>{formatNumber(selectedEngineer.late_attendance_days || 0)}</strong>
                  </div>
                  <div className="engineer-modal-metric-card good">
                    <span>Productive Days</span>
                    <strong>{formatNumber(selectedEngineer.productive_days || 0)}</strong>
                  </div>
                  <div className="engineer-modal-metric-card warning">
                    <span>Zero Productive Days</span>
                    <strong>{formatNumber(selectedEngineer.zero_productive_days || 0)}</strong>
                  </div>
                  <div className="engineer-modal-metric-card neutral">
                    <span>Visits Last 30D</span>
                    <strong>{formatNumber(selectedEngineer.total_visits_last_30_days || 0)}</strong>
                  </div>
                  <div className="engineer-modal-metric-card neutral">
                    <span>Avg Repeat Visit Gap</span>
                    <strong>{valueOrDash(selectedEngineer.repeat_visit_rate_days, ' days')}</strong>
                  </div>
                </div>
              </section>

              {/* Service Area Responsibility Section */}
              <section className="engineer-modal-section">
                <div className="engineer-modal-section-header">
                  <h3>Service Area Responsibility</h3>
                </div>
                <div className="engineer-modal-responsibility-grid">
                  <div className="engineer-modal-metric-card neutral">
                    <span>Total Sites</span>
                    <strong>{formatNumber(selectedEngineer.total_sites_in_service_area || 0)}</strong>
                  </div>
                  <div className="engineer-modal-metric-card warning">
                    <span>Offline Sites</span>
                    <strong>{formatNumber(selectedEngineer.offline_sites_in_service_area || 0)}</strong>
                  </div>
                  <div className="engineer-modal-metric-card warning">
                    <span>Offline %</span>
                    <strong>{valueOrDash(selectedEngineer.offline_percentage, '%')}</strong>
                  </div>
                  <div className="engineer-modal-metric-card neutral">
                    <span>Open Tickets</span>
                    <strong>{formatNumber(selectedEngineer.open_tickets_in_service_area || 0)}</strong>
                  </div>
                  <div className="engineer-modal-metric-card warning">
                    <span>Pending Tickets</span>
                    <strong>{formatNumber(selectedEngineer.pending_tickets_in_service_area || 0)}</strong>
                  </div>
                  <div className="engineer-modal-metric-card neutral">
                    <span>Operational Risk Score</span>
                    <strong>{valueOrDash(selectedEngineer.engineer_score)}</strong>
                  </div>
                </div>
              </section>

              {/* Calendar Section */}
              {detail?.last_30_days_calendar && detail.last_30_days_calendar.length > 0 && (
                <section className="engineer-modal-section">
                  <div className="engineer-modal-section-header">
                    <h3><Calendar size={16} /> Site Visits by Day</h3>
                  </div>
                  {(() => {
                    const days = detail.last_30_days_calendar;
                    const firstDate = new Date(days[0]?.date);
                    const lastDate = new Date(days[days.length - 1]?.date);
                    const startDay = firstDate.getDay();
                    const emptyDays = Array(startDay).fill(null);
                    const allDays = [...emptyDays, ...days];

                    const formatDateRange = (start, end) => {
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const startMonth = monthNames[start.getMonth()];
                      const endMonth = monthNames[end.getMonth()];
                      const startDay = start.getDate();
                      const endDay = end.getDate();
                      const startYear = start.getFullYear();
                      const endYear = end.getFullYear();
                      return startYear === endYear
                        ? `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`
                        : `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
                    };

                    return (
                      <>
                        <div className="engineer-modal-calendar-header">
                          <div className="engineer-modal-calendar-date-range">{formatDateRange(firstDate, lastDate)}</div>
                          <div className="engineer-modal-calendar-legend">
                            <span className="legend-item visits-1">1 site</span>
                            <span className="legend-item visits-2to4">2-4 sites</span>
                            <span className="legend-item visits-5to7">5-7 sites</span>
                            <span className="legend-item visits-8plus">8+ sites</span>
                          </div>
                        </div>
                        <div className="engineer-modal-calendar-weekdays">
                          <div>Mon</div>
                          <div>Tue</div>
                          <div>Wed</div>
                          <div>Thu</div>
                          <div>Fri</div>
                          <div>Sat</div>
                          <div>Sun</div>
                        </div>
                        <div className="engineer-modal-calendar-grid">
                          {allDays.map((day, idx) => (
                            <CalendarDay key={idx} day={day} isEmpty={!day} />
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </section>
              )}

              {/* Visit Hour Histogram Section */}
              {detail?.visit_hour_histogram && detail.visit_hour_histogram.length > 0 && (
                <section className="engineer-modal-section">
                  <div className="engineer-modal-section-header">
                    <h3><Clock size={16} /> Visit Timing</h3>
                  </div>
                  <HourHistogram rows={detail.visit_hour_histogram} />
                </section>
              )}

              {/* Recent Visits Section */}
              {detail?.recent_visits && detail.recent_visits.length > 0 && (
                <section className="engineer-modal-section">
                  <div className="engineer-modal-section-header">
                    <h3>Recent Visits (Last 30 Days)</h3>
                  </div>
                  <div className="engineer-modal-recent-table-wrap">
                    <table className="engineer-modal-recent-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time In</th>
                          <th>Time Out</th>
                          <th>Ticket</th>
                          <th>CS ID</th>
                          <th>Site / Service Area</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.recent_visits.map((visit, index) => (
                          <tr key={`${visit.ticket_id || visit.cs_id || index}-${visit.visit_date}`}>
                            <td>{visit.visit_date ? String(visit.visit_date).slice(0, 10) : '—'}</td>
                            <td>{visit.time_in || '—'}</td>
                            <td>{visit.time_out || '—'}</td>
                            <td>{visit.ticket_id || '—'}</td>
                            <td>{visit.cs_id || '—'}</td>
                            <td>{visit.site_name || visit.service_area_name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
