# Functional Architecture Document (FAD) - BaatCheet

## 1. Introduction
This document defines the functional scope of the BaatCheet platform, focusing on real-time interactions, ephemeral workflows, and the highly stylized cyberpunk user experience.

## 2. User Roles & Personas
- **Guest User:** An unauthenticated user participating in a temporary, free-tier session.
- **Pro User (Planned V1.5):** An authenticated user who has purchased a "Pro Meeting Pass," enabling extended session limits or advanced features.
- **System (The Purge Protocol):** An automated actor responsible for ensuring the absolute destruction of data when sessions end.

## 3. Core Functional Modules

### 3.1 Room Management Module
- **Room Generation:** Creating unique, cryptographically secure room identifiers.
- **Access Control:** Validating room codes and managing the entry/exit of participants.
- **State Destruction:** The "Leave & Destroy" function that guarantees room deletion upon the exit of the last user.

### 3.2 Real-Time Chat Engine
- **Text Exchange:** Instantaneous bidirectional message passing.
- **Inline Replies:** WhatsApp-style context quoting, visually tailored to the cyberpunk UI.
- **Typing Indicators:** Visual cues indicating active participation.

### 3.3 Media & Signaling Engine
- **WebRTC Orchestration:** Passing Session Description Protocol (SDP) offers, answers, and ICE candidates between peers.
- **Mobile Graceful Degradation:** A system that detects mobile user agents and displays an "App Info & Tips" modal, preventing broken screen-sharing experiences by redirecting them to desktop usage.

### 3.4 UI/UX Animation Module
- **Cyberpunk Aesthetics:** Managing dark mode, neon accents, and glassmorphism layouts.
- **The Purge Animation:** A high-fidelity visual sequence (screen flickering, glitch text, spinning loaders) that executes immediately prior to the user being redirected home upon session exit.

## 4. Process Flows

### 4.1 Room Creation & Join Flow
1. User enters a Username and optional Room Name on the landing page.
2. User clicks "Create".
3. System generates a 6-character code, registers it in Redis (1-hour TTL), and redirects the user to `/room/<code>`.
4. The client establishes a WebSocket connection, completing the 'Join' process.

### 4.2 Desktop Screen Sharing Flow
1. User A (on Desktop) clicks "Share Screen".
2. Browser prompts for screen permission.
3. User A's client generates a WebRTC Offer and sends it via Socket.io.
4. User B's client receives the Offer, generates an Answer, and sends it back.
5. P2P video stream commences.

### 4.3 "Leave & Destroy" Flow
1. User clicks the "Leave" button.
2. The UI triggers the Glitch/Purge animation.
3. A WebSocket `leave` event is dispatched to the server.
4. Server removes the user from the Redis room hash.
5. If the room is empty, the Server deletes all room data.
6. The UI animation concludes, and the user is redirected to the home page.
