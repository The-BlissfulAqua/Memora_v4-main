// Single clean realtimeService implementation
type Role = 'PATIENT' | 'CAREGIVER' | 'FAMILY';

type IncomingMessage = { type: string; payload?: any };
type StatusCb = (connected: boolean) => void;
type ActionCb = (action: any) => void;

class RealtimeService {
  private ws: WebSocket | null = null;
  private url: string | null = null;
  private statusCbs: StatusCb[] = [];
  private actionCbs: ActionCb[] = [];
  private sendQueue: IncomingMessage[] = [];
  private reconnectTimer: number | null = null;

  isConnected() {
    return !!(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  connect(url?: string) {
    const target = url || (window as any).__DEMO_REALTIME_URL || this.url;
    if (!target) throw new Error('No realtime URL provided');
    // if already connected to same url, noop
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.url === target) return;
    this.url = target;

    try {
      if (this.ws) {
        try { this.ws.close(); } catch (e) { /* ignore */ }
      }
      this.ws = new WebSocket(target);
    } catch (e) {
      console.error('[realtime] failed to create WebSocket', e);
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener('open', () => {
      console.info('[realtime] connected to', target);
      // flush send queue
      while (this.sendQueue.length > 0) {
        const m = this.sendQueue.shift()!;
        this._sendNow(m);
      }
      this.statusCbs.forEach(cb => cb(true));
    });

    this.ws.addEventListener('message', (ev) => {
      try {
        const msg: IncomingMessage = JSON.parse((ev.data as string) || '');
        if (msg.type === 'ACTION') {
          this.actionCbs.forEach(cb => cb(msg.payload));
        } else if (msg.type === 'LOGIN_SUCCESS') {
          this.actionCbs.forEach(cb => cb({ type: 'LOGIN_SUCCESS', payload: msg.payload }));
        } else {
          this.actionCbs.forEach(cb => cb(msg));
        }
      } catch (e) {
        console.warn('[realtime] invalid message', e);
      }
    });

    this.ws.addEventListener('close', () => {
      console.info('[realtime] disconnected');
      this.statusCbs.forEach(cb => cb(false));
      this.scheduleReconnect();
    });

    this.ws.addEventListener('error', (e) => {
      console.error('[realtime] websocket error', e);
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.url) this.connect(this.url);
    }, 2000) as unknown as number;
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch (e) { /* ignore */ }
      this.ws = null;
    }
    this.statusCbs.forEach(cb => cb(false));
  }

  login(username: string, password?: string, room = 'demo', role?: Role) {
    this.send({ type: 'LOGIN', payload: { username, password, room, role } });
  }

  sendAction(action: any) {
    this.send({ type: 'ACTION', payload: action });
  }

  private _sendNow(msg: IncomingMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (e) { console.warn('[realtime] send failed', e); }
  }

  send(msg: IncomingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this._sendNow(msg);
      return;
    }
    // queue for later
    this.sendQueue.push(msg);
    // attempt connect
    try { this.connect(); } catch (e) { /* ignore */ }
  }

  onStatusChange(cb: StatusCb) {
    this.statusCbs.push(cb);
    return () => { this.statusCbs = this.statusCbs.filter(x => x !== cb); };
  }

  onAction(cb: ActionCb) {
    this.actionCbs.push(cb);
    return () => { this.actionCbs = this.actionCbs.filter(x => x !== cb); };
  }
}

const realtimeService = new RealtimeService();
export default realtimeService;
