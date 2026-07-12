import React, { useEffect, useState, useCallback } from 'react';
import Button from '../components/Button';
import { authHeaders } from '../context/AuthContext';

/**
 * Classes — connected to the Django REST API.
 * Each class can have a homeroom teacher (pulled live from /api/teachers/)
 * and shows a real student count (computed server-side from Students).
 */

const API_BASE = 'http://localhost:8000/api';

const emptyForm = {
  name: '',
  homeroomTeacher: '',
  room: '',
  capacity: 30,
};

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

function ClassModal({ initialValues, teachers, onClose, onSave, saving }) {
  const [form, setForm] = useState(initialValues);
  const isEdit = Boolean(initialValues.id);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      homeroomTeacher: form.homeroomTeacher || null,
      capacity: Number(form.capacity) || 30,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{isEdit ? 'Edit Class' : 'Add New Class'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-field span-2">
                <label htmlFor="c-name">Class name</label>
                <input
                  id="c-name"
                  type="text"
                  placeholder="e.g. Grade 5"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  required
                />
              </div>

              <div className="form-field span-2">
                <label htmlFor="c-teacher">Homeroom teacher</label>
                <select
                  id="c-teacher"
                  value={form.homeroomTeacher || ''}
                  onChange={(e) => update('homeroomTeacher', e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="c-room">Room</label>
                <input
                  id="c-room"
                  type="text"
                  placeholder="e.g. Room 4B"
                  value={form.room}
                  onChange={(e) => update('room', e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="c-capacity">Capacity</label>
                <input
                  id="c-capacity"
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => update('capacity', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button as="submit" variant="primary" size="md" loading={saving}>
              {isEdit ? 'Save changes' : 'Add class'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Classes() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [classData, teacherData] = await Promise.all([
        apiRequest('/classes/'),
        apiRequest('/teachers/'),
      ]);
      setClasses(Array.isArray(classData) ? classData : classData.results || []);
      setTeachers(Array.isArray(teacherData) ? teacherData : teacherData.results || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function openAdd() {
    setEditing(null);
    setActionError(null);
    setModalOpen(true);
  }

  function openEdit(cls) {
    setEditing({ ...cls, homeroomTeacher: cls.homeroomTeacher || '' });
    setActionError(null);
    setModalOpen(true);
  }

  async function handleSave(form) {
    setSaving(true);
    setActionError(null);
    try {
      if (editing) {
        const updated = await apiRequest(`/classes/${editing.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        setClasses((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
      } else {
        const created = await apiRequest('/classes/', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setClasses((prev) => [...prev, created]);
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setSaving(true);
    setActionError(null);
    try {
      await apiRequest(`/classes/${id}/`, { method: 'DELETE' });
      setClasses((prev) => prev.filter((c) => c.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="dashboard">
      <div className="wrap">
        <div className="page-head">
          <div>
            <h1 className="ruled">Classes</h1>
            <p>Manage class sections, homeroom teachers, and room capacity.</p>
          </div>
          <Button variant="accent" size="md" onClick={openAdd}>
            + Add Class
          </Button>
        </div>

        {loadError && (
          <div style={{ background: 'rgba(209,73,91,0.1)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 18, fontSize: 13.5 }}>
            Couldn't reach the API — is your Django server running? <button onClick={loadAll} style={{ marginLeft: 8, textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 13.5 }}>Retry</button>
          </div>
        )}

        {actionError && (
          <div style={{ background: 'rgba(209,73,91,0.1)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 18, fontSize: 13.5 }}>
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="table-panel"><div className="table-empty">Loading classes…</div></div>
        ) : classes.length === 0 ? (
          <div className="table-panel"><div className="table-empty">No classes yet — add your first one.</div></div>
        ) : (
          <div className="class-grid">
            {classes.map((c) => {
              const pct = Math.min(100, Math.round((c.studentCount / c.capacity) * 100));
              const isFull = c.studentCount >= c.capacity;
              return (
                <div className="class-card" key={c.id}>
                  <div className="class-card-head">
                    <div>
                      <h3>{c.name}</h3>
                      <span>{c.room || 'No room assigned'}</span>
                    </div>
                    <div className="class-card-actions">
                      <button onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button className="danger" onClick={() => setConfirmDelete(c)} aria-label={`Remove ${c.name}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {c.homeroomTeacherName ? (
                    <div className="class-teacher">
                      <span className="avatar-sm">{initials(c.homeroomTeacherName)}</span>
                      <span>
                        <strong>{c.homeroomTeacherName}</strong>
                        <span>Homeroom teacher</span>
                      </span>
                    </div>
                  ) : (
                    <div className="class-teacher empty">No homeroom teacher assigned</div>
                  )}

                  <div>
                    <div className="class-meta">
                      <span>{c.studentCount} / {c.capacity} students</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="class-occupancy-bar" style={{ marginTop: 6 }}>
                      <div className={`class-occupancy-fill ${isFull ? 'full' : ''}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <ClassModal
          initialValues={editing || emptyForm}
          teachers={teachers}
          saving={saving}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Remove class?</h2>
              <button className="modal-close" onClick={() => setConfirmDelete(null)} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                This will remove <strong style={{ color: 'var(--color-text)' }}>{confirmDelete.name}</strong> from
                your class list. Students already assigned to it will keep their class name but the class
                record itself will be gone.
              </p>
            </div>
            <div className="modal-actions">
              <Button variant="ghost" size="md" onClick={() => setConfirmDelete(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="danger" size="md" loading={saving} onClick={() => handleDelete(confirmDelete.id)}>
                Remove class
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Classes;