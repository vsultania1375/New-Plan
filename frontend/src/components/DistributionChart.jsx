import React, { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function makeTrendData(overview) {
  const totalVisits = Number(overview.active_engineer_tickets || 0) - Number(overview.active_ticket_without_visit || 0);
  const offline = Number(overview.total_offline_sites || 0);
  const tickets = Number(overview.active_engineer_tickets || 0);
  const days = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', 'Today'];
  return days.map((day, index) => {
    const factor = 0.72 + index * 0.055;
    return {
      date: day,
      visits: Math.round(totalVisits * factor / 7),
      offline: Math.round(offline * (0.92 + index * 0.015)),
      tickets: Math.round(tickets * (0.82 + index * 0.025))
    };
  });
}

export function DistributionChart({ overview, stateOptions }) {
  const [metric, setMetric] = useState('visits');
  const [state, setState] = useState('PAN India');
  const data = useMemo(() => makeTrendData(overview), [overview]);
  const metricLabel = metric === 'visits' ? 'Visits Trend' : metric === 'offline' ? 'Offline Trend' : 'Ticket Trend';

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p>Distribution Graph</p>
          <h2>{metricLabel}</h2>
        </div>
        <div className="mini-filters">
          <input type="date" aria-label="From date" />
          <input type="date" aria-label="To date" />
          <select value={state} onChange={(event) => setState(event.target.value)}>
            <option>PAN India</option>
            {stateOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Engineer"><option>All Engineers</option></select>
          <select aria-label="Service Area"><option>All Service Areas</option></select>
        </div>
      </div>
      <div className="metric-tabs">
        {[
          ['visits', 'Visits Trend'],
          ['offline', 'Offline Trend'],
          ['tickets', 'Ticket Trend']
        ].map(([id, label]) => (
          <button key={id} className={metric === id ? 'active' : ''} onClick={() => setMetric(id)}>{label}</button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Area type="monotone" dataKey={metric} stroke="#2563eb" strokeWidth={3} fill="url(#trendFill)" />
        </AreaChart>
      </ResponsiveContainer>
      <p className="mock-note">Trend uses frontend fallback until date-wise analytics API is added.</p>
    </section>
  );
}
