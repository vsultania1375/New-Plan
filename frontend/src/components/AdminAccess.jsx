import React, { useState } from 'react';
import { Lock, LogOut, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import { importSampleFolder, uploadFile } from '../api.js';

export function AdminAccess({ isAdmin, onLogin, onLogout }) {
  const [key, setKey] = useState('');
  const [open, setOpen] = useState(false);

  if (isAdmin) {
    return (
      <button className="soft-button dark" onClick={onLogout}>
        <LogOut size={16} /> Exit Admin
      </button>
    );
  }

  return (
    <div className="admin-access">
      <button className="soft-button dark" onClick={() => setOpen((value) => !value)}>
        <Lock size={16} /> Admin Upload
      </button>
      {open && (
        <form className="admin-popover" onSubmit={(event) => {
          event.preventDefault();
          onLogin(key);
          setKey('');
          setOpen(false);
        }}>
          <label>Admin key</label>
          <input type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Enter upload key" />
          <button type="submit">Unlock</button>
        </form>
      )}
    </div>
  );
}

export function AdminUploadPanel({ adminKey, onDone }) {
  const [file, setFile] = useState(null);
  const [type, setType] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState(null);

  async function runUpload({ dryRun }) {
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await uploadFile(file, type, adminKey, { dryRun });
      setSummary(result);
      if (dryRun) {
        setMessage('Validation complete. No data was imported.');
      } else {
        try {
          await onDone();
          setMessage('Upload successful. Dashboard updated.');
        } catch {
          setMessage('Upload completed, but dashboard refresh failed. Please reload.');
        }
      }
    } catch (error) {
      setMessage(error.message);
      setSummary({
        success: false,
        failed_rows: 0,
        warnings: [error.message],
        message: 'Upload failed'
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(event) {
    event.preventDefault();
    await runUpload({ dryRun: false });
  }

  async function handleSampleImport() {
    setBusy(true);
    setMessage('');
    try {
      const result = await importSampleFolder(adminKey);
      setMessage(`Imported ${result.imported.length} files from sample folder`);
      await onDone();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-upload-card">
      <div className="panel-heading">
        <div>
          <p>Admin</p>
          <h2><ShieldCheck size={18} /> Data Upload</h2>
        </div>
      </div>
      <form onSubmit={handleUpload} className="upload-form">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">Auto detect file type</option>
          <option value="offline">Offline B2B</option>
          <option value="tickets">View Ticket</option>
          <option value="sites">Customer Site Master</option>
          <option value="engineers">Employee Master</option>
          <option value="serviceAreas">Service Area Master</option>
          <option value="attendance">Attendance</option>
          <option value="ticketActivity">Ticket Activity / Visit Data</option>
        </select>
        <button disabled={!file || busy} type="button" onClick={() => runUpload({ dryRun: true })}>
          Validate File
        </button>
        <button disabled={!file || busy} type="submit">
          <UploadCloud size={16} /> Upload
        </button>
      </form>
      <button className="secondary-button" disabled={busy} onClick={handleSampleImport}>
        <RefreshCw size={16} /> Import Current Folder
      </button>
      {message && <p className="import-message">{message}</p>}
      {summary && <ImportSummary summary={summary} />}
    </section>
  );
}

function ImportSummary({ summary }) {
  const warnings = summary.warnings || [];
  const tone = !summary.success ? 'failed' : warnings.length || summary.skipped_duplicates ? 'warning' : 'success';
  return (
    <section className={`import-summary ${tone}`}>
      <div className="import-summary-heading">
        <strong>{summary.dry_run ? 'Dry Run Result' : 'Import Result'}</strong>
        <span className={`badge ${tone === 'failed' ? 'critical' : tone === 'warning' ? 'warning' : 'good'}`}>
          {tone}
        </span>
      </div>
      <dl>
        <dt>Detected type</dt><dd>{summary.detected_file_type || '—'}</dd>
        <dt>Target table</dt><dd>{summary.target_table || '—'}</dd>
        <dt>Sheet used</dt><dd>{summary.sheet_used || '—'}</dd>
        <dt>Total rows</dt><dd>{summary.total_rows ?? '—'}</dd>
        {summary.dry_run ? (
          <>
            <dt>Estimated duplicates</dt><dd>{summary.estimated_duplicates ?? '—'}</dd>
          </>
        ) : (
          <>
            <dt>Inserted rows</dt><dd>{summary.inserted_rows ?? 0}</dd>
            <dt>Updated rows</dt><dd>{summary.updated_rows ?? 0}</dd>
            <dt>Skipped duplicates</dt><dd>{summary.skipped_duplicates ?? 0}</dd>
            <dt>Failed rows</dt><dd>{summary.failed_rows ?? 0}</dd>
          </>
        )}
      </dl>
      {summary.missing_required_headers?.length > 0 && (
        <p>Missing headers: {summary.missing_required_headers.join(', ')}</p>
      )}
      {warnings.length > 0 && (
        <ul>
          {warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}
    </section>
  );
}
