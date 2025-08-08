const express = require("express");
const app = express();

let http = require("http").Server(app);

const port = process.env.PORT || 3000;

// WebRTC Signaling Server
// This server acts as a message broker between WebRTC peers
// It doesn't handle media - only coordinates the connection setup
const io = require("socket.io")(http, {
  cors: { origin: "*" },
});

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log(`Client connected with id: ${socket.id.substr(0, 2)}`);

  // STEP 1: Room Management
  // Handle clients joining rooms (max 2 clients for peer-to-peer connection)
  socket.on("create-or-join", (roomId) => {
    console.log(`Create or join to room: ${roomId}`);
    const myRoom = io.sockets.adapter.rooms.get(roomId) || new Set();
    const numClient = myRoom.size;
    console.log(`${roomId} has ${numClient} clients.`);

    if (numClient == 0) {
      // First user creates the room and becomes the caller
      socket.join(roomId);
      socket.emit("room-created", roomId);

    } else if (numClient == 1) {
      // Second user joins the room and becomes the callee
      socket.join(roomId);
      socket.emit("joined-room", roomId);

    } else {
      // Room is full (WebRTC peer-to-peer supports only 2 clients)
      socket.emit("full-room");
    }
  });

  // STEP 2: Initiate WebRTC Negotiation
  // When both users are ready, signal the caller to start the offer/answer process
  socket.on("room-ready-caller-can-send-offer", (roomId) => {
    console.log(`Room: ${roomId} is ready, caller will send offer soon...}`);
    // Notify the caller (first user) to begin creating and sending the offer
    socket.broadcast.to(roomId).emit("room-ready-caller-will-send-offer");
  });

  // STEP 3: ICE Candidate Exchange
  // Relay ICE candidates between peers for NAT traversal
  socket.on("candidate", (event) => {
    // Forward ICE candidate to the other peer in the room
    socket.broadcast.to(event.room).emit("candidate", event);
  });

  // STEP 4: SDP Offer Exchange
  // Forward the caller's offer to the callee
  socket.on("offer", (event) => {
    // Send the SDP offer to the second user (callee)
    socket.broadcast
      .to(event.room)
      .emit("second-user-handles-offer-and-will-send-answer", event.sdp);
  });

  // STEP 5: SDP Answer Exchange
  // Forward the callee's answer back to the caller
  socket.on("answer", (event) => {
    // Send the SDP answer to the first user (caller)
    socket.broadcast
      .to(event.room)
      .emit("second-user-sent-answer-and-first-user-takes-answer", event.sdp);
  });
});

http.listen(port, () => console.log(`Listening on ${port}...`));
