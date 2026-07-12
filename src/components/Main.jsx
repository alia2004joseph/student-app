import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import { authHeaders } from '../context/AuthContext';
import { API_BASE } from '../config';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function initials(name) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

async function apiRequest(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || data;
}

function Main() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const [s, t, c, a] = await Promise.all([
          apiRequest('/students/'),
          apiRequest('/teachers/'),
          apiRequest('/classes/'),
          apiRequest(`/attendance/records/?date=${todayISO()}`),
        ]);
        setStudents(s);
        setTeachers(t);
        setClasses(c);
        setAttendanceToday(a);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const attendanceRate = useMemo(() => {
    if (attendanceToday.length === 0) return null;
    const present = attendanceToday.filter((r) => r.status === 'Present').length;
    return Math.round((present / attendanceToday.length) * 100);
  }, [attendanceToday]);

  const recentStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => (a.admitted < b.admitted ? 1 : -1))
      .slice(0, 5);
  }, [students]);

  const attendanceByClass = useMemo(() => {
    return classes.map((c) => {
      const records = attendanceToday.filter((r) => r.className === c.name);
      const present = records.filter((r) => r.status === 'Present').length;
      return {
        name: c.name,
        taken: records.length > 0,
        present,
        total: records.length,
      };
    });
  }, [classes, attendanceToday]);

  const stats = [
    { label: 'Total Students', value: students.length, color: '#2b3a67' },
    { label: 'Total Teachers', value: teachers.length, color: '#4c9a6a' },
    { label: 'Total Classes', value: classes.length, color: '#f2a65a' },
    {
      label: "Today's Attendance",
      value: attendanceRate === null ? '—' : `${attendanceRate}%`,
      color: '#d1495b',
    },
  ];

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="dashboard">
      <div className="wrap">
        <section className="dash-hero">
          <div className="dash-hero-text">
            <span className="eyebrow">Overview</span>
            <h1>Good morning, Admin</h1>
            <p>Here's what's happening across the school today, {today}.</p>
          </div>
          <div className="dash-hero-actions">
            <Button variant="outline" size="md" style={{ background: 'rgba(255,255,255,0.9)' }} onClick={() => navigate('/attendance')}>
              Take Attendance
            </Button>
            <Button variant="accent" size="md" onClick={() => navigate('/students')}>
              Add Student
            </Button>
          </div>
        </section>

        {error && (
          <div style={{ background: 'rgba(209,73,91,0.1)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 20, fontSize: 13.5 }}>
            Couldn't load dashboard data — is your Django server running? ({error})
          </div>
        )}

        <section className="stat-grid">
          {stats.map((stat) => (
            <div className="stat-card" key={stat.label}>
              <div className="stat-top">
                <span
                  className="stat-icon"
                  style={{ background: `${stat.color}1a`, color: stat.color }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </span>
              </div>
              <div className="stat-value">{loading ? '…' : stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </section>

        <section className="dash-columns">
          <div className="panel">
            <div className="panel-head">
              <h2 className="ruled">Recently Added Students</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/students')}>
                View all
              </Button>
            </div>
            {loading ? (
              <div style={{ fontSize: 13.5, color: 'var(--color-text-muted)' }}>Loading…</div>
            ) : recentStudents.length === 0 ? (
              <div style={{ fontSize: 13.5, color: 'var(--color-text-muted)' }}>No students added yet.</div>
            ) : (
              recentStudents.map((s) => (
                <div className="schedule-row" key={s.id}>
                  <span className="avatar-sm" style={{ width: 34, height: 34 }}>{initials(s.name)}</span>
                  <div className="schedule-details" style={{ flex: 1 }}>
                    <strong>{s.name}</strong>
                    <span>{s.className} · Admitted {s.admitted}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2 className="ruled">Today's Attendance by Class</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/attendance')}>
                Manage
              </Button>
            </div>
            {loading ? (
              <div style={{ fontSize: 13.5, color: 'var(--color-text-muted)' }}>Loading…</div>
            ) : attendanceByClass.length === 0 ? (
              <div style={{ fontSize: 13.5, color: 'var(--color-text-muted)' }}>No classes yet.</div>
            ) : (
              attendanceByClass.map((c) => (
                <div className="announcement" key={c.name}>
                  <div className="a-head">
                    <span>{c.name}</span>
                    <span>{c.taken ? `${c.present}/${c.total} present` : 'Not taken yet'}</span>
                  </div>
                  <p style={{ color: c.taken ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                    {c.taken
                      ? `Attendance recorded for ${c.name} today.`
                      : `Attendance hasn't been taken for ${c.name} yet today.`}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Main;