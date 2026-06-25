# 🏗️ BaatCheet Architecture

BaatCheet is built on a modern, fully ephemeral, and scalable architecture designed to handle real-time video, audio, and text communication with zero persistent storage.

## High-Level Overview

The architecture consists of three primary layers:
1.  **Client-Side (Frontend):** Pure Vanilla JavaScript, HTML5, and CSS3 handling WebRTC peer-to-peer media streams and Socket.IO for signaling/chat.
2.  **Application Server (Backend):** A Node.js Express application powered by `Socket.IO` for asynchronous WebSocket communication.
3.  **State Management (Data Layer):** Redis acts as both an in-memory key-value store for room/user state and a message queue for scaling across multiple worker processes.

```mermaid
graph LR
    subgraph Client-Side
        A["User A Browser"]
        B["User B Browser"]
    end

    subgraph Backend Server
        C["Node.js + Socket.IO Instance 1"]
        D["Node.js + Socket.IO Instance 2"]
    end

    subgraph Data Layer
        E[("Redis State & Pub/Sub")]
    end

    subgraph External
        F(("Google STUN Servers"))
    end

    %% WebRTC Peer-to-Peer (Media)
    A <==>|"WebRTC P2P Video/Audio"| B

    %% Signaling & Chat
    A <-->|"WebSockets Signaling/Chat"| C
    B <-->|"WebSockets Signaling/Chat"| D

    %% Redis connection
    C <-->|"Read/Write State & Pub/Sub"| E
    D <-->|"Read/Write State & Pub/Sub"| E

    %% STUN
    A -.->|"ICE Candidate Discovery"| F
    B -.->|"ICE Candidate Discovery"| F

    classDef default fill:#1e1e1e,stroke:#00f3ff,stroke-width:2px,color:#fff;
    classDef database fill:#0a0a19,stroke:#ff00ea,stroke-width:2px,color:#fff;
    classDef external fill:#2d1f35,stroke:#ff7b54,stroke-width:2px,color:#fff;
    class E database
    class F external
```

---

## 🔗 WebRTC & Signaling Flow

BaatCheet uses WebRTC for peer-to-peer video and audio streaming, meaning media does *not* route through the server, ensuring extremely low latency and high privacy. The server's only job in the media pipeline is **signaling** (exchanging connection data).

### The Signaling Process
1.  **Join Event:** A client joins a room via Socket.IO (`socket.emit('join')`).
2.  **Offer Creation:** Existing users in the room receive a `user_joined` event. They create an `RTCPeerConnection`, generate a WebRTC Offer (SDP), and send it to the new user via the server (`webrtc_offer`).
3.  **Answer Creation:** The new user receives the offer, sets it as their remote description, generates an Answer (SDP), and sends it back (`webrtc_answer`).
4.  **ICE Candidates:** Throughout this process, clients discover their public IP addresses using Google's public STUN servers (`stun.l.google.com:19302`). These network paths (ICE candidates) are exchanged via the server (`webrtc_ice_candidate`).
5.  **P2P Connection Established:** Once SDPs and ICE candidates are exchanged, a direct peer-to-peer connection is established. Video and audio tracks are attached to dynamic `<video>` elements in the DOM.

#### WebRTC Sequence Diagram
```mermaid
sequenceDiagram
    participant P1 as Peer 1 (Existing)
    participant S as Node.js Server
    participant P2 as Peer 2 (New User)
    
    P2->>S: join(room_code)
    S-->>P1: user_joined(P2_id)
    Note over P1: Create RTCPeerConnection<br/>Generate SDP Offer
    P1->>S: webrtc_offer(Offer, P2_id)
    S-->>P2: webrtc_offer(Offer, P1_id)
    Note over P2: Set Remote Description<br/>Generate SDP Answer
    P2->>S: webrtc_answer(Answer, P1_id)
    S-->>P1: webrtc_answer(Answer, P2_id)
    Note over P1,P2: Simultaneous ICE Candidate Discovery via STUN
    P1->>S: webrtc_ice_candidate(Candidate)
    S-->>P2: webrtc_ice_candidate(Candidate)
    P2->>S: webrtc_ice_candidate(Candidate)
    S-->>P1: webrtc_ice_candidate(Candidate)
    Note over P1,P2: P2P Connection Established
```

### Mobile Device Capabilities
- **Camera/Microphone:** Fully supported on all modern mobile browsers (iOS Safari, Android Chrome) via `getUserMedia` (requires HTTPS).
- **Screen Sharing:** Mobile operating systems inherently block web applications from capturing the screen for security reasons (`getDisplayMedia` is unsupported). Mobile users can seamlessly *view* screens shared by desktop users, but cannot broadcast their own screens. The UI elegantly intercepts this limitation and provides an educational modal.

---

## 🧠 Redis State Management (The Ephemeral Design)

BaatCheet strictly adheres to a "No Database" policy for absolute privacy. All state is stored in Redis and is highly volatile. This architecture is intentionally chosen over traditional SQL (PostgreSQL/MySQL) or NoSQL (MongoDB) databases because:
1.  **Speed:** Redis operates entirely in memory, making state queries (like checking if a room exists) near instantaneous.
2.  **Built-in TTL (Time to Live):** Keys can be programmed to self-destruct. We leverage this to automatically clean up orphaned rooms.
3.  **No Residual Data:** Traditional databases write to disk, meaning deleted data could potentially be recovered from storage sectors. Redis guarantees that once memory is freed, the data is gone forever.

### Redis Key Schema
-   `room:{room_code}:exists` (String): A temporary marker set when a room is created. It has a TTL of 3600 seconds (1 hour). If no one joins, the room expires automatically.
-   `room:{room_code}:name` (String): An optional custom name assigned to the room by the creator. Uses the exact same 3600s TTL as the existence key.
-   `room:{room_code}:users` (Hash): Stores active users in a room. Key = Socket ID (`socket.id`), Value = Username.
-   `sid:{sid}:room` (String): Maps a user's Socket ID to their current room code (O(1) lookup on disconnect).
-   `sid:{sid}:username` (String): Maps a user's Socket ID to their username.

To build trust and prove the "Zero-Log" guarantee, the backend actively queries Redis for active room counts (by scanning `room:*:exists`) and displays it in real-time on the landing page.

### Ephemeral Cleanup Logic
When a user disconnects or clicks "Leave Room", the server intercepts the `disconnect` event:
1.  Removes the user from the `room:{room_code}:users` hash.
2.  Deletes their `sid:*` keys.
3.  **The Self-Destruct Sequence:** If the `room:{room_code}:users` hash becomes empty (length == 0), the server immediately deletes the `room:{room_code}:exists` and `room:{room_code}:users` keys. The room is wiped from existence instantly.

---

## 🚀 Scaling & Concurrency

By default, WebSockets bind users to a specific server process. If you run multiple Node.js instances, a user on Instance A cannot communicate with a user on Instance B.

**The Solution: Redis Adapter**
BaatCheet initializes `Socket.IO` with the `@socket.io/redis-adapter`:
```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
io.adapter(createAdapter(pubClient, subClient));
```
This configures a pub/sub mechanism. When Instance A emits a message to a room, it publishes the event to Redis. All other instances subscribe to this event and forward the message to any connected clients in that room. This allows BaatCheet to scale horizontally across multiple servers or containers with ease.
