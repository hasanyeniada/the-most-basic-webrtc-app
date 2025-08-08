let divSelectRoom = document.querySelector("#selectRoom");
let divConsultingRoom = document.querySelector("#consoltingRoom");
let inputRoomId = document.querySelector("#roomId");
let btnJoinRoom = document.querySelector("#goRoom");
let localVideo = document.querySelector("#localVideo");
let remoteVideo = document.querySelector("#remoteVideo");

// Global variables for WebRTC connection state
let roomId, localStream, remoteStream, rtcPeerConnection, isCaller;

// STUN servers for NAT traversal (production apps should use TURN servers too)
const iceServers = {
  iceServer: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

// Media constraints for getUserMedia
const streamConstraints = {
  audio: true,
  video: true,
};

// WebSocket connection to signaling server
const socket = io("ws://localhost:3000");

// UI Event: Join room button click
btnJoinRoom.addEventListener("click", () => {
  if (!inputRoomId.value) {
    alert("Please type a room name...");
  } else {
    roomId = inputRoomId.value;
    // Send room join request to signaling server
    socket.emit("create-or-join", roomId);
    divSelectRoom.style = "display: none";
    divConsultingRoom.style = "display: block";
  }
});

// STEP 1A: First user creates room and becomes the caller
socket.on("room-created", async (room) => {
  try {
    // Get user media (camera and microphone)
    const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
    localStream = stream;
    localVideo.srcObject = stream;
    isCaller = true; // Mark this user as the caller
    console.log(`The first user has created the room: ${room}`);
  } catch (err) {
    console.log("Error in getUserMedia", err);
  }
});

// STEP 1B: Second user joins room and becomes the callee
socket.on("joined-room", async (room) => {
  try {
    // Get user media (camera and microphone)
    const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
    localStream = stream;
    localVideo.srcObject = stream;
    console.log(`The second user has joined to room: ${room}`);
    // Signal that both users are ready to start WebRTC negotiation
    socket.emit("room-ready-caller-can-send-offer", room);
  } catch (err) {
    console.log("Error in getUserMedia", err);
  }
});

// STEP 2: Caller creates RTCPeerConnection and sends offer
// This happens when both users are ready to start WebRTC negotiation
socket.on("room-ready-caller-will-send-offer", async (data) => {
  console.log("room-ready-caller-will-send-offer");
  if (isCaller) {
    // Create RTCPeerConnection with STUN servers for NAT traversal
    rtcPeerConnection = new RTCPeerConnection(iceServers);

    // Set up event handlers for the peer connection
    rtcPeerConnection.onicecandidate = onIceCandidate; // Handle ICE candidates
    rtcPeerConnection.ontrack = onAddStream; // Handle incoming media stream

    // Add local media tracks to the peer connection
    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream); // Audio track
    rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream); // Video track

    // Create SDP offer (Session Description Protocol)
    // Contains codec information, media types, network details, etc.
    try {
      console.log("The first user sending offer...");
      let sessionDescription = await rtcPeerConnection.createOffer();
      // Set the offer as local description
      rtcPeerConnection.setLocalDescription(sessionDescription);

      // Send offer to the other peer via signaling server
      socket.emit("offer", {
        type: "offer",
        sdp: sessionDescription,
        room: roomId,
      });
    } catch (err) {
      console.log(err);
    }
  }
});

// STEP 3: Callee receives offer and sends answer
// The callee creates their RTCPeerConnection and responds to the offer
socket.on("second-user-handles-offer-and-will-send-answer", async (offerData) => {
    console.log(`The second user handles offer: ${JSON.stringify(offerData)}`);

    if (!isCaller) {
      // Create RTCPeerConnection for the callee
      rtcPeerConnection = new RTCPeerConnection(iceServers);

      // Set up event handlers for the peer connection
      rtcPeerConnection.onicecandidate = onIceCandidate; // Handle ICE candidates
      rtcPeerConnection.ontrack = onAddStream; // Handle incoming media stream

      // Add local media tracks to the peer connection
      rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream); // Audio track
      rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream); // Video track

      // Set the received offer as remote description
      // This puts the peer connection in "have-remote-offer" state
      await rtcPeerConnection.setRemoteDescription(
        new RTCSessionDescription(offerData)
      );

      // Create SDP answer in response to the offer
      try {
        console.log("The second user sending answer...");
        let sessionDescription = await rtcPeerConnection.createAnswer();
        // Set the answer as local description
        rtcPeerConnection.setLocalDescription(sessionDescription);

        // Send answer back to the caller via signaling server
        socket.emit("answer", {
          type: "answer",
          sdp: sessionDescription,
          room: roomId,
        });
      } catch (err) {
        console.log(err);
      }
    }
  }
);

// STEP 4: Caller receives answer and completes the connection
// The caller sets the answer as remote description, completing the SDP exchange
socket.on("second-user-sent-answer-and-first-user-takes-answer", (answerData) => {
    // Set the received answer as remote description
    // This completes the WebRTC negotiation process
    rtcPeerConnection.setRemoteDescription(
      new RTCSessionDescription(answerData)
    );
  }
);

// STEP 5: ICE Candidate Exchange (happens throughout the process)
// Handle incoming ICE candidates from the other peer
socket.on("candidate", (event) => {
  const candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  });
  console.log(
    `Client candidate event handler, candidate: ${JSON.stringify(candidate)}`
  );
  // Add the ICE candidate to establish the network connection
  rtcPeerConnection.addIceCandidate(candidate);
});

// Handle incoming remote media stream
// This function is called when the other peer's media is received
function onAddStream(event) {
  console.log("onAddStream");
  console.log(event);
  // Display the remote stream in the video element
  remoteVideo.srcObject = event.streams[0];
  remoteStream = event.streams[0];
}

// Handle ICE candidate generation
// This function is called when the browser finds network paths (ICE candidates)
function onIceCandidate(event) {
  console.log("onIceCandidate");
  if (event.candidate) {
    console.log(`Sending ice candidate ${JSON.stringify(event.candidate)}`);
    // Send the ICE candidate to the other peer via signaling server
    socket.emit("candidate", {
      type: "candidate",
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
      room: roomId,
    });
  }
}
