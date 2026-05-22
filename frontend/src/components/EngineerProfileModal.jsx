import React from 'react';
import { X, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { formatNumber } from './format.js';

function valueOrDash(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatNumber(value)}${suffix}`;
}

function CalendarDay({ day, isEmpty = false }) {
  if (isEmpty) {
    return <div className="engineer-modal-calendar-day empty" />;
  }
  const dateObj = new Date(day.date);
  const dateNum = dateObj.getDate();
  const visitCount = Number(day.visit_count || 0);
  const visitLabel = visitCount === 0 ? 'No visit' : visitCount === 1 ? '1 site' : `${visitCount} sites`;

  return (
    <div
      className={`engineer-modal-calendar-day ${visitCount > 0 ? 'has-visits' : 'no-visits'}`}
      title={`${day.date} · ${visitLabel}`}
    >
      <strong>{dateNum}</strong>
      <span>{visitLabel}</span>
    </div>
  );
}

function HourHistogram({ rows = [] }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.visits || 0)));
  return (
    <div className="engineer-modal-hour-chart">
      {rows.map((row) => {
        const visits = Number(row.visits || 0);
        return (
          <div
            className="engineer-modal-hour-bar"
            key={row.hour}
            title={`${row.hour}:00 — ${visits} visits`}
          >
            <span style={{ height: `${Math.max(3, (visits / max) * 100)}%` }} />
            <small>{row.hour}</small>
          </div>
        );
      })}
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
        <div className="engineer-profile-modal-header">
          <div>
            <h2>{selectedEngineer.engineer_name || '—'}</h2>
            <span className="engineer-profile-modal-subheader">
              {selectedEngineer.engineer_id} · {selectedEngineer.state || '—'}
            </span>
          </div>
          <div className="engineer-profile-modal-close">
            <RiskBadge risk={selectedEngineer.risk} />
            <button type="button" onClick={onClose} className="engineer-modal-close-btn">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="engineer-profile-modal-body">
          {detailLoading && <div className="engineer-modal-loading">Loading engineer profile…</div>}
          {detailError && <div className="engineer-modal-error">{detailError}</div>}
          {!detailLoading && !detailError && (
            <>
              {/* Engineer Info Section */}
              <section className="engineer-modal-section">
                <h3>Contact & Assignment</h3>
                <div className="engineer-modal-grid">
                  <div>
                    <span>Phone</span>
                    <strong>{selectedEngineer.phone || '—'}</strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{selectedEngineer.email || '—'}</strong>
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
                    <span>Manager</span>
                    <strong>{selectedEngineer.manager_name || '—'}</strong>
                  </div>
                  <div>
                    <span>Manager Source</span>
                    <strong>Reporting Manager 2</strong>
                  </div>
                </div>
              </section>

              {/* Attendance & Productivity Section */}
              <section className="engineer-modal-section">
                <h3>Attendance & Productivity (Last 30 Days)</h3>
                <div className="engineer-modal-grid">
                  <div className="neutral">
                    <span>Attendance Days</span>
                    <strong>{formatNumber(selectedEngineer.attendance_days || 0)}</strong>
                  </div>
                  <div className="good">
                    <span>On-Time</span>
                    <strong>{formatNumber(selectedEngineer.on_time_attendance_days || 0)}</strong>
                  </div>
                  <div className="warning">
                    <span>Late</span>
                    <strong>{formatNumber(selectedEngineer.late_attendance_days || 0)}</strong>
                  </div>
                  <div className="good">
                    <span>Productive Days</span>
                    <strong>{formatNumber(selectedEngineer.productive_days || 0)}</strong>
                  </div>
                  <div className="warning">
                    <span>Zero Productive Days</span>
                    <strong>{formatNumber(selectedEngineer.zero_productive_days || 0)}</strong>
                  </div>
                  <div className="neutral">
                    <span>Visits Last 30D</span>
                    <strong>{formatNumber(selectedEngineer.total_visits_last_30_days || 0)}</strong>
                  </div>
                  <div className="neutral">
                    <span>Avg Repeat Visit Gap</span>
                    <strong>{valueOrDash(selectedEngineer.repeat_visit_rate_days, ' days')}</strong>
                  </div>
                </div>
              </section>

              {/* Service Area Risk Section */}
              <section className="engineer-modal-section">
                <h3>Service Area Responsibility</h3>
                <div className="engineer-modal-grid">
                  <div className="neutral">
                    <span>Total Sites</span>
                    <strong>{formatNumber(selectedEngineer.total_sites_in_service_area || 0)}</strong>
                  </div>
                  <div className="warning">
                    <span>Offline Sites</span>
                    <strong>{formatNumber(selectedEngineer.offline_sites_in_service_area || 0)}</strong>
                  </div>
                  <div className="warning">
                    <span>Offline %</span>
                    <strong>{valueOrDash(selectedEngineer.offline_percentage, '%')}</strong>
                  </div>
                  <div className="neutral">
                    <span>Open Tickets</span>
                    <strong>{formatNumber(selectedEngineer.open_tickets_in_service_area || 0)}</strong>
                  </div>
                  <div className="warning">
                    <span>Pending Tickets</span>
                    <strong>{formatNumber(selectedEngineer.pending_tickets_in_service_area || 0)}</strong>
                  </div>
                  <div className="neutral">
                    <span>Operational Risk Score</span>
                    <strong>{valueOrDash(selectedEngineer.engineer_score)}</strong>
                  </div>
                </div>
              </section>

              {/* Calendar Section */}
              {detail?.last_30_days_calendar && detail.last_30_days_calendar.length > 0 && (
                <section className="engineer-modal-section">
                  <h3>
                    <Calendar size={16} /> Site Visits by Day
                  </h3>
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
                          <div className="engineer-modal-calendar-weekdays">
                            <div>Mon</div>
                            <div>Tue</div>
                            <div>Wed</div>
                            <div>Thu</div>
                            <div>Fri</div>
                            <div>Sat</div>
                            <div>Sun</div>
                          </div>
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
                  <h3>
                    <Clock size={16} /> Visit Timing
                  </h3>
                  <HourHistogram rows={detail.visit_hour_histogram} />
                </section>
              )}

              {/* Recent Visits Section */}
              {detail?.recent_visits && detail.recent_visits.length > 0 && (
                <section className="engineer-modal-section">
                  <h3>Recent Visits (Last 30 Days)</h3>
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
