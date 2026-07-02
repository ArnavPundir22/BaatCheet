<div align="center">
  <img src="static/banner.png" alt="AuraMeet Banner" width="100%" style="border-radius: 12px; margin-bottom: 20px;">
  
  # 💬 AuraMeet: Ephemeral Video & Chat

  *A sleek, modern, scalable, and fully ephemeral real-time communication platform built with Node.js, WebRTC, Redis, and pure magic.*
  
  [![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square&logo=node.js)](https://nodejs.org/)
  [![Express](https://img.shields.io/badge/Express-Web%2BFramework-lightgrey?style=flat-square&logo=express)](https://expressjs.com/)
  [![Redis](https://img.shields.io/badge/Redis-State%20Management-red?style=flat-square&logo=redis)](https://redis.io/)
  [![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Streaming-blue?style=flat-square&logo=webrtc)](https://webrtc.org/)
</div>

---

## 📑 Table of Contents
- [📖 Introduction](#-introduction)
- [✨ Key Features](#-key-features)
- [💼 Professional & Enterprise Use Cases](#-professional--enterprise-use-cases)
- [📚 Documentation Index](#-documentation-index)
- [📲 Install as a Mobile App (PWA)](#-install-as-a-mobile-app-pwa)
- [🛠️ Quick Tech Stack Overview](#️-quick-tech-stack-overview)
- [🔒 Security & Privacy Guarantee](#-security--privacy-guarantee)

---

## 📖 Introduction

**AuraMeet** (meaning "Conversation" in Hindi) is a cutting-edge, real-time video and text chat application designed from the ground up for absolute privacy and zero persistence. When you join a room, you communicate directly via peer-to-peer WebRTC streams. When the last person leaves the room, the room and all its data are wiped from existence instantly.

No SQL databases. No chat history. No logs. Just pure, real-time, ephemeral communication.

---

## ✨ Key Features

- **🎥 Peer-to-Peer Video Calls:** High-quality, low-latency video streaming powered by native WebRTC and TURN fallback integration.
- **💬 Real-Time Messaging:** WhatsApp-styled text chat interface with dynamic typing indicators.
- **🖼️ View-Once Ephemeral Images:** Send images directly in the chat that are automatically compressed and transmitted purely over WebSockets. Once viewed and closed, the image data is instantly and permanently destroyed.
- **👻 Fully Ephemeral Design:** Data only exists while people are present. Managed entirely by Redis TTLs and hash counts.
- **📱 Progressive Web App (PWA):** Fully installable mobile app experience. Works offline, launches in full-screen standalone mode without a browser bar.
- **📱 Notch-Aware UI:** Built-in dynamic padding that automatically respects mobile safe-area insets (`env(safe-area-inset-bottom)`) ensuring your UI is never blocked by iOS/Android home indicators.
- **🖼️ Responsive UI & Mobile PIP:** Stunning glassmorphism UI. On mobile devices, the video collapses into a draggable Picture-in-Picture (PIP) miniplayer.
- **🎨 Multiplayer Air Draw:** A dynamic, synchronized canvas overlay that allows users to draw directly on the video feed in real-time. Hand-tracked strokes are smoothly rendered and instantly broadcasted to all participants, making visual collaboration seamless.
- **🎉 Animated Reactions & Emoji Gallery:** A comprehensive, dark-mode glassmorphic emoji picker (powered by `emoji-picker-element`). Accessible from both the chat input and the reaction toolbar, allowing users to send fully animated floating reactions across the screen or use them inline in text chats.
- **🎧 Advanced Audio Filtering:** Built-in echo cancellation, automatic gain control, and noise suppression for crystal clear audio.
- **🚀 Scalable Architecture:** Backend engineered with Node.js and Redis `@socket.io/redis-adapter` to support multi-process deployments.

---

## 💼 Professional & Enterprise Use Cases

AuraMeet is engineered for high-stakes, confidential communications where privacy is non-negotiable. By enforcing an ephemeral architecture, it mitigates data liability and protects sensitive information.

- **⚖️ Legal Consultations:** Maintain absolute attorney-client privilege. Without database records or logs, communications cannot be subpoenaed.
- **🏥 Telemedicine & Healthcare:** Conduct secure, non-persistent health consultations. Patient data is transmitted securely and never stored, aligning with strict privacy standards.
- **🏢 Executive Briefings:** Prevent corporate espionage and data leaks during sensitive strategic discussions and mergers.
- **🛡️ Investigative Journalism:** Protect the identity of sensitive sources. Ephemeral rooms ensure there is no digital trail of the conversation.

*For enterprise deployments, custom integrations, or dedicated support, please contact the developer or open an issue on the repository.*

---

## 📚 Documentation Index

To keep this README clean, detailed technical documentation has been divided into specialized modules. Please explore the following guides to understand the inner workings of AuraMeet:

### 1. [🏗️ Architecture & Logic](docs/architecture.md)
Discover the backend mechanics, including:
- **WebRTC Signaling Flow:** How Offers, Answers, and ICE candidates are routed via Socket.IO.
- **Redis State Management:** The logic behind the ephemeral "No Database" design.
- **Node.js Scaling:** How Redis acts as a pub/sub message queue for horizontal scaling.

### 2. [🎮 UI & Controls Logic](docs/ui-controls.md)
Dive into the frontend magic, including:
- **Mobile Miniplayer:** The drag-and-drop mathematics and CSS translation behind the floating PIP.
- **Media Controls:** How video and audio tracks are isolated and toggled.
- **Chat & Reactions:** The logic driving typing indicators and floating CSS animations.

### 3. [🚀 Deployment & Setup Guide](docs/deployment.md)
Learn how to run AuraMeet, including:
- **Local Setup:** Initializing Node.js and running Redis.
- **Production Execution:** Deploying to platforms like Render or Heroku.
- **HTTPS & TURN Requirements:** Why SSL and TURN servers are strictly necessary for WebRTC to function over the internet.

---

## 📲 Install as a Mobile App (PWA)

AuraMeet is a fully configured Progressive Web App (PWA). You can install it directly to your device for a native-like experience:

- **Android (Chrome):** Open the site, tap the menu (⋮), and select **"Install App"** or **"Add to Home Screen"**.
- **iOS (Safari):** Open the site in Safari, tap the **Share** button at the bottom, and select **"Add to Home Screen"**.
- **Desktop (Chrome/Edge):** Click the **Install** icon on the right side of the URL address bar.

---

## 🛠️ Quick Tech Stack Overview

- **Backend:** Node.js, Express, Socket.IO
- **Data Layer:** Redis (In-Memory Key-Value Store)
- **Frontend:** Vanilla JavaScript, HTML5, Vanilla CSS, EJS
- **Signaling Protocol:** WebSockets (Socket.IO)
- **Media Protocol:** WebRTC API

---

## 🔒 Security & Privacy Guarantee
This application does **not** use a permanent database. All room states and active connections are held entirely in Redis. Once the last person disconnects, the server executes a self-destruct sequence, ensuring the room automatically wipes itself from memory. 

---
<div align="center">
  <p>Built with ❤️ using Node.js and WebRTC.</p>
</div>
