# Call-P - Customer Service Portal

A web-based customer service application with video/voice calling capabilities using PeerJS (WebRTC).

## Features

- **Video & Voice Calls** - Choose between video or audio-only calls
- **No Registration Required** - Customers connect instantly using consultant's ID
- **Real-time Communication** - Peer-to-peer WebRTC connections
- **Call Controls** - Mute microphone, toggle video, screen sharing, end call
- **Incoming Call Management** - Queue system for multiple incoming calls
- **Call History** - Track completed and rejected calls
- **Professional UI** - Clean, responsive design

## Quick Start

### Prerequisites

- Node.js installed (v14 or higher) - Download from https://nodejs.org
- A modern web browser (Chrome, Firefox, Edge)

### Run with Single Command

```bash
npm start
```

This will automatically start a local web server on port 3000.

Then open your browser to: **http://localhost:3000**

### Alternative: Run with npx (No Installation Needed)

If you don't have npm or want a truly zero-install experience:

```bash
npx serve .
```

## How to Use

### As a Consultant

1. Open http://localhost:3000
2. Click **"Open Dashboard"** 
3. Your unique Consultant ID will be displayed
4. Share this ID with customers who need to contact you
5. When a customer calls, you'll see an incoming call notification
6. Click Accept to start the call

### As a Customer

1. Open http://localhost:3000
2. Click **"Get Support"**
3. Enter your name (optional)
4. Enter the Consultant ID provided to you
5. Choose Video Call or Voice Call
6. Click **"Start Call"**
7. Wait for the consultant to accept

## Project Structure

```
Call-P/
├── index.html          # Landing page with role selection
├── consultant.html     # Consultant dashboard
├── customer.html       # Customer interface
├── package.json        # Node.js configuration
├── README.md          # This file
├── css/
│   └── styles.css     # All styles
└── js/
    ├── consultant.js  # Consultant-side PeerJS logic
    └── customer.js    # Customer-side PeerJS logic
```

## Technical Details

- **PeerJS** - WebRTC wrapper library loaded from CDN
- **PeerServer Cloud** - Free connection brokering (no server setup needed)
- **P2P Communication** - Video/audio streams are peer-to-peer (not relayed through servers)
- **HTTPS Note** - Camera/microphone access requires HTTPS in production. localhost works for development.

## Troubleshooting

### "No camera or microphone found"
- Make sure you have a camera/microphone connected
- Close other applications that might be using the camera (Zoom, Teams, etc.)

### "Camera/microphone access denied"
- Click the camera icon in your browser's address bar
- Select "Allow" for camera and microphone permissions
- Refresh the page

### "Consultant not found"
- Make sure you entered the correct Consultant ID
- Ensure the consultant's page is still open
- The consultant ID changes each time the page is refreshed

## Browser Support

- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 14+

## Deployment on Render

This app is configured for easy deployment on [Render](https://render.com).

### Quick Deploy

1. Push your code to a GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository
5. Render will auto-detect the `render.yaml` configuration

### Manual Setup

If you prefer manual configuration:

1. **Runtime**: Node
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. **Plan**: Free (or your preferred plan)

### Environment Variables

Configure these environment variables in Render:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `10000` | Render automatically sets this. The app reads from `process.env.PORT` |
| `NODE_ENV` | No | `production` | Set to `production` for deployment |

**Note**: This is a static file server with no backend secrets required. The PeerJS connection uses the public PeerServer Cloud, so no additional API keys are needed.

### Important Notes for Production

- **HTTPS**: Render provides free SSL certificates. Camera/microphone access requires HTTPS, which Render handles automatically.
- **WebRTC**: The app uses PeerJS Cloud for signaling. For high-traffic applications, consider hosting your own PeerJS server.

## License

MIT License