interface WebSocketMessage {
  type: 'stdout' | 'stderr' | 'run';
  data?: string;
  message?: string;
}

interface CompilerPayload {
  command: 'run';
  code: string;
  language: string;
  input: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  connect(
    onMessage: (data: WebSocketMessage) => void,
    onError: (error: Event) => void,
    onClose: () => void
  ): WebSocket {
    try {
      this.ws = new WebSocket('wss://compiler.skillshikshya.com/ws/compiler/');

      this.ws.onopen = () => {
        console.log('Connected to WebSocket');
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          onMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        onError(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        onClose();
        this.ws = null;
        // Try to reconnect after 3 seconds
        this.reconnectTimeout = setTimeout(() => this.connect(onMessage, onError, onClose), 3000);
      };

      return this.ws;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      throw error;
    }
  }

  sendMessage(payload: CompilerPayload): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

export const websocketService = new WebSocketService();
