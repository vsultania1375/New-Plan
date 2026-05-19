import React from 'react';
import { BarChart3, Building2, MapPinned, Users } from 'lucide-react';

const REPORT_TABS = [
  { key: 'full', label: 'Full Report', icon: BarChart3 },
  { key: 'state', label: 'State Wise', icon: MapPinned },
  { key: 'engineer', label: 'Engineer Wise', icon: Users },
  { key: 'customer', label: 'Customer Wise', icon: Building2 }
];

export function ReportTabs({ activeReport, onChange }) {
  return (
    <nav className="report-tabs" aria-label="Report views">
      {REPORT_TABS.map((tab) => {
        const Icon = tab.icon;
        return (
        <button
          key={tab.key}
          className={`report-tab ${activeReport === tab.key ? 'active' : ''}`}
          type="button"
          onClick={() => onChange(tab.key)}
        >
          <Icon size={16} />
          {tab.label}
        </button>
        );
      })}
    </nav>
  );
}
