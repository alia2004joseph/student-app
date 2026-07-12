import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Button from '../components/Button';
import { authHeaders } from '../context/AuthContext';
import { API_BASE } from '../config';

/**
 * Student Management — connected to the Django REST API.
 * GET/POST/PATCH/DELETE all hit {API_BASE}/students/
 */

const CLASSES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
const STATUSES = ['Active', 'Pending', 'Inactive'];
const PAGE_SIZE = 6;

const emptyForm = {
  name: '',
  gender: 'Female',
  className: 'Grade 1',
  guardian: '',
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
  if (res.status === 204) return null; // no content, e.g. DELETE
  return res.json();
}

function StudentModal({ initialValues, onClose, onSave, saving }) {
  const [form, setForm] = useState(initialValues);
  const isEdit = Boolean(initialValues.id);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.guardian.trim() || !form.contact.trim()) return;
    onSave(form);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{isEdit ? 'Edit Student' : 'Add New Student'}</h2>
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
                <label htmlFor="s-name">Full name</label>
                <input
                  id="s-name"
                  type="text"
                  placeholder="e.g. Amara Nakato"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="s-gender">Gender</label>
                <select id="s-gender" value={form.gender} onChange={(e) => update('gender', e.target.value)}>
                  <option>Female</option>
                  <option>Male</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="s-class">Class</label>
                <select id="s-class" value={form.className} onChange={(e) => update('className', e.target.value)}>
                  {CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="s-guardian">Guardian name</label>
                <input
                  id="s-guardian"
                  type="text"
                  placeholder="e.g. Grace Nakato"
                  value={form.guardian}
                  onChange={(e) => update('guardian', e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="s-contact">Guardian contact</label>
                <input
                  id="s-contact"
                  type="tel"
                  placeholder="+256 7xx xxx xxx"
                  value={form.contact}
                  onChange={(e) => update('contact', e.target.value)}
                  required
                />
              </div>

              <div className="form-field span-2">
                <label htmlFor="s-status">Enrollment status</label>
                <select id="s-status" value={form.status} onChange={(e) => update('status', e.target.value)}>
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
              {isEdit ? 'Save changes' : 'Add student'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);

  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiRequest('/students/');
      // DRF pagination (if enabled) wraps results in { results: [...] };
      // handle both shapes so this works either way.
      setStudents(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesQuery = s.name.toLowerCase().includes(query.toLowerCase());
      const matchesClass = classFilter === 'All' || s.className === classFilter;
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      return matchesQuery && matchesClass && matchesStatus;
    });
  }, [students, query, classFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = useMemo(
    () => ({
      total: students.length,
      active: students.filter((s) => s.status === 'Active').length,
      pending: students.filter((s) => s.status === 'Pending').length,
      inactive: students.filter((s) => s.status === 'Inactive').length,
    }),
    [students]
  );

  function openAdd() {
    setEditing(null);
    setActionError(null);
    setModalOpen(true);
  }

  function openEdit(student) {
    setEditing(student);
    setActionError(null);
    setModalOpen(true);
  }

  async function handleSave(form) {
    setSaving(true);
    setActionError(null);
    try {
      if (editing) {
        const updated = await apiRequest(`/students/${editing.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        setStudents((prev) => prev.map((s) => (s.id === editing.id ? updated : s)));
      } else {
        const created = await apiRequest('/students/', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setStudents((prev) => [created, ...prev]);
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
      await apiRequest(`/students/${id}/`, { method: 'DELETE' });
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function resetFilters() {
    setQuery('');
    setClassFilter('All');
    setStatusFilter('All');
    setPage(1);
  }

  return (
    <main className="dashboard">
      <div className="wrap">
        <div className="page-head">
          <div>
            <h1 className="ruled">Students</h1>
            <p>Manage enrollment records, class assignments, and guardian contacts.</p>
          </div>
          <Button variant="accent" size="md" onClick={openAdd}>
            + Add Student
          </Button>
        </div>

        {loadError && (
          <div style={{ background: 'rgba(209,73,91,0.1)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 18, fontSize: 13.5 }}>
            Couldn't reach the API at <code>{API_BASE}</code> — is your Django server running (
            <code>python manage.py runserver</code>)? <button onClick={loadStudents} style={{ marginLeft: 8, textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 13.5 }}>Retry</button>
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
            <div className="summary-label">Total students</div>
          </div>
          <div className="summary-chip">
            <div className="summary-value">{summary.active}</div>
            <div className="summary-label">Active</div>
          </div>
          <div className="summary-chip">
            <div className="summary-value">{summary.pending}</div>
            <div className="summary-label">Pending enrollment</div>
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
                  placeholder="Search students"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <select
                className="select-field"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option>All</option>
                {CLASSES.map((c) => (
                  <option key={c}>{c}</option>
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
            <div className="table-empty">Loading students…</div>
          ) : pageItems.length === 0 ? (
            <div className="table-empty">No students match your search or filters.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Guardian</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="cell-student">
                        <span className="avatar-sm">{initials(s.name)}</span>
                        <span>
                          <strong>{s.name}</strong>
                          <span>{s.gender} · Admitted {s.admitted}</span>
                        </span>
                      </div>
                    </td>
                    <td>{s.className}</td>
                    <td>{s.guardian}</td>
                    <td>{s.contact}</td>
                    <td>
                      <span
                        className={`pill ${
                          s.status === 'Active' ? 'pill-active' : s.status === 'Pending' ? 'pill-pending' : 'pill-inactive'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button className="danger" onClick={() => setConfirmDelete(s)} aria-label={`Remove ${s.name}`}>
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
        <StudentModal
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
              <h2>Remove student?</h2>
              <button className="modal-close" onClick={() => setConfirmDelete(null)} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                This will permanently remove <strong style={{ color: 'var(--color-text)' }}>{confirmDelete.name}</strong> from
                the student records. This action can't be undone.
              </p>
            </div>
            <div className="modal-actions">
              <Button variant="ghost" size="md" onClick={() => setConfirmDelete(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="danger" size="md" loading={saving} onClick={() => handleDelete(confirmDelete.id)}>
                Remove student
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Students;