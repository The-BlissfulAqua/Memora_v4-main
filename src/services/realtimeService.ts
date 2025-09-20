type ActionMessage = { type: string; payload?: any };

class RealtimeService {
  private ws: WebSocket | null = null;
  private onActionCb: ((action: ActionMessage) => void) | null = null;
  private connected = false;
  private statusCbs: Array<(connected: boolean) => void> = [];

  connect(wsUrl: string) {
    if (this.ws) this.ws.close();
    this.ws = new WebSocket(wsUrl);
    this.ws.addEventListener('open', () => {
      console.log('[realtime] connected');
      this.connected = true;
      this.statusCbs.forEach(cb => cb(true));
    });
    this.ws.addEventListener('error', (ev) => {
      console.error('[realtime] websocket error', ev);
    });
    this.ws.addEventListener('message', ev => {
      try {
        const msg = JSON.parse(ev.data.toString());
        if (msg?.type === 'ACTION' && this.onActionCb) {
          this.onActionCb(msg.payload);
        }
      } catch (e) {
        console.warn('[realtime] invalid message', e);
      }
    });
    this.ws.addEventListener('close', () => {
      console.log('[realtime] disconnected');
      this.connected = false;
      this.statusCbs.forEach(cb => cb(false));
      this.ws = null;
    });
  }

  isConnected() {
    return this.connected && !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  onStatusChange(cb: (connected: boolean) => void) {
    this.statusCbs.push(cb);
    // return unsubscribe
    return () => {
      this.statusCbs = this.statusCbs.filter(c => c !== cb);
    };
  }

  login(username: string, password: string, room = 'demo') {
    if (!this.ws) throw new Error('WebSocket not connected');
    const payload = { username, password, room };

    const sendLogin = () => {
      try {
        this.ws?.send(JSON.stringify({ type: 'LOGIN', payload }));
        console.debug('[realtime] LOGIN sent', { username, room });
      } catch (e) {
        console.error('[realtime] Error sending LOGIN', e);
      }
    };

    // If socket is already open, send immediately. Otherwise queue until open.
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      sendLogin();
      return;
    }

    if (this.ws) {
      const onOpen = () => {
        sendLogin();
        try { this.ws?.removeEventListener('open', onOpen); } catch(e) { /* ignore */ }
      };
      this.ws.addEventListener('open', onOpen);
    }
  }

  sendAction(action: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'ACTION', payload: action }));
  }

  onAction(cb: (action: ActionMessage) => void) {
    this.onActionCb = cb;
  }

  disconnect() {
    if (this.ws) this.ws.close();
    this.ws = null;
    this.connected = false;
  }
}

const realtimeService = new RealtimeService();
export default realtimeService;
