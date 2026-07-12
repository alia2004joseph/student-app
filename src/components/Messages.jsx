import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth, authHeaders, getToken } from '../context/AuthContext';
import { API_BASE, WS_BASE } from '../config';

/**
 * Real-time communication center, backed by Django Channels.
 * REST is used to load conversation lists and message history; a
 * WebSocket per open conversation delivers new messages instantly.
 */

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 401) throw new Error('Your session has expired. Please sign in again.');
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  if (res.status === 204) return null;
  return res.json();
}

function initials(name) {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Ticks({ isRead }) {
  return (
    <svg className={`ticks ${isRead ? 'read' : ''}`} width="14" height="10" viewBox="0 0 16 11" fill="none">
      <path d="M1 5.5 4.5 9 11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 5.5 9 9 15.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NewConversationModal({ users, onClose, onCreate, creating }) {
  const [selected, setSelected] = useState([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');

  function toggleUser(id) {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length > 1 && !isGroup) setIsGroup(true);
      if (next.length <= 1) setIsGroup(false);
      return next;
    });
  }

  function handleCreate() {
    if (selected.length === 0) return;
    if (isGroup && !groupName.trim()) return;
    onCreate({ participantIds: selected, isGroup, name: isGroup ? groupName.trim() : '' });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>New Conversation</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {isGroup && (
            <div className="form-field" style={{ marginBottom: 14 }}>
              <label htmlFor="group-name">Group name</label>
              <input
                id="group-name"
                type="text"
                placeholder="e.g. Grade 5B — Parents"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
          )}
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
            {isGroup ? 'Select everyone to include:' : 'Select a person to message:'}
          </p>
          <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            {users.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
                No other staff accounts exist yet — create more users in the Django admin first.
              </div>
            ) : (
              users.map((u) => (
                <label
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    fontSize: 13.5,
                  }}
                >
                  <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleUser(u.id)} />
                  <span className="avatar-sm">{initials(u.username)}</span>
                  {u.username}
                </label>
              ))
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost btn-md" onClick={onClose} disabled={creating}>
            Cancel
          </button>
          <button className="btn btn-primary btn-md" onClick={handleCreate} disabled={creating || selected.length === 0}>
            {creating ? 'Starting…' : 'Start conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Messages() {
  const { userId, username } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [connStatus, setConnStatus] = useState('idle'); // idle | connecting | open | closed
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const scrollRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiRequest('/chat/conversations/');
      const list = Array.isArray(data) ? data : data.results || [];
      setConversations(list);
      if (!activeId && list.length > 0) setActiveId(list[0].id);
    } catch (err) {
      setError(err.message);
    }
  }, [activeId]);

  useEffect(() => {
    loadConversations();
    apiRequest('/chat/users/').then(setUsers).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Open a WebSocket for the active conversation; close the previous one.
  useEffect(() => {
    if (!activeId) return;

    let cancelled = false;
    setConnStatus('connecting');

    apiRequest(`/chat/conversations/${activeId}/messages/`)
      .then((history) => {
        if (!cancelled) setMessages(Array.isArray(history) ? history : history.results || []);
      })
      .catch((err) => setError(err.message));

    const token = getToken();
    const ws = new WebSocket(`${WS_BASE}/ws/chat/${activeId}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setConnStatus('open');
    ws.onclose = () => setConnStatus('closed');
    ws.onerror = () => setConnStatus('closed');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'chat.read') {
        // Someone (re)opened this conversation — update ticks on the
        // affected messages without needing to refetch anything.
        setMessages((prev) =>
          prev.map((m) =>
            data.messageIds.includes(m.id)
              ? { ...m, readByIds: [...new Set([...(m.readByIds || []), data.readerId])] }
              : m
          )
        );
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          text: data.text,
          sender: data.senderId,
          senderName: data.senderName,
          created_at: data.createdAt,
          readByIds: [],
        },
      ]);
      loadConversations(); // refresh last-message previews in the sidebar

      // If this message is from someone else and I'm already looking at
      // this conversation, acknowledge it as read immediately — no need
      // to wait for me to close and reopen it.
      if (data.senderId !== userId) {
        ws.send(JSON.stringify({ action: 'read', messageId: data.id }));
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function selectConversation(id) {
    setActiveId(id);
    setShowListOnMobile(false);
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');

    if (connStatus === 'open' && wsRef.current) {
      // Live socket — server broadcasts it back to us (and anyone else
      // connected) over the WebSocket, so no need to touch local state here.
      wsRef.current.send(JSON.stringify({ text }));
      return;
    }

    // Socket isn't connected (offline, still connecting, or dropped) —
    // send over plain REST instead so the message is never blocked.
    // The backend still broadcasts it to anyone who IS currently
    // connected; we just need to add it to our own view manually since
    // we won't receive our own broadcast without a live socket.
    try {
      const saved = await apiRequest(`/chat/conversations/${activeId}/messages/`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setMessages((prev) => [...prev, saved]);
      loadConversations();
    } catch (err) {
      setError(`Message not sent: ${err.message}`);
    }
  }

  async function handleCreateConversation(payload) {
    setCreating(true);
    try {
      const conv = await apiRequest('/chat/conversations/', { method: 'POST', body: JSON.stringify(payload) });
      setNewModalOpen(false);
      await loadConversations();
      setActiveId(conv.id);
      setShowListOnMobile(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const active = conversations.find((c) => c.id === activeId);

  return (
    <main className="chat-page">
      <div className="wrap">
        <div className="page-head" style={{ marginTop: 0 }}>
          <h1 className="ruled">Messages</h1>
          <button className="btn btn-accent btn-md" onClick={() => setNewModalOpen(true)}>
            + New Conversation
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(209,73,91,0.1)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: 13.5 }}>
            {error}
          </div>
        )}

        <div className={`chat-shell ${showListOnMobile ? 'show-list' : ''}`}>
          <aside className="chat-list">
            <div className="chat-list-head">
              <h2>Conversations</h2>
            </div>
            <div className="chat-list-items">
              {conversations.length === 0 ? (
                <div style={{ padding: 20, fontSize: 13, color: 'var(--color-text-muted)' }}>
                  No conversations yet — start one with "+ New Conversation".
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    className={`chat-item ${c.id === activeId ? 'active' : ''}`}
                    onClick={() => selectConversation(c.id)}
                  >
                    <span className={`chat-avatar ${c.isGroup ? 'group' : ''}`}>{initials(c.name)}</span>
                    <span className="chat-item-body">
                      <span className="chat-item-top">
                        <strong>{c.name}</strong>
                        {c.lastMessage && <span className="chat-item-time">{formatTime(c.lastMessage.createdAt)}</span>}
                      </span>
                      <span className="chat-item-preview">
                        <span>{c.lastMessage ? `${c.lastMessage.senderName}: ${c.lastMessage.text}` : 'No messages yet'}</span>
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="chat-thread">
            {!active ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
                Select or start a conversation
              </div>
            ) : (
              <>
                <div className="chat-thread-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      className="icon-btn chat-back"
                      style={{ background: 'transparent', color: 'var(--color-text)' }}
                      onClick={() => setShowListOnMobile(true)}
                      aria-label="Back to conversations"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <span className={`chat-avatar ${active.isGroup ? 'group' : ''}`}>{initials(active.name)}</span>
                    <span>
                      <strong>{active.name}</strong>
                      <br />
                      <span style={{ fontSize: 12, color: connStatus === 'open' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        {connStatus === 'open' ? 'Live' : connStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="chat-messages" ref={scrollRef}>
                  {messages.map((m) => {
                    const isMe = m.sender === userId;
                    // "Read" = at least one other participant has seen it.
                    // (For DMs that's unambiguous; for groups this is a
                    // simplification — read-by-anyone rather than read-by-all.)
                    const otherIds = active.participantIds.filter((id) => id !== userId);
                    const isRead = isMe && otherIds.some((id) => (m.readByIds || []).includes(id));
                    return (
                      <div className={`bubble-row ${isMe ? 'out' : 'in'}`} key={m.id}>
                        <div className={`bubble ${isMe ? 'out' : 'in'}`}>
                          {active.isGroup && !isMe && (
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent-dark)', marginBottom: 2 }}>
                              {m.senderName}
                            </div>
                          )}
                          {m.text}
                          <div className="bubble-meta">
                            <span>{formatTime(m.created_at)}</span>
                            {isMe && <Ticks isRead={isRead} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form className="chat-composer" onSubmit={sendMessage}>
                  <input
                    type="text"
                    placeholder="Type a message"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <button type="submit" className="chat-send" disabled={!draft.trim()} aria-label="Send message">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M3 11.5 20.5 3 12.3 20.5l-2.6-7.4L3 11.5Z" fill="currentColor" />
                    </svg>
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>

      {newModalOpen && (
        <NewConversationModal
          users={users}
          creating={creating}
          onClose={() => setNewModalOpen(false)}
          onCreate={handleCreateConversation}
        />
      )}
    </main>
  );
}

export default Messages;