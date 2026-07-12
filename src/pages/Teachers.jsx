import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Button from '../components/Button';
import { authHeaders } from '../context/AuthContext';
import { API_BASE } from '../config';

/**
 * Teacher Management — connected to the Django REST API.
 * Same pattern as Students.jsx: GET/POST/PATCH/DELETE against
 * {API_BASE}/teachers/
 */

const SUBJECTS = ['Mathematics', 'English', 'Science', 'Social Studies', 'Physical Education', 'Art'];
const STATUSES = ['Active', 'On Leave', 'Inactive'];
const PAGE_SIZE = 6;

const emptyForm = {
  name: '',
  subject: 'Mathematics',
  classAssigned: '',
  email: '',
  contact: '',
  status: 'Active',
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

function TeacherModal({ initialValues, onClose, onSave, saving }) {
  const [form, setForm] = useState(initialValues);
  const isEdit = Boolean(initialValues.id);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) return;
    onSave(form);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{isEdit ? 'Edit Teacher' : 'Add New Teacher'}</h2>
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
                <label htmlFor="t-name">Full name</label>
                <input
                  id="t-name"
                  type="text"
                  placeholder="e.g. Mrs. Nabirye"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="t-subject">Subject</label>
                <select id="t-subject" value={form.subject} onChange={(e) => update('subject', e.target.value)}>
                  {SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="t-class">Homeroom class (optional)</label>
                <input
                  id="t-class"
                  type="text"
                  placeholder="e.g. Grade 5"
                  value={form.classAssigned}
                  onChange={(e) => update('classAssigned', e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="t-email">Email</label>
                <input
                  id="t-email"
                  type="email"
                  placeholder="name@brightpathschool.example"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="t-contact">Phone contact</label>
                <input
                  id="t-contact"
                  type="tel"
                  placeholder="+256 7xx xxx xxx"
                  value={form.contact}
                  onChange={(e) => update('contact', e.target.value)}
                  required
                />
              </div>

              <div className="form-field span-2">
                <label htmlFor="t-status">Employment status</label>
                <select id="t-status" value={form.status} onChange={(e) => update('status', e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button as="submit" variant="primary" size="md" loading={saving}>
              {isEdit ? 'Save changes' : 'Add teacher'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);

  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiRequest('/teachers/');
      setTeachers(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const filtered = useMemo(() => {
    return teachers.filter((t) => {
      const matchesQuery = t.name.toLowerCase().includes(query.toLowerCase());
      const matchesSubject = subjectFilter === 'All' || t.subject === subjectFilter;
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      return matchesQuery && matchesSubject && matchesStatus;
    });
  }, [teachers, query, subjectFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = useMemo(
    () => ({
      total: teachers.length,
      active: teachers.filter((t) => t.status === 'Active').length,
      onLeave: teachers.filter((t) => t.status === 'On Leave').length,
      inactive: teachers.filter((t) => t.status === 'Inactive').length,
    }),
    [teachers]
  );

  function openAdd() {
    setEditing(null);
    setActionError(null);
    setModalOpen(true);
  }

  function openEdit(teacher) {
    setEditing(teacher);
    setActionError(null);
    setModalOpen(true);
  }

  async function handleSave(form) {
    setSaving(true);
    setActionError(null);
    try {
      if (editing) {
        const updated = await apiRequest(`/teachers/${editing.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        setTeachers((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
      } else {
        const created = await apiRequest('/teachers/', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setTeachers((prev) => [created, ...prev]);
        setPage(1);
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
      await apiRequest(`/teachers/${id}/`, { method: 'DELETE' });
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function resetFilters() {
    setQuery('');
    setSubjectFilter('All');
    setStatusFilter('All');
    setPage(1);
  }

  return (
    <main className="dashboard">
      <div className="wrap">
        <div className="page-head">
          <div>
            <h1 className="ruled">Teachers</h1>
            <p>Manage staff profiles, subjects, and homeroom assignments.</p>
          </div>
          <Button variant="accent" size="md" onClick={openAdd}>
            + Add Teacher
          </Button>
        </div>

        {loadError && (
          <div style={{ background: 'rgba(209,73,91,0.1)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 18, fontSize: 13.5 }}>
            Couldn't reach the API at <code>{API_BASE}</code> — is your Django server running? <button onClick={loadTeachers} style={{ marginLeft: 8, textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 13.5 }}>Retry</button>
          </div>
        )}

        {actionError && (
          <div style={{ background: 'rgba(209,73,91,0.1)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 18, fontSize: 13.5 }}>
            {actionError}
          </div>
        )}

        <section className="summary-strip">
          <div className="summary-chip">
            <div className="summary-value">{summary.total}</div>
            <div className="summary-label">Total teachers</div>
          </div>
          <div className="summary-chip">
            <div className="summary-value">{summary.active}</div>
            <div className="summary-label">Active</div>
          </div>
          <div className="summary-chip">
            <div className="summary-value">{summary.onLeave}</div>
            <div className="summary-label">On leave</div>
          </div>
          <div className="summary-chip">
            <div className="summary-value">{summary.inactive}</div>
            <div className="summary-label">Inactive</div>
          </div>
        </section>

        <section className="table-panel">
          <div className="table-toolbar">
            <div className="table-toolbar-left">
              <div className="table-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  placeholder="Search teachers"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <select
                className="select-field"
                value={subjectFilter}
                onChange={(e) => {
                  setSubjectFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option>All</option>
                {SUBJECTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>

              <select
                className="select-field"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option>All</option>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>

          {loading ? (
            <div className="table-empty">Loading teachers…</div>
          ) : pageItems.length === 0 ? (
            <div className="table-empty">No teachers match your search or filters.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Subject</th>
                  <th>Homeroom</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="cell-student">
                        <span className="avatar-sm">{initials(t.name)}</span>
                        <span>
                          <strong>{t.name}</strong>
                          <span>{t.email || 'No email on file'}</span>
                        </span>
                      </div>
                    </td>
                    <td>{t.subject}</td>
                    <td>{t.classAssigned || '—'}</td>
                    <td>{t.contact}</td>
                    <td>
                      <span
                        className={`pill ${
                          t.status === 'Active' ? 'pill-active' : t.status === 'On Leave' ? 'pill-pending' : 'pill-inactive'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => openEdit(t)} aria-label={`Edit ${t.name}`}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button className="danger" onClick={() => setConfirmDelete(t)} aria-label={`Remove ${t.name}`}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="table-footer">
            <span>
              Showing {pageItems.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
              –{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} className={n === page ? 'active' : ''} onClick={() => setPage(n)}>
                  {n}
                </button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                ›
              </button>
            </div>
          </div>
        </section>
      </div>

      {modalOpen && (
        <TeacherModal
          initialValues={editing || emptyForm}
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
              <h2>Remove teacher?</h2>
              <button className="modal-close" onClick={() => setConfirmDelete(null)} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                This will permanently remove <strong style={{ color: 'var(--color-text)' }}>{confirmDelete.name}</strong> from
                staff records. This action can't be undone.
              </p>
            </div>
            <div className="modal-actions">
              <Button variant="ghost" size="md" onClick={() => setConfirmDelete(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="danger" size="md" loading={saving} onClick={() => handleDelete(confirmDelete.id)}>
                Remove teacher
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Teachers;