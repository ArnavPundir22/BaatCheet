# Product Requirements Document (PRD): AuraMeet 

## 1. Product Overview
**AuraMeet** is an ephemeral, ultra-cyberpunk-themed communication platform that combines real-time chat, WebRTC screen casting, and immersive 3D interactive environments. It transitions a standard utility into a highly engaging, premium SaaS experience.

## 2. Target Audience
- **Tech Enthusiasts & Gamers:** Users who appreciate high-fidelity, cyberpunk aesthetics and interactive 3D UI elements.
- **Privacy-Conscious Individuals:** Users who require ephemeral, zero-footprint communication (messages disappear after the session).
- **Remote Teams & Freelancers:** Professionals needing quick, secure, drop-in screen sharing for collaboration without long-term data retention.

## 3. The Problem it Solves
Standard communication tools (like Slack or Zoom) are visually sterile, retain massive amounts of data by default, and feel strictly utilitarian. AuraMeet solves the "boring utility" problem by offering a highly stylized, secure, and ephemeral meeting environment where users can share ideas and screens without leaving a permanent data trail.

## 4. Core Features

### Must-Have (MVP Core)
- **Ephemeral Real-Time Chat:** WebSocket-based chat where data is destroyed upon session end.
- **WhatsApp-Style Inline Replies:** Contextual quoting and preview banners for specific messages.
- **WebRTC Screen Casting (Desktop):** High-performance, peer-to-peer screen sharing.
- **"Leave & Destroy" Purge Animation:** A high-fidelity visual sequence (screen flickering, glitch text) that plays when a user exits, reinforcing the ephemeral nature.
- **SaaS Monetization & Auth:** PostgreSQL user accounts with a Razorpay-integrated "Pro Meeting Pass" for extended or premium sessions.

### Nice-to-Have (V1.5 / V2)
- **Interactive 3D Human Character:** Replacing basic loaders with a dynamic 3D rendering in the UI.
- **Customizable Cyberpunk Avatars:** Letting users tweak their visual identity.
- **End-to-End Encryption (E2EE):** Upgrading from ephemeral server storage to strict zero-knowledge encryption.

## 5. User Flow
1. **Onboarding & Landing:** User arrives at a highly stylized cyberpunk landing page featuring the interactive 3D character.
2. **Authentication / Guest Mode:** User can enter as a guest (limited time) or log in via PostgreSQL auth.
3. **Monetization Check:** If initiating a premium feature, the user is prompted to purchase a "Pro Meeting Pass" via Razorpay.
4. **The Room:** User enters the chat room. They can send real-time messages, use inline replies, and initiate desktop screen sharing.
5. **Mobile Handling:** If a mobile user tries to screen share, an "App Info & Tips" modal guides them to desktop, gracefully degrading the experience.
6. **Session End:** User clicks 'Leave'. The high-fidelity "Purge" glitch animation plays, and the user is redirected home as the session data is destroyed.

## 6. What the MVP Looks Like
A performant, Next.js or Vite-based web app hosted on a free-tier platform (like Render). It features a dark mode, glassmorphism UI with neon/cyberpunk accents. The database strictly manages user accounts and payments, while chat sessions run purely in memory or ephemeral Redis stores. 

## 7. Success Metrics
- **Activation:** Number of completed "Pro Meeting Pass" transactions via Razorpay.
- **Engagement:** Average session length (Target: >15 minutes for screen sharing sessions).
- **Retention:** Weekly Active Users (WAU) returning for multiple distinct sessions.
- **Performance:** Sub-200ms latency for chat messages and successful WebRTC connection rates.

## 8. Out of Scope (What we are NOT building in V1)
- **Mobile Screen Sharing:** Due to technical limitations, this is explicitly disabled with clear UI guidance to use desktop.
- **Persistent Chat History:** The core value proposition is ephemeral; no "save chat" feature will be built.
- **Complex Team Workspaces:** No channels, threads, or workspace administration (keeping it strictly "drop-in" rooms).
