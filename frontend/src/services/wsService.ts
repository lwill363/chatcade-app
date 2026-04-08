type MessageHandler = (event: unknown) => void;
type ConnectHandler = (isReconnect: boolean) => void;

class WsService {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private connectHandlers = new Set<ConnectHandler>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private wsUrl: string | null = null;
  private token: string | null = null;
  private closed = false;
  private hasConnectedBefore = false;

  connect(wsUrl: string, token: string) {
    this.closed = false;
    // Cancel any pending reconnect from the old session
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    // Close the previous WebSocket without triggering a reconnect
    const prev = this.ws;
    if (prev) {
      this.ws = null;
      prev.onclose = null;
      prev.close();
    }
    this.stopPing();
    this.wsUrl = wsUrl;
    this.token = token;
    this.reconnectDelay = 1000;
    this.hasConnectedBefore = false;
    this.open();
  }

  private open() {
    if (!this.wsUrl || !this.token || this.closed) return;

    const ws = new WebSocket(`${this.wsUrl}?token=${encodeURIComponent(this.token)}`);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.startPing();
      const isReconnect = this.hasConnectedBefore;
      this.hasConnectedBefore = true;
      this.connectHandlers.forEach((h) => h(isReconnect));
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as unknown;
        this.handlers.forEach((h) => h(data));
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      this.stopPing();
      if (!this.closed) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
          this.open();
        }, this.reconnectDelay);
      }
    };
  }

  // Update the stored token without reconnecting — used when the access token
  // is refreshed so that the next reconnect attempt uses the latest token.
  updateToken(token: string) {
    this.token = token;
  }

  disconnect() {
    this.closed = true;
    this.stopPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onclose = null; // prevent the deferred onclose from scheduling a reconnect
      ws.close();
    }
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onConnect(handler: ConnectHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => this.send({ type: "ping" }), 30_000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export const wsService = new WsService();
