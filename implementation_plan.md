# Implementation Plan: Flask Ephemeral Video & Text Chat Application

## 1. Overview
The goal is to build an ephemeral web-based chat application supporting text, voice, and video streaming. Users can create a room, receive a unique code, and share it with others. The chat and video history will not be saved (ephemeral), and the rooms will dissolve once all members leave.

## 2. Technology Stack
*   **Backend:** Python, Flask
*   **WebSocket/Signaling:** Flask-SocketIO (Eventlet/Gevent)
*   **Frontend UI:** HTML5, CSS3, JavaScript
*   **Media Streaming:** WebRTC (Web Real-Time Communication) API (Native browser support)
*   **Database:** None (In-memory storage for active rooms only)

## 3. Core Architecture
WebRTC requires a "signaling server" to coordinate communication. Flask-SocketIO will act as this signaling server, relaying connection data (SDP offers/answers and ICE candidates) between peers. Once the peers are connected via WebRTC, video and audio flow directly between them (Peer-to-Peer), bypassing the Flask server. Text chat will be handled via Socket.IO.

## 4. Feature Breakdown & Logic
*   **Room Creation & Joining:**
    *   User clicks "Create Room". Flask generates a random unique string (e.g., `A7X9Q2`), stores it in memory (e.g., a Python dictionary `active_rooms = {'A7X9Q2': ['user1_id']}`), and redirects the user to the room URL.
    *   Another user enters the code. Flask checks `active_rooms`. If valid, the user joins the room.
*   **Ephemeral Data Management:**
    *   Text messages are broadcasted instantly to the room via Socket.IO.
    *   When a user disconnects, they are removed from the `active_rooms` dictionary.
    *   If a room becomes empty, the room key is deleted from memory. No data is written to disk.
*   **Video/Voice (WebRTC Signaling Flow):**
    1.  User A joins the room, accesses their webcam (`getUserMedia`), and waits.
    2.  User B joins the room. User B creates an SDP Offer and sends it to the Flask server via Socket.IO.
    3.  Flask server broadcasts the Offer to User A.
    4.  User A receives the Offer, sets it as remote description, creates an SDP Answer, and sends it back to Flask.
    5.  Flask relays the Answer to User B.
    6.  Both users exchange ICE candidates (network routing info) through Flask.
    7.  P2P media connection is established.

## 5. Step-by-Step Implementation Guide

### Phase 1: Project Setup
1.  Initialize a Python virtual environment.
2.  Install requirements: `pip install Flask Flask-SocketIO eventlet`.
3.  Set up the basic Flask folder structure (`app.py`, `templates/`, `static/`).

### Phase 2: Backend (Flask & SocketIO)
1.  Initialize Flask app and SocketIO server in `app.py`.
2.  Create routes:
    *   `/` -> Home page (Create/Join room form).
    *   `/room/<code>` -> The actual chat/video room interface.
3.  Create SocketIO event handlers:
    *   `join_room`: Add user to a SocketIO room and notify others.
    *   `leave_room`: Remove user and handle cleanup.
    *   `send_message`: Broadcast text messages to the specific room.
    *   `webrtc_offer`, `webrtc_answer`, `webrtc_ice_candidate`: Relay these payloads between specific clients in the room.

### Phase 3: Frontend (UI/UX)
1.  **Index Page:** Simple form with a "Create Room" button and an input field to "Join via Code".
2.  **Room Page:**
    *   Video grid container (Local video element + Remote video elements).
    *   Chat sidebar (Message history window + Input + Send button).
    *   Controls (Mute audio, Disable video, Leave room).

### Phase 4: WebRTC Client Logic (JavaScript)
1.  On page load, prompt user for camera/mic permissions using `navigator.mediaDevices.getUserMedia()`.
2.  Display the local stream in a `<video>` tag muted.
3.  Initialize `RTCPeerConnection` for new peers.
4.  Handle SocketIO events to trigger `createOffer()`, `setRemoteDescription()`, and `createAnswer()`.
5.  Listen for `icecandidate` events on the `RTCPeerConnection` and send them to the server.
6.  Listen for `track` events to receive remote video streams and attach them to dynamically created `<video>` tags.

### Phase 5: Security and Deployment
1.  **HTTPS Requirement:** Browsers *strictly block* camera/microphone access on plain HTTP connections unless you are on `localhost`. For deployment, you MUST use SSL/TLS (HTTPS).
2.  **STUN/TURN Servers:** WebRTC requires STUN servers to discover public IP addresses. Google provides free STUN servers (`stun:stun.l.google.com:19302`). For users behind strict firewalls/NATs, a TURN server (like Twilio or Coturn) may be required to relay media traffic.

## 6. Project Structure
```text
BaatChit/
│
├── app.py                  # Main Flask application and SocketIO logic
├── requirements.txt        # Python dependencies
├── static/
│   ├── css/
│   │   └── style.css       # Custom styling
│   └── js/
│       ├── main.js         # Home page logic (join/create)
│       └── room.js         # WebRTC and Chat logic
└── templates/
    ├── index.html          # Landing page
    └── room.html           # Video and chat interface
```
