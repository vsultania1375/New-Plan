import React from 'react';

const labels = {
  live: 'Live',
  offline: 'Backend Offline',
  nodata: 'No Data',
  partial: 'Partial Data',
  loading: 'Checking'
};

export function DashboardStatus({ status }) {
  return <span className={`dashboard-status ${status}`}>{labels[status] || labels.loading}</span>;
}

export function DashboardStatusCard({ status, failures = [] }) {
  if (status === 'live' || status === 'loading') return null;

  if (status === 'offline') {
    return (
      <section className="dashboard-status-card offline">
        <p>System Status</p>
        <h2>Live dashboard is offline</h2>
        <span>Unable to connect to backend API. Please start the backend server and PostgreSQL.</span>
        <ol>
          <li>Start PostgreSQL</li>
          <li>Start backend on localhost:4000</li>
          <li>Check /api/health</li>
          <li>Refresh dashboard</li>
        </ol>
      </section>
    );
  }

  if (status === 'nodata') {
    return (
      <section className="dashboard-status-card nodata">
        <p>System Status</p>
        <h2>No live data available yet</h2>
        <span>Upload or import operational files to activate dashboard insights.</span>
        <ul>
          <li>B2B Offline file</li>
          <li>ViewTicket file</li>
          <li>CustomerSiteMaster</li>
          <li>EmployeeMaster</li>
          <li>TicketActivity</li>
          <li>AttendanceReport</li>
          <li>ServiceAreaMaster</li>
        </ul>
      </section>
    );
  }

  return (
    <section className="dashboard-status-card partial">
      <p>System Status</p>
      <h2>Some dashboard sections could not load</h2>
      <span>Available sections remain visible while these API calls need attention:</span>
      <ul>
        {failures.map((failure) => <li key={failure.path}>{failure.path}</li>)}
      </ul>
    </section>
  );
}
