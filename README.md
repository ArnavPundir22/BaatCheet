<div align="center">
  <img src="static/banner.png" alt="BaatCheet Banner" width="100%" style="border-radius: 12px; margin-bottom: 20px;">
  
  # 💬 BaatCheet: Ephemeral Video & Text Chat

  *A sleek, modern, scalable, and fully ephemeral real-time communication platform built with Flask, WebRTC, Redis, and pure magic.*
  
  [![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://www.python.org/)
  [![Flask](https://img.shields.io/badge/Flask-Web%2BFramework-lightgrey?style=flat-square&logo=flask)](https://flask.palletsprojects.com/)
  [![Redis](https://img.shields.io/badge/Redis-State%20Management-red?style=flat-square&logo=redis)](https://redis.io/)
  [![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Streaming-green?style=flat-square&logo=webrtc)](https://webrtc.org/)
</div>

---

## 📖 Introduction

**BaatCheet** (meaning "Conversation" in Hindi) is a cutting-edge, real-time video and text chat application designed from the ground up for absolute privacy and zero persistence. When you join a room, you communicate directly via peer-to-peer WebRTC streams. When the last person leaves the room, the room and all its data are wiped from existence instantly.

No SQL databases. No chat history. No logs. Just pure, real-time, ephemeral communication.

---

## ✨ Key Features

- **🎥 Peer-to-Peer Video Calls:** High-quality, low-latency video streaming powered by native WebRTC and Google STUN servers.
- **💬 Real-Time Messaging:** WhatsApp-styled text chat interface with dynamic typing indicators.
- **👻 Fully Ephemeral Design:** Data only exists while people are present. Managed entirely by Redis TTLs and hash counts.
- **📱 Progressive Web App (PWA):** Fully installable mobile app experience. Works offline, launches in full-screen standalone mode without a browser bar.
- **🖼️ Responsive UI & Mobile PIP:** Stunning glassmorphism UI. On mobile devices, the video collapses into a draggable Picture-in-Picture (PIP) miniplayer.
- **🎉 Animated Reactions:** Instantly send fully animated emoji reactions (👍, ❤️, 😂, 🎉, 😘) that float seamlessly across the screen.
- **🎧 Advanced Audio Filtering:** Built-in echo cancellation, automatic gain control, and noise suppression for crystal clear audio.
- **🚀 Scalable Architecture:** Backend engineered with Redis to support multi-worker deployments (Gunicorn/Eventlet).

---

## 📚 Documentation Index

To keep this README clean, detailed technical documentation has been divided into specialized modules. Please explore the following guides to understand the inner workings of BaatCheet:

### 1. [🏗️ Architecture & Logic](docs/architecture.md)
Discover the backend mechanics, including:
- **WebRTC Signaling Flow:** How Offers, Answers, and ICE candidates are routed via Socket.IO.
- **Redis State Management:** The logic behind the ephemeral "No Database" design.
- **Worker Scaling:** How Redis Pub/Sub acts as a message queue for horizontal scaling.

### 2. [🎮 UI & Controls Logic](docs/ui-controls.md)
Dive into the frontend magic, including:
- **Mobile Miniplayer:** The drag-and-drop mathematics and CSS translation behind the floating PIP.
- **Media Controls:** How video and audio tracks are isolated and toggled.
- **Chat & Reactions:** The logic driving typing indicators and floating CSS animations.

### 3. [🚀 Deployment & Setup Guide](docs/deployment.md)
Learn how to run BaatCheet, including:
- **Local Setup:** Creating the Python environment and running Redis.
- **Production Execution:** Using Gunicorn with Eventlet workers.
- **HTTPS Requirements:** Why SSL is strictly necessary for WebRTC to function over the internet.

---

## 📲 Install as a Mobile App (PWA)

BaatCheet is a fully configured Progressive Web App (PWA). You can install it directly to your device for a native-like experience:

- **Android (Chrome):** Open the site, tap the menu (⋮), and select **"Install App"** or **"Add to Home Screen"**.
- **iOS (Safari):** Open the site in Safari, tap the **Share** button at the bottom, and select **"Add to Home Screen"**.
- **Desktop (Chrome/Edge):** Click the **Install** icon on the right side of the URL address bar.

---

## 🛠️ Quick Tech Stack Overview

- **Backend:** Python, Flask, Flask-SocketIO, Eventlet
- **Data Layer:** Redis (In-Memory Key-Value Store)
- **Frontend:** Vanilla JavaScript, HTML5, Vanilla CSS
- **Signaling Protocol:** WebSockets (Socket.IO)
- **Media Protocol:** WebRTC API

---

## 🔒 Security & Privacy Guarantee
This application does **not** use a permanent database. All room states and active connections are held entirely in Redis. Once the last person disconnects, the server executes a self-destruct sequence, ensuring the room automatically wipes itself from memory. 

---
<div align="center">
  <p>Built with ❤️ using Flask and WebRTC.</p>
</div>
