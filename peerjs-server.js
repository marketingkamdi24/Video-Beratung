// Self-hosted PeerJS Server
// This ensures reliable peer-to-peer connections for the Call-P application

const express = require('express');
const { PeerServer } = require('peer');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Port for PeerJS server (use environment variable or default to 9000)
const PEER_PORT = process.env.PEER_PORT || 9000;

// Create PeerJS server with configuration
const peerServer = PeerServer({
    debug: 3, // Log level
    allow_discovery: true, // Allow discovery of peer IDs (optional, for debugging)
    path: '/peerjs',
    proxied: true // Behind a proxy (important for Render)
});

// Attach PeerJS server to Express
app.use('/peerjs', peerServer);

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).send('PeerJS server is running');
});

// Start server
server.listen(PEER_PORT, '0.0.0.0', () => {
    console.log(`PeerJS server running at port ${PEER_PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
