const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { ExpressPeerServer } = require('peer');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();

// Serve static files from root directory
app.use(express.static(ROOT, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg'
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
  }
}));

// Create HTTP server from Express app
const server = http.createServer(app);

// Create PeerJS server with ExpressPeerServer
const peerServer = ExpressPeerServer(server, {
  debug: 3,
  path: '/peerjs',
  proxied: true // Important for Render and other proxies
});

peerServer.on('connection', (client) => {
  console.log(`PeerJS client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`PeerJS client disconnected: ${client.getId()}`);
});

// Mount PeerServer on /peerjs path
app.use('/peerjs', peerServer);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}`);
  console.log(`PeerJS server available at http://localhost:${PORT}/peerjs`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
