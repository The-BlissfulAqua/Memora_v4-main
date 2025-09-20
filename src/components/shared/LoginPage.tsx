import React, { useState, useEffect, useRef } from 'react';
import { ViewMode } from '../../types';
import realtimeService from '../../services/realtimeService';
import { useAppContext } from '../../context/AppContext';
import DashboardSelectorModal from './DashboardSelectorModal';

const LoginPage: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { dispatch } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [wssUrl, setWssUrl] = useState('ws://localhost:8081');
  const [devMode, setDevMode] = useState(false);

  const connect = () => {
    (window as any).__DEMO_REALTIME_URL = wssUrl;
    // Attempt to connect and wait briefly for the socket to open
    try {
      realtimeService.connect(wssUrl);
    } catch (e) {
      console.error('Failed to start websocket', e);
      setError('Failed to create websocket. Check URL and network.');
      return;
    }

    // Prevent racing attempts (user clicking connect multiple times)
    attemptRef.current += 1;
    const attemptId = attemptRef.current;

    setConnecting(true);
    setError(null);

    // Wait for up to 5s for the websocket to report connected by polling isConnected()
    const waitForConnected = async (ms = 5000) => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline) {
        if (realtimeService.isConnected()) return true;
        // small delay
        // eslint-disable-next-line no-await-in-loop
        await new Promise(res => setTimeout(res, 100));
      }
      return realtimeService.isConnected();
    };

    (async () => {
      const ok = await waitForConnected(5000);
      // If a newer attempt started, ignore this one
      if (attemptRef.current !== attemptId) return;
      if (!ok) {
        setConnecting(false);
        setError('Timed out connecting to server. Check URL/network/ngrok.');
        return;
      }
      // determine role mapping for demo server
      const role = username === 'caregiver' ? 'CAREGIVER' : username === 'patient' ? 'PATIENT' : 'FAMILY';
      try {
        realtimeService.login(username || 'demo', password || 'demo', 'demo', role as any);
        dispatch({ type: 'LOGIN_SUCCESS', payload: { username, role } });
        dispatch({ type: 'SET_DEV_MODE', payload: devMode });
        setConnecting(false);
        // Close this login modal and ask App to open the dashboard selector so it is rendered
        // above the login UI (avoids selector appearing behind the modal).
        if (onClose) onClose();
        try { (window as any).openDashboardSelector && (window as any).openDashboardSelector(); } catch (e) { /* ignore */ }
      } catch (e) {
        console.error('Failed to send LOGIN', e);
        setError('Connected but failed to send login.');
        setConnecting(false);
      }
    })();
  };

  const close = () => {
    if (onClose) onClose();
  };

  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const lastActiveElement = useRef<HTMLElement | null>(null);
  const attemptRef = useRef(0);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    // Save last focused element to restore focus on close
    lastActiveElement.current = document.activeElement as HTMLElement | null;
    // Focus the first input in the modal
    setTimeout(() => firstInputRef.current?.focus(), 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
      if (e.key === 'Tab' && modalRef.current) {
        // Simple focus trap
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          (first as HTMLElement).focus();
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          (last as HTMLElement).focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // restore focus
      lastActiveElement.current?.focus?.();
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 99999 }} aria-hidden={false}>
        <div className="absolute inset-0 bg-black/60" onClick={close} style={{ zIndex: 99998 }} />
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          className="relative bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-700"
          style={{ zIndex: 99999 }}
        >
          <button onClick={close} className="absolute top-3 right-3 text-slate-400 hover:text-white" aria-label="Close login dialog">X</button>
          <h2 className="text-lg font-bold mb-4">Demo Login</h2>
          <label className="block text-sm text-slate-300">User</label>
          <input ref={firstInputRef} className="w-full p-2 mb-3 rounded bg-slate-800 border border-slate-700" value={username} onChange={e => setUsername(e.target.value)} />
          <label className="block text-sm text-slate-300">Password</label>
          <input type="password" className="w-full p-2 mb-3 rounded bg-slate-800 border border-slate-700" value={password} onChange={e => setPassword(e.target.value)} />

          <label className="block text-sm text-slate-300">WSS URL</label>
          <input className="w-full p-2 mb-3 rounded bg-slate-800 border border-slate-700" value={wssUrl} onChange={e => setWssUrl(e.target.value)} />

          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => {
                  // Enable dev mode and auto-login as patient, then close
                  dispatch({ type: 'SET_DEV_MODE', payload: true });
                  dispatch({ type: 'LOGIN_SUCCESS', payload: { username: 'dev', role: 'PATIENT' } });
                  dispatch({ type: 'SET_VIEW_MODE', payload: ViewMode.PATIENT });
                  if (onClose) onClose();
                }}
                className="px-3 py-1 bg-yellow-600 rounded text-sm"
              >
                Dev Mode
              </button>
            </div>
            <div>
              <button onClick={connect} className="px-4 py-2 bg-slate-700 rounded" disabled={connecting}>
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
              {error && <div className="text-sm text-red-400 mt-2">{error}</div>}
            </div>
          </div>
        </div>
      </div>
      {showSelector && (
        <DashboardSelectorModal onClose={() => { setShowSelector(false); if (onClose) onClose(); }} />
      )}
    </>
  );
};

export default LoginPage;
