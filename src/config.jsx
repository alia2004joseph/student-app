/**
 * Single source of truth for where the backend lives.
 *
 * In development, Vite falls back to localhost automatically.
 * In production, set these in your hosting provider's environment
 * variables (Vercel: Project Settings -> Environment Variables):
 *
 *   VITE_API_BASE = https://your-backend.onrender.com/api
 *   VITE_WS_BASE  = wss://your-backend.onrender.com
 *
 * Note the ws:// -> wss:// change for production (secure WebSockets,
 * matching https://) and that VITE_ vars must be set at BUILD time,
 * not just runtime — Vercel handles this automatically on each deploy.
 */

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
export const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000';