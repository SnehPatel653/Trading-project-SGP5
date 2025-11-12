/**
 * WebSocket Server for Live Updates
 */

const WebSocket = require('ws');
const { getSession, startTradingSession, stopTradingSession } = require('../trading/liveTrading');

let wss;

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'subscribe':
            // Subscribe to updates
            ws.sessionId = data.sessionId;
            if (data.sessionId) {
              startTradingSession(data.sessionId, ws);
            }
            ws.send(JSON.stringify({ type: 'subscribed', sessionId: data.sessionId }));
            break;
          
          case 'unsubscribe':
            if (ws.sessionId) {
              stopTradingSession(ws.sessionId);
            }
            ws.send(JSON.stringify({ type: 'unsubscribed' }));
            break;
          
          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      if (ws.sessionId) {
        stopTradingSession(ws.sessionId);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
  });

  console.log('WebSocket server initialized');
}

function broadcast(data) {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}

module.exports = { setupWebSocket, broadcast };

