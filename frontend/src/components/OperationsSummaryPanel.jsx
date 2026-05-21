import React, { useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, Ticket, Users } from 'lucide-react';
import { formatNumber } from './format.js';
import { calculatePercentage } from './territoryUtils.js';

const RISK_COLORS = {
  critical: '#dc2626',
  warning: '#f97316',
  normal: '#16a34a'
};

const RISK_BG = {
  critical: '#fee2e2',
  warning: '#fff7ed',
  normal: '#f0fdf4'
};

function StatusBadge({ tone }) {
  const labels = {
    critical: 'Critical',
    warning: 'Warning',
    normal: 'Good',
    watch: 'Watch',
    action: 'Needs Action'
  };
  
  const bgClass = {
    critical: 'badge-critical',
    warning: 'badge-warning',
    normal: 'badge-good',
    watch: 'badge-warning',
    action: 'badge-critical'
  };
  
  return <span className={`status-badge ${bgClass[tone] || 'badge-normal'}`}>{labels[tone] || tone}</span>;
}

const CARD_EXPLAINERS = {
  'Offline Health': 'Count of offline sites in scope (segment PSU, aging > 2 days).',
  'Ticket Creation Gap': 'Sites offline but no active FSM ticket found.',
  'Engineer Action Gap': 'Active tickets where no engineer visit is recorded.',
  'Visit Productivity': 'Visits completed per active engineer in selected scope.',
  'Average TAT': 'Average ticket aging time. Lower is better.',
  'Resolution TAT': 'Average ticket aging time. Lower is better.',
  'Active Tickets': 'Active FSM tickets assigned to engineers in scope.',
  'Total Sites': 'Total mapped sites in scope.'
};

function HealthCard({ title, value, subtitle, tone = 'normal', icon: Icon }) {
  const explainer = CARD_EXPLAINERS[title];
  return (
    <article className={`health-card health-${tone}`}>
      <div className="health-card-header">
        {Icon && <div className={`health-icon health-icon-${tone}`}><Icon size={16} /></div>}
        <span className="health-title">{title}</span>
        {explainer && <span className="info-icon" title={explainer}>i</span>}
      </div>
      <div className="health-metric">
        <strong>{value !== null && value !== undefined ? formatNumber(value) : '—'}</strong>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </article>
  );
}

