type MessageHandler = (event: unknown) => void;

class WsService {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private wsUrl: string | null = null;
  private token: string | null = null;
  private closed = false;

  connect(wsUrl: string, token: string) {
    this.wsUrl = wsUrl;
    this.token = token;
    this.closed = false;
    this.open();
  }

  private open() {
    if (!this.wsUrl || !this.token || this.closed) return;

    const ws = new WebSocket(`${this.wsUrl}?token=${encodeURIComponent(this.token)}`);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.startPing();
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

  disconnect() {
    this.closed = true;
    this.stopPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.ws?.close();
    this.ws = null;
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
