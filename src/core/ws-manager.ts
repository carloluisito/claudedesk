import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import { Duplex } from 'stream';
import { parse as parseUrl } from 'url';

export interface WSMessage {
  type: string;
  sessionId?: string;
  content?: string;
  mode?: 'plan' | 'direct';
  [key: string]: unknown;
}

export interface WSClient {
  id: string;
  ws: WebSocket;
  token: string;
  subscribedSessions: Set<string>;
  isAlive: boolean;
}

type MessageHandler = (client: WSClient, message: WSMessage) => void | Promise<void>;
type UpgradeFallbackHandler = (request: IncomingMessage, socket: Duplex, head: Buffer) => void;

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private handlers: Map<string, MessageHandler> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private upgradeFallback: UpgradeFallbackHandler | null = null;

  /**
   * Set a fallback handler for non-/ws WebSocket upgrade requests.
   * Used to proxy WebSocket connections to Vite in dev mode.
   */
  setUpgradeFallback(handler: UpgradeFallbackHandler): void {
    this.upgradeFallback = handler;
  }

  initialize(server: Server, authToken: string): void {
    this.wss = new WebSocketServer({ noServer: true });

    // Handle HTTP upgrade requests
    server.on('upgrade', (request, socket, head) => {
      const { pathname, query } = parseUrl(request.url || '', true);

      if (pathname === '/ws') {
        // SEC-05: Prefer Sec-WebSocket-Protocol header over query string to avoid token in logs
        // Protocol header format: "token, <actual-token>" - the first value identifies the protocol,
        // the second is the actual authentication token
        let token: string | undefined;
        let useProtocolHeader = false;

        const protocolHeader = request.headers['sec-websocket-protocol'];
        if (protocolHeader) {
          // Parse "token, <actual-token>" format
          const protocols = typeof protocolHeader === 'string'
            ? protocolHeader.split(',').map(p => p.trim())
            : protocolHeader;
          if (protocols.length >= 2 && protocols[0] === 'token') {
            token = protocols[1];
            useProtocolHeader = true;
          }
        }

        // Fall back to query param for backward compatibility (deprecated)
        if (!token) {
          token = query.token as string;
        }

        if (token !== authToken) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          // If client used protocol header auth, echo back the protocol name
          // This is required by WebSocket spec when using Sec-WebSocket-Protocol
          if (useProtocolHeader) {
            // Note: ws library handles this automatically if we pass protocol to handleUpgrade
            // but we emit connection event manually, so client will receive the echo
          }
          this.wss!.emit('connection', ws, request, token);
        });
      } else if (this.upgradeFallback) {
        // Use fallback handler (e.g., proxy to Vite dev server)
        this.upgradeFallback(request, socket, head);
      } else {
        socket.destroy();
      }
    });

    // Handle new connections
    this.wss.on('connection', (ws: WebSocket, _request: IncomingMessage, token: string) => {
      const clientId = this.generateId();
      const client: WSClient = {
        id: clientId,
        ws,
        token,
        subscribedSessions: new Set(),
        isAlive: true,
      };

      this.clients.set(clientId, client);
      console.log(`[WS] Client connected: ${clientId}`);

      // Send welcome message
      this.send(client, { type: 'connected', clientId });

      // Handle incoming messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          await this.handleMessage(client, message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
          this.send(client, { type: 'error', error: 'Invalid message format' });
        }
      });

      // Handle pong for heartbeat
      ws.on('pong', () => {
        client.isAlive = true;
      });

      // Handle close
      ws.on('close', () => {
        console.log(`[WS] Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WS] Client error ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    // Start heartbeat to detect dead connections
    this.startHeartbeat();

    console.log('[WS] WebSocket server initialized');
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, id) => {
        if (!client.isAlive) {
          console.log(`[WS] Terminating inactive client: ${id}`);
          client.ws.terminate();
          this.clients.delete(id);
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // Check every 30 seconds
  }

  private async handleMessage(client: WSClient, message: WSMessage): Promise<void> {
    const handler = this.handlers.get(message.type);

    if (handler) {
      try {
        await handler(client, message);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[WS] Handler error for ${message.type}:`, errorMsg);
        this.send(client, { type: 'error', error: errorMsg });
      }
    } else {
      console.warn(`[WS] Unknown message type: ${message.type}`);
      this.send(client, { type: 'error', error: `Unknown message type: ${message.type}` });
    }
  }

  // Register a message handler
  on(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  // Send message to a specific client
  send(client: WSClient, message: WSMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  // Broadcast to all clients subscribed to a session
  broadcastToSession(sessionId: string, message: WSMessage): void {
    this.clients.forEach((client) => {
      if (client.subscribedSessions.has(sessionId)) {
        this.send(client, { ...message, sessionId });
      }
    });
  }

  // Broadcast to all connected clients
  broadcastAll(message: WSMessage): void {
    this.clients.forEach((client) => {
      this.send(client, message);
    });
  }

  // Subscribe client to a session
  subscribeToSession(client: WSClient, sessionId: string): void {
    client.subscribedSessions.add(sessionId);
    console.log(`[WS] Client ${client.id} subscribed to session ${sessionId}`);
  }

  // Unsubscribe client from a session
  unsubscribeFromSession(client: WSClient, sessionId: string): void {
    client.subscribedSessions.delete(sessionId);
    console.log(`[WS] Client ${client.id} unsubscribed from session ${sessionId}`);
  }

  // Get all clients subscribed to a session
  getSessionSubscribers(sessionId: string): WSClient[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.subscribedSessions.has(sessionId)
    );
  }

  // Get client count
  getClientCount(): number {
    return this.clients.size;
  }

  // Cleanup
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.ws.close();
    });
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }

    console.log('[WS] WebSocket server shut down');
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
