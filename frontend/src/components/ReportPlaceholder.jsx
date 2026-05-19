import React from 'react';

export function ReportPlaceholder({ title, description }) {
  return (
    <section className="panel report-placeholder">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
