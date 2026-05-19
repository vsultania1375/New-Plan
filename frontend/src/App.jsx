import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Clock, Ticket, Users, Wrench } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { getApiHealth, getDashboardData } from './api.js';
import { AdminAccess, AdminUploadPanel } from './components/AdminAccess.jsx';
import { DashboardLayout } from './components/DashboardLayout.jsx';
import { DashboardStatus, DashboardStatusCard } from './components/DashboardStatus.jsx';
import { DataTable } from './components/DataTable.jsx';
import { DistributionChart } from './components/DistributionChart.jsx';
import { EngineerProductivityCards } from './components/EngineerProductivityCards.jsx';
import { formatNumber } from './components/format.js';
import { GroundLagFunnel } from './components/GroundLagFunnel.jsx';
import { KpiCard } from './components/KpiCard.jsx';
import { ReportPlaceholder } from './components/ReportPlaceholder.jsx';
import { ReportTabs } from './components/ReportTabs.jsx';
import { RiskPopsPanel, RiskStatesPanel } from './components/RiskPanels.jsx';
import { TerritoryMapCard } from './components/TerritoryMapCard.jsx';

const COLORS = ['#dc2626', '#f97316', '#f59e0b', '#2563eb', '#10b981', '#7c3aed', '#64748b'];

const emptyDashboard = {
  overview: {},
  markers: [],
  stateMap: [],
  stateRisk: [],
  serviceAreaRisk: [],
  offlineWithoutTicket: [],
  ticketWithoutVisit: [],
  completedStillOffline: [],
  engineerLoad: [],
  breakdowns: { bucket: [], bank: [] }
};