function SummaryChip({ label, isSelected = false, onClick, clickable = false }) {
  return (
    <button
      className={`summary-chip ${isSelected ? 'active' : ''} ${!clickable ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={!clickable}
    >
      {label}
    </button>
  );
}

export function OperationsSummaryPanel({
  scopeType = 'PAN_INDIA', // PAN_INDIA | STATE | POP (POP = Service Area)
  scopeData = {},
  topRiskStates = [],
  popList = [],
  selectedState = null,
  selectedPop = null,
  onSelectState = null,
  onSelectPop = null
}) {
  const formatSitesWithPercent = (count, total) => {
    if (count === null || count === undefined) return '—';
    const percent = calculatePercentage(count, total);
    return percent === null ? `${formatNumber(count)} sites` : `${formatNumber(count)} sites (${percent}%)`;
  };

  const scopeTitle = useMemo(() => {
    if (scopeType === 'POP' && selectedPop) {
      return `Service Area Operations Summary`;
    } else if (scopeType === 'STATE' && selectedState) {
      return `State Operations Summary`;
    }
    return 'PAN India Operations Summary';
  }, [scopeType, selectedState, selectedPop]);

  // Top row summary metrics
  const topRowMetrics = useMemo(() => {
    if (scopeType === 'POP' && selectedPop) {
      return {
        'SERVICE AREA': selectedPop.service_area_name || '—',
        'STATE': selectedPop.state || '—',
        'ENGINEER': selectedPop.engineer_name || '—',
        'TOTAL SITES': selectedPop.total_mapped_sites || '—',
        'OFFLINE SITES': selectedPop.offline_sites || '—',
        'AVG TAT': selectedPop.avg_ticket_aging ? `${selectedPop.avg_ticket_aging} hrs` : '—'
      };
    } else if (scopeType === 'STATE' && selectedState) {
      return {
        'STATE': selectedState.state || '—',
        'TOTAL SERVICE AREAS': selectedState.total_pops || '—',
        'ACTIVE ENGINEERS': selectedState.active_engineers || '—',
        'TOTAL SITES': selectedState.total_sites || '—',
        'OFFLINE SITES': selectedState.total_offline || '—',
        'DATA DATE': scopeData.data_date || '—'
      };
    }
    // PAN India
    return {
      'SCOPE': 'PAN India',
      'SEGMENT': 'PSU',
      'STATES COVERED': scopeData.states_count || '—',
      'TOTAL SERVICE AREAS': scopeData.total_pops || '—',
      'ACTIVE ENGINEERS': scopeData.active_engineers || '—',
      'DATA DATE': scopeData.data_date || '—'
    };
  }, [scopeType, scopeData, selectedState, selectedPop]);

  // Chips to display
  const chips = useMemo(() => {
    if (scopeType === 'POP') {
      // Classification chips for selected Service Area
      const chips = [];
      if (selectedPop?.riskLevel === 'critical') chips.push('Critical');
      if (selectedPop?.riskLevel === 'warning') chips.push('Warning');
      if (selectedPop?.offline_sites > 0) chips.push('Offline Heavy');
      if (selectedPop?.active_tickets > 0 && selectedPop?.total_ticket_visits === 0) chips.push('Ticket Delay');
      return chips;
    } else if (scopeType === 'STATE') {
      // Service Area chips for state scope
      return (popList || []).slice(0, 6).map(pop => ({
        label: pop.service_area_name || 'Unmapped',
        id: pop.service_area_name,
        clickable: true,
        isSelected: selectedPop?.service_area_name === pop.service_area_name
      }));
    }
    // PAN India - top risky states
    return (topRiskStates || []).slice(0, 5).map(state => {
      const raw = state.state_key || state.state || 'Unknown';
      const id = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
      return {
        label: state.state || 'Unknown',
        id,
        clickable: !!onSelectState,
        isSelected: false
      };
    });
  }, [scopeType, selectedPop, popList, topRiskStates, selectedState, onSelectState]);

  // Health card metrics
  const healthMetrics = useMemo(() => {
    if (scopeType === 'POP' && selectedPop) {
      const offlineCritical = selectedPop.offline_more_than_5_days > 0;
      const ticketGap = 0; // Not available at Service Area level in current data
      const visitGap = selectedPop.active_tickets > 0 && selectedPop.total_ticket_visits === 0;
      
      return [
        {
          title: 'Offline Health',
          value: selectedPop.offline_sites,
          subtitle: `>3 Days: ${selectedPop.offline_more_than_5_days || 0}`,
          tone: selectedPop.offline_sites > 10 ? 'critical' : selectedPop.offline_sites > 5 ? 'warning' : 'normal',
          icon: Activity
        },
        {
          title: 'Total Sites',
          value: selectedPop.total_mapped_sites,
          subtitle: null,
          tone: 'normal',
          icon: Users
        },
        {
          title: 'Active Tickets',
          value: selectedPop.active_tickets,
          subtitle: `Visits: ${selectedPop.total_ticket_visits || 0}`,
          tone: visitGap ? 'warning' : 'normal',
          icon: Ticket
        },
        {
          title: 'Average TAT',
          value: selectedPop.avg_ticket_aging,
          subtitle: selectedPop.avg_ticket_aging > 24 ? 'High' : 'Normal',
          tone: selectedPop.avg_ticket_aging > 24 ? 'warning' : 'normal',
          icon: Clock
        },
        {
          title: 'Resolution Status',
          value: selectedPop.completed_tickets || 0,
          subtitle: `Closed: ${selectedPop.closed_tickets || 0}`,
          tone: 'normal',
          icon: CheckCircle2
        }
      ];
    } else if (scopeType === 'STATE' && selectedState) {
      return [
        {
          title: 'Offline Health',
          value: selectedState.total_offline,
          subtitle: `>3 Days: ${formatSitesWithPercent(selectedState.offline_gt_3_days, selectedState.total_sites)}`,
          tone: selectedState.total_offline > 100 ? 'critical' : selectedState.total_offline > 50 ? 'warning' : 'normal',
          icon: Activity
        },
        {
          title: 'Ticket Creation Gap',
          value: scopeData.offline_without_ticket,
          subtitle: 'Needs Action',
          tone: scopeData.offline_without_ticket > 20 ? 'critical' : scopeData.offline_without_ticket > 10 ? 'warning' : 'normal',
          icon: AlertTriangle
        },
        {
          title: 'Engineer Action Gap',
          value: scopeData.ticket_without_visit,
          subtitle: scopeData.ticket_without_visit > 15 ? 'Critical' : 'Monitor',
          tone: scopeData.ticket_without_visit > 15 ? 'critical' : scopeData.ticket_without_visit > 5 ? 'warning' : 'normal',
          icon: Users
        },
        {
          title: 'Visit Productivity',
          value: selectedState.visits_per_engineer,
          subtitle: 'Visits / Eng / Day',
          tone: selectedState.visits_per_engineer > 2 ? 'normal' : 'warning',
          icon: CheckCircle2
        },
        {
          title: 'Resolution TAT',
          value: selectedState.avg_tat,
          subtitle: selectedState.avg_tat > 30 ? 'Watch' : 'Good',
          tone: selectedState.avg_tat > 30 ? 'warning' : 'normal',
          icon: Clock
        }
      ];
    }
    // PAN India
    return [
        {
          title: 'Offline Health',
          value: scopeData.total_offline,
          subtitle: `>3 Days: ${formatSitesWithPercent(scopeData.offline_gt_3_days, scopeData.total_sites)}`,
          tone: scopeData.total_offline_sites > 200 ? 'critical' : scopeData.total_offline_sites > 100 ? 'warning' : 'normal',
          icon: Activity
        },
      {
        title: 'Ticket Creation Gap',
        value: scopeData.offline_without_active_engineer_ticket,
        subtitle: 'Needs Action',
        tone: scopeData.offline_without_active_engineer_ticket > 50 ? 'critical' : scopeData.offline_without_active_engineer_ticket > 20 ? 'warning' : 'normal',
        icon: AlertTriangle
      },
      {
        title: 'Engineer Action Gap',
        value: scopeData.active_ticket_without_visit,
        subtitle: scopeData.active_ticket_without_visit > 30 ? 'Critical' : 'Monitor',
        tone: scopeData.active_ticket_without_visit > 30 ? 'critical' : scopeData.active_ticket_without_visit > 10 ? 'warning' : 'normal',
        icon: Users
      },
      {
        title: 'Engineer Capacity',
        value: scopeData.active_engineers,
        subtitle: `${scopeData.active_engineer_tickets ? Math.round(scopeData.active_engineer_tickets / (scopeData.active_engineers || 1)) : '—'} tickets/eng`,
        tone: 'normal',
        icon: Users
      },
      {
        title: 'Resolution TAT',
        value: scopeData.avg_ticket_aging,
        subtitle: scopeData.avg_ticket_aging > 30 ? 'Watch' : 'Good',
        tone: scopeData.avg_ticket_aging > 30 ? 'warning' : 'normal',
        icon: Clock
      }
    ];
  }, [scopeType, scopeData, selectedState, selectedPop]);

  // Executive summary derived from topRiskStates
  const executiveSummary = useMemo(() => {
    if (!topRiskStates || !topRiskStates.length) return 'Executive summary will appear once risk data is available.';
    const top = topRiskStates.slice(0, 3).map(s => s.state || s.state_key || 'Unknown');
    return `Highest risk is concentrated in ${top.join(', ')} based on offline severity and ticket action gaps.`;
  }, [topRiskStates]);

  const handleChipClick = (chip) => {
    if (scopeType === 'PAN_INDIA' && onSelectState) {
      onSelectState(chip);
    } else if (scopeType === 'STATE' && onSelectPop && chip.clickable) {
      onSelectPop(chip);
    }
  };

  return (
    <section className="panel operations-summary-panel">
      <div className="panel-heading">
        <div>
          <p>Operations Snapshot</p>
          <h2>{scopeTitle}</h2>
          <div className="exec-summary">{executiveSummary}</div>
        </div>
      </div>

      {/* Top Row - Summary Metrics */}
      <div className="summary-top-row">
        {Object.entries(topRowMetrics).map(([label, value]) => (
          <div key={label} className="summary-metric-item">
            <span className="metric-label">{label}</span>
            <strong className="metric-value">{value}</strong>
          </div>
        ))}
      </div>

      {/* Chips / Pills Row */}
      {chips.length > 0 && (
        <div className="summary-chips-row">
          <div className="chips-label">
            {scopeType === 'POP' ? 'Classification' : scopeType === 'STATE' ? 'Service Areas in State' : 'Top Risk States'}
          </div>
          <div className="chips-container">
            {chips.map((chip) => (
              <SummaryChip
                key={typeof chip === 'string' ? chip : chip.id}
                label={typeof chip === 'string' ? chip : chip.label}
                isSelected={chip.isSelected}
                onClick={() => handleChipClick(chip)}
                clickable={chip.clickable !== false && scopeType !== 'POP'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Operational Health Score Cards */}
      <div className="summary-health-section">
        <div className="health-section-title">Operational Health Score</div>
        <div className="health-cards-grid">
          {healthMetrics.map((metric) => (
            <HealthCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              subtitle={metric.subtitle}
              tone={metric.tone}
              icon={metric.icon}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
