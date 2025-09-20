import React, { useState, useEffect } from 'react';
import realtimeService from '../../services/realtimeService';
import { useAppContext } from '../../context/AppContext';
import DashboardSelectorModal from './DashboardSelectorModal';

// Simple DemoLogin that also dispatches LOGIN_SUCCESS into AppContext

const DemoLogin: React.FC = () => {
  const [url, setUrl] = useState<string>('ws://localhost:8081');
  const [username, setUsername] = useState<string>('demo');
  const [password, setPassword] = useState<string>('demo');
  const [role, setRole] = useState<string>('FAMILY');
  const [connected, setConnected] = useState(false);
  const { dispatch } = useAppContext();
  const [devMode, setDevMode] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    // initialize from service state
    setConnected(realtimeService.isConnected());
    const unsub = realtimeService.onStatusChange((c) => setConnected(c));
    return () => unsub();
  }, []);

  const handleConnect = () => {
    try {
      // make it available globally so AppContext picks it up
      (window as any).__DEMO_REALTIME_URL = url;
    realtimeService.connect(url);
    realtimeService.login(username, password, 'demo', role as any);
      setConnected(true);
      // Dispatch a local login success for demo purposes
  dispatch({ type: 'LOGIN_SUCCESS', payload: { username, role } });
  // Instead of auto-switching the view, show the dashboard selector so the user
  // can pick which dashboard to open on this device.
  setShowSelector(true);
    } catch (e) {
      console.error('Failed to connect to demo server', e);
      setConnected(false);
    }
  };

  const handleDisconnect = () => {
    realtimeService.disconnect();
    setConnected(false);
    (window as any).__DEMO_REALTIME_URL = undefined;
    dispatch({ type: 'LOGOUT' });
  };

  const toggleDevMode = () => {
    const next = !devMode;
    setDevMode(next);
    dispatch({ type: 'SET_DEV_MODE', payload: next });
  };

  return (
    <div className="relative p-2 bg-slate-900/60 rounded-md border border-slate-700/50">
      <div className="flex gap-2 items-center">
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-500'}`} title={connected ? 'Connected' : 'Disconnected'} />
        <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="ws://server:8081" />
        <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
        <select className="input" value={role} onChange={e => setRole(e.target.value)}>
          <option value="PATIENT">Patient</option>
          <option value="CAREGIVER">Caregiver</option>
          <option value="FAMILY">Family</option>
        </select>
        <input className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" />
        {!connected ? (
          <button className="btn" onClick={handleConnect}>Connect</button>
        ) : (
          <button className="btn" onClick={handleDisconnect}>Disconnect</button>
        )}
      </div>
      <button onClick={toggleDevMode} className="absolute top-1 right-1 text-xs px-2 py-1 rounded bg-slate-800/70">Dev</button>
      {showSelector && <DashboardSelectorModal onClose={() => setShowSelector(false)} />}
    </div>
  );
};

export default DemoLogin;
