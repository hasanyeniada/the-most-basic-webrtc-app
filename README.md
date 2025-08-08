# Simple WebRTC Video Chat Application

A minimal WebRTC peer-to-peer video chat application demonstrating the complete WebRTC signaling process using Node.js and Socket.IO.

## Overview

This application implements a basic 1-to-1 video chat using WebRTC technology. It consists of:
- **Signaling Server** (`app.js`) - Node.js server that coordinates WebRTC connection setup
- **Client Application** (`public/main.js`) - Browser-based WebRTC client
- **Web Interface** (`public/index.html`) - Simple HTML interface for video chat

## Features

- Real-time peer-to-peer video and audio communication
- Room-based connections (2 users per room)
- STUN server support for NAT traversal
- Complete WebRTC signaling flow implementation
- Clean, educational code structure with detailed comments

## How WebRTC Works in This Application

### 1. Room Management
- First user creates a room and becomes the **caller**
- Second user joins the room and becomes the **callee**
- Maximum 2 users per room (peer-to-peer limitation)

### 2. Media Acquisition
- Both users request camera/microphone permissions
- Local media streams are displayed in local video elements

### 3. WebRTC Negotiation Process
1. **Signaling Ready**: Callee signals that both users are ready
2. **Offer Creation**: Caller creates SDP offer with media/network info
3. **Offer Exchange**: Signaling server forwards offer to callee
4. **Answer Creation**: Callee creates SDP answer in response
5. **Answer Exchange**: Signaling server forwards answer to caller
6. **ICE Candidates**: Both peers exchange network connectivity information

### 4. Direct Connection
- After successful negotiation, peers connect directly
- Media streams flow peer-to-peer (bypassing the server)

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   node app.js
   ```

3. **Open the Application**
   - Navigate to `http://localhost:3000` in your browser
   - Open a second tab or use another browser for the second user

## Usage

1. **First User**:
   - Enter a room name and click "Join Room"
   - Allow camera/microphone access
   - Wait for second user to join

2. **Second User**:
   - Enter the same room name and click "Join Room"
   - Allow camera/microphone access
   - WebRTC connection will automatically establish

## File Structure

```
├── app.js              # Signaling server (Node.js + Socket.IO)
├── public/
│   ├── index.html      # Web interface
│   └── main.js         # WebRTC client logic
├── package.json        # Project dependencies
└── README.md          # This file
```

## Technical Details

### Signaling Server (app.js)
- **Framework**: Express.js + Socket.IO
- **Purpose**: Coordinates WebRTC handshake (doesn't handle media)
- **Events**: Room management, SDP offer/answer exchange, ICE candidate relay

### Client Application (main.js)
- **WebRTC API**: RTCPeerConnection, getUserMedia
- **STUN Servers**: Mozilla and Google STUN servers for NAT traversal
- **Media Constraints**: Audio + Video enabled by default

## Network Requirements

- **STUN Servers**: Used for NAT traversal (public servers included)
- **Firewall**: Ensure WebRTC traffic is allowed
- **HTTPS**: Required for getUserMedia in production environments

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari (with WebRTC support)
- Edge

## Development Notes

- This is an educational/demo application
- For production use, consider:
  - TURN servers for better connectivity
  - Error handling and reconnection logic
  - User interface improvements
  - Security considerations (authentication, etc.)

## Common Issues

1. **Camera/Microphone Permission Denied**
   - Check browser permissions for the site
   - Ensure HTTPS in production

2. **Connection Failed**
   - Check network connectivity
   - Verify STUN server accessibility
   - Consider firewall/NAT issues

3. **"createAnswer" Error**
   - Fixed in current version by awaiting setRemoteDescription
   - Ensures proper peer connection state management

## License

This project is for educational purposes.