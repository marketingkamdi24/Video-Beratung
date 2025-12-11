const http = require('http');
const fs = require('fs');
const path = require('path');
const { PeerServer } = require('peer');

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();

const MIME = {
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

const server = http.createServer((req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(ROOT, reqPath);

    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Not found');
      }

      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on('error', () => res.end());
    });
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server error');
  }
});

// Attach PeerJS server to handle WebRTC signaling
const peerServer = PeerServer({
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

// Mount PeerJS server on the HTTP server
peerServer.install(server, { path: '/peerjs' });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}`);
  console.log(`PeerJS server available at http://localhost:${PORT}/peerjs`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