function ChartsSection({ breakdowns }) {
  const topBuckets = breakdowns.bucket.slice(0, 7);
  const topBanks = breakdowns.bank.slice(0, 8);

  return (
    <section className="chart-grid">
      <div className="panel chart-card">
        <div className="panel-heading compact">
          <div>
            <p>Offline Severity</p>
            <h2>Aging Buckets</h2>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={topBuckets} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={2}>
              {topBuckets.map((_entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <ChartTooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="panel chart-card">
        <div className="panel-heading compact">
          <div>
            <p>Customer / Bank</p>
            <h2>Offline Load by Bank</h2>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={topBanks} layout="vertical" margin={{ left: 18, right: 18 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={128} tick={{ fontSize: 11 }} />
            <ChartTooltip />
            <Bar dataKey="value" fill="#2563eb" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function DetailTables({ data }) {
  return (
    <section className="detail-section">
      <div className="section-title">
        <p>Detailed Records</p>
        <h2>Tables for Deep Analysis</h2>
      </div>
      <div className="table-grid">
        <DataTable
          title="Engineer Performance / Load"
          rows={data.engineerLoad}
          exportName="engineer-load"
          columns={[
            { key: 'employee_name', label: 'Engineer' },
            { key: 'state', label: 'State' },
            { key: 'active_tickets', label: 'Tickets' },
            { key: 'total_ticket_visits', label: 'Visits' },
            { key: 'avg_ticket_aging', label: 'Avg TAT' }
          ]}
        />
        <DataTable
          title="POP / Service Area Detail"
          rows={data.serviceAreaRisk}
          exportName="service-area-risk"
          columns={[
            { key: 'service_area_name', label: 'POP' },
            { key: 'state', label: 'State' },
            { key: 'offline_sites', label: 'Offline' },
            { key: 'offline_more_than_5_days', label: '>5 Days' },
            { key: 'active_tickets', label: 'Tickets' }
          ]}
        />
        <DataTable
          title="Offline But No Active Ticket"
          rows={data.offlineWithoutTicket}
          exportName="offline-without-ticket"
          columns={[
            { key: 'cs_id', label: 'CS ID' },
            { key: 'site_name', label: 'Site' },
            { key: 'state', label: 'State' },
            { key: 'aging_days', label: 'Aging' },
            { key: 'service_area_name', label: 'POP' }
          ]}
        />
        <DataTable
          title="Ticket But No Visit"
          rows={data.ticketWithoutVisit}
          exportName="ticket-without-visit"
          columns={[
            { key: 'ticket_id', label: 'Ticket' },
            { key: 'cs_id', label: 'CS ID' },
            { key: 'state', label: 'State' },
            { key: 'ticket_status', label: 'Status' },
            { key: 'assigned_employee_name', label: 'Engineer' }
          ]}
        />
        <DataTable
          title="Completed/SENDBACK Still Offline"
          rows={data.completedStillOffline}
          exportName="completed-still-offline"
          columns={[
            { key: 'ticket_id', label: 'Ticket' },
            { key: 'cs_id', label: 'CS ID' },
            { key: 'ticket_status', label: 'Status' },
            { key: 'offline_aging_days', label: 'Offline Aging' },
            { key: 'assigned_employee_name', label: 'Engineer' }
          ]}
        />
        <DataTable
          title="Top Risk States"
          rows={data.stateRisk}
          exportName="state-risk"
          columns={[
            { key: 'state', label: 'State' },
            { key: 'offline_sites', label: 'Offline' },
            { key: 'offline_more_than_5_days', label: '>5 Days' },
            { key: 'offline_without_active_ticket', label: 'No Ticket' },
            { key: 'avg_offline_aging', label: 'Avg Aging' }
          ]}
        />
      </div>
    </section>
  );
}

export function App() {
  const [data, setData] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState('loading');
  const [apiFailures, setApiFailures] = useState([]);
  const [selectedPop, setSelectedPop] = useState(null);
  const [activeReport, setActiveReport] = useState('full');
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('adminUploadKey') || '');

  async function loadDashboard() {
    setLoading(true);
    setApiStatus('loading');
    setApiFailures([]);
    try {
      const health = await getApiHealth().catch(() => null);
      if (!health || health.dbConnected === false) {
        setData(emptyDashboard);
        setSelectedPop(null);
        setApiStatus('offline');
        return;
      }

      const { data: nextData, failures } = await getDashboardData(emptyDashboard);
      setData(nextData);
      setApiFailures(failures);
      setSelectedPop((current) => current || nextData.markers[0] || null);

      if (failures.length) {
        setApiStatus('partial');
        return;
      }

      const hasData =
        Object.keys(nextData.overview || {}).length > 0 ||
        nextData.markers.length > 0 ||
        nextData.stateMap.length > 0;
      setApiStatus(hasData ? 'live' : 'nodata');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stateOptions = useMemo(() => data.stateRisk.map((row) => row.state).filter(Boolean), [data.stateRisk]);
  const isAdmin = Boolean(adminKey);

  const visibleMarkers = data.markers;

  useEffect(() => {
    if (!visibleMarkers.length) {
      setSelectedPop(null);
      return;
    }
    const selectedStillVisible = visibleMarkers.some((marker) => marker.service_area_name === selectedPop?.service_area_name);
    if (!selectedStillVisible) {
      setSelectedPop(visibleMarkers[0]);
    }
  }, [visibleMarkers, selectedPop?.service_area_name]);

  const activeOverview = data.overview;
  const formatMetric = (value) => value === null || value === undefined || value === '' ? '—' : formatNumber(value);
  const formatMetricWithPercent = (value, percent) => {
    if (value === null || value === undefined || value === '') return '—';
    return `${formatMetric(value)} (${percent === null || percent === undefined ? '—' : `${percent}%`})`;
  };
  const kpis = [
    {
      label: 'Total Sites',
      value: activeOverview.total_sites,
      note: 'Mapped estate',
      icon: Activity,
      tone: 'neutral',
      helperText: activeOverview.total_psu_sites == null || activeOverview.total_pvt_sites == null
        ? 'PSU/PVT split requires approved site-level segment mapping.'
        : '',
      rows: [
        { label: 'PSU', value: formatMetric(activeOverview.total_psu_sites) },
        { label: 'PVT', value: formatMetric(activeOverview.total_pvt_sites) }
      ]
    },
    {
      label: 'Offline Load',
      value: activeOverview.total_offline_sites,
      note: 'Current offline load',
      icon: AlertTriangle,
      tone: 'warning',
      helperText: activeOverview.psu_offline_percentage == null || activeOverview.pvt_offline_percentage == null
        ? 'Offline percentage requires total site count by segment.'
        : '',
      rows: [
        { label: 'PSU', value: formatMetricWithPercent(activeOverview.psu_offline_sites, activeOverview.psu_offline_percentage) },
        { label: 'PVT', value: formatMetricWithPercent(activeOverview.pvt_offline_sites, activeOverview.pvt_offline_percentage) }
      ]
    },
    {
      label: 'Offline but No Ticket',
      value: activeOverview.offline_without_active_engineer_ticket,
      note: 'Ticket creation lag',
      icon: Ticket,
      tone: 'critical',
      rows: [
        {
          label: 'Share',
          value: activeOverview.offline_without_ticket_percentage === null || activeOverview.offline_without_ticket_percentage === undefined
            ? '—'
            : `${activeOverview.offline_without_ticket_percentage}% of offline sites`
        }
      ]
    },
    {
      label: 'Ticket but No Visit',
      value: activeOverview.active_ticket_without_visit,
      note: 'Engineer action lag',
      icon: Wrench,
      tone: 'critical',
      rows: [
        {
          label: 'Share',
          value: activeOverview.ticket_without_visit_percentage === null || activeOverview.ticket_without_visit_percentage === undefined
            ? '—'
            : `${activeOverview.ticket_without_visit_percentage}% of active tickets`
        }
      ]
    },
    {
      label: 'Avg TAT',
      value: activeOverview.avg_tat ?? activeOverview.avg_ticket_aging,
      valueSuffix: activeOverview.avg_tat_unit ? ` ${activeOverview.avg_tat_unit}` : '',
      note: 'Ticket aging',
      icon: Clock,
      tone: 'warning'
    },
    {
      label: 'Field Force',
      value: activeOverview.active_engineers,
      note: 'Coverage capacity',
      icon: Users,
      tone: 'good',
      rows: [
        { label: 'POPs', value: formatMetric(activeOverview.total_pops) },
        { label: 'Engineers', value: formatMetric(activeOverview.active_engineers) },
        { label: 'Blank POPs', value: formatMetric(activeOverview.blank_pops) }
      ]
    }
  ];

  function handleAdminLogin(key) {
    const cleaned = key.trim();
    if (!cleaned) return;
    sessionStorage.setItem('adminUploadKey', cleaned);
    setAdminKey(cleaned);
  }

  function handleAdminLogout() {
    sessionStorage.removeItem('adminUploadKey');
    setAdminKey('');
  }

  return (
    <DashboardLayout
      statusSlot={<DashboardStatus status={apiStatus} />}
      adminSlot={<AdminAccess isAdmin={isAdmin} onLogin={handleAdminLogin} onLogout={handleAdminLogout} />}
    >
      <DashboardStatusCard status={apiStatus} failures={apiFailures} />
      {isAdmin && <AdminUploadPanel adminKey={adminKey} onDone={loadDashboard} />}

      <ReportTabs activeReport={activeReport} onChange={setActiveReport} />

      {activeReport === 'full' && (
        <>
          <section className="kpi-grid">
            {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
          </section>

          <TerritoryMapCard states={data.stateMap} popMarkers={visibleMarkers} stateRisk={data.stateRisk} overview={activeOverview} onSelectPop={setSelectedPop} />

          <GroundLagFunnel overview={activeOverview} />

          <section className="visual-two-col">
            <RiskStatesPanel rows={data.stateRisk} />
            <RiskPopsPanel rows={data.serviceAreaRisk} engineers={data.engineerLoad} />
          </section>

          <DistributionChart overview={activeOverview} stateOptions={stateOptions} />
          <EngineerProductivityCards rows={data.engineerLoad} />
          <ChartsSection breakdowns={data.breakdowns} />
          <DetailTables data={data} />
        </>
      )}

      {activeReport === 'state' && <ReportPlaceholder title="State Wise Report" description="This report will be configured later." />}
      {activeReport === 'engineer' && <ReportPlaceholder title="Engineer Wise Report" description="This report will be configured later." />}
      {activeReport === 'customer' && <ReportPlaceholder title="Customer Wise Report" description="This report will be configured later." />}
    </DashboardLayout>
  );
}
