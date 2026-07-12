import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Button from '../components/Button';
import { authHeaders } from '../context/AuthContext';
import { API_BASE } from '../config';

/**
 * Attendance — mark daily attendance per class, and browse past records.
 * Two tabs: "Take Attendance" (roster + save) and "History" (read-only log).
 */

const STATUSES = ['Present', 'Absent', 'Late', 'Excused'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function initials(name) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (res.status === 401) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Request failed (${res.status}): ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function TakeAttendance({ classes }) {
  const [classFilter, setClassFilter] = useState('');
  const [date, setDate] = useState(todayISO());
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (classes.length && !classFilter) setClassFilter(classes[0].name);
  }, [classes, classFilter]);

  const loadRoster = useCallback(async () => {
    if (!classFilter) return;
    setLoading(true);
    setLoadError(null);
    setSaved(false);
    try {
      const data = await apiRequest(
        `/attendance/roster/?class_name=${encodeURIComponent(classFilter)}&date=${date}`
      );
      setRoster(data.roster);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [classFilter, date]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  function setStatus(studentId, status) {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
    setSaved(false);
  }

  const counts = useMemo(() => {
    const c = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
    roster.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [roster]);

  async function handleSave() {
    setSaving(true);
    setLoadError(null);
    try {
      await apiRequest('/attendance/save/', {
        method: 'POST',
        body: JSON.stringify({
          date,
          records: roster.map((r) => ({ student: r.studentId, status: r.status })),
        }),
      });
      setSaved(true);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="attendance-toolbar">
        <div className="form-field">
          <label htmlFor="att-class">Class</label>
          <select id="att-class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="att-date">Date</label>
          <input id="att-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {loadError && (
        <div style={{ background: 'rgba(209,73,91,0.1)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 18, fontSize: 13.5 }}>
          {loadError}
        </div>
      )}

      <section className="summary-strip">
        <div className="summary-chip">
          <div className="summary-value">{counts.Present}</div>
          <div className="summary-label">Present</div>
        </div>
        <div className="summary-chip">
          <div className="summary-value">{counts.Absent}</div>
          <div className="summary-label">Absent</div>
        </div>
        <div className="summary-chip">
          <div className="summary-value">{counts.Late}</div>
          <div className="summary-label">Late</div>
        </div>
        <div className="summary-chip">
          <div className="summary-value">{counts.Excused}</div>
          <div className="summary-label">Excused</div>
        </div>
      </section>

      <section className="table-panel">
        {loading ? (
          <div className="table-empty">Loading roster…</div>
        ) : roster.length === 0 ? (
          <div className="table-empty">No students found in this class.</div>
        ) : (
          roster.map((r) => (
            <div className="roster-row" key={r.studentId}>
              <div className="roster-who">
                <span className="avatar-sm">{initials(r.studentName)}</span>
                <strong>{r.studentName}</strong>
              </div>
              <div className="status-toggle">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    className={`status-btn ${s.toLowerCase()} ${r.status === s ? 'selected' : ''}`}
                    onClick={() => setStatus(r.studentId, s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}

        {roster.length > 0 && (
          <div className="attendance-save-bar">
            <span className="save-status">{saved ? '✓ Saved' : ''}</span>
            <Button variant="primary" size="md" loading={saving} onClick={handleSave}>
              Save attendance
            </Button>
          </div>
        )}
      </section>
    </>
  );
}

function History({ classes }) {
  const [classFilter, setClassFilter] = useState('');
  const [date, setDate] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set('class_name', classFilter);
      if (date) params.set('date', date);
      const data = await apiRequest(`/attendance/records/?${params.toString()}`);
      setRecords(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [classFilter, date]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  return (
    <>
      <div className="attendance-toolbar">
        <div className="form-field">
          <label htmlFor="hist-class">Class</label>
          <select id="hist-class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="hist-date">Date</label>
          <input id="hist-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setClassFilter(''); setDate(''); }}>
          Clear filters
        </Button>
      </div>

      {error && (
        <div style={{ background: 'rgba(209,73,91,0.1)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 18, fontSize: 13.5 }}>
          {error}
        </div>
      )}

      <section className="table-panel">
        {loading ? (
          <div className="table-empty">Loading records…</div>
        ) : records.length === 0 ? (
          <div className="table-empty">No attendance records match these filters.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.studentName}</td>
                  <td>{r.className}</td>
                  <td>{r.date}</td>
                  <td>
                    <span
                      className={`pill ${
                        r.status === 'Present' ? 'pill-active' : r.status === 'Absent' ? 'pill-inactive' : 'pill-pending'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function Attendance() {
  const [tab, setTab] = useState('take');
  const [classes, setClasses] = useState([]);
  const [classesError, setClassesError] = useState(null);

  useEffect(() => {
    apiRequest('/classes/')
      .then((data) => setClasses(Array.isArray(data) ? data : data.results || []))
      .catch((err) => setClassesError(err.message));
  }, []);

  return (
    <main className="dashboard">
      <div className="wrap">
        <div className="page-head">
          <div>
            <h1 className="ruled">Attendance</h1>
            <p>Take daily attendance by class, or look back through past records.</p>
          </div>
        </div>

        {classesError && (
          <div style={{ background: 'rgba(209,73,91,0.1)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 18, fontSize: 13.5 }}>
            Couldn't load classes — is your Django server running? ({classesError})
          </div>
        )}

        {classes.length === 0 && !classesError ? (
          <div className="table-panel"><div className="table-empty">No classes yet — add one on the Classes page first.</div></div>
        ) : (
          <>
            <div className="tab-toggle">
              <button className={tab === 'take' ? 'active' : ''} onClick={() => setTab('take')}>Take Attendance</button>
              <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>History</button>
            </div>

            {tab === 'take' ? <TakeAttendance classes={classes} /> : <History classes={classes} />}
          </>
        )}
      </div>
    </main>
  );
}

export default Attendance;