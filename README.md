<div align="center">
  <img src="static/banner.png" alt="BaatCheet Banner" width="100%" style="border-radius: 12px; margin-bottom: 20px;">
  
  # 💬 BaatCheet: Ephemeral Video & Text Chat

  *A sleek, modern, scalable, and fully ephemeral real-time communication platform built with Flask, WebRTC, Redis, and pure magic.*
</div>

---

## ✨ Features

- **🎥 Peer-to-Peer Video Calls:** High-quality, low-latency video streaming powered by native WebRTC and Google STUN servers.
- **💬 Real-Time Messaging:** WhatsApp-styled text chat interface with dynamic typing indicators.
- **👻 Fully Ephemeral:** No persistent SQL databases, no logs, no chat history. Once everyone leaves a room, the data is gone forever.
- **📱 Fully Responsive Design:** Stunning glassmorphism UI with a dynamic mobile layout featuring a YouTube-style floating Picture-in-Picture (PIP) miniplayer.
- **🎉 Animated Reactions:** Instantly send fully animated emoji reactions (👍, ❤️, 😂, 🎉, 😘) that float seamlessly across the entire screen!
- **🎧 Advanced Audio Filtering:** Built-in echo cancellation, automatic gain control, and noise suppression for crystal clear audio.
- **🚀 Scalable Architecture:** Backend engineered with Redis to support multi-worker deployments (Gunicorn/Eventlet), easily handling thousands of concurrent connections.

## 🚀 Quick Start

### Prerequisites
- Python 3.10
- Redis Server (local or cloud)
- A modern web browser with WebRTC support (Chrome, Firefox, Safari)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/baatcheet.git
   cd baatcheet
   ```

2. **Install dependencies:**
   *(Ensure you have Flask, Flask-SocketIO, Eventlet, and Redis installed)*
   ```bash
   pip install -r requirements.txt
   ```

3. **Start your Redis Server:**
   Ensure you have a Redis instance running locally on port `6379`, or set your `REDIS_URL` environment variable.

4. **Run the server (Production Mode):**
   ```bash
   gunicorn --worker-class eventlet -w 1 app:app
   ```
   *Note: For camera and microphone access to work over the internet on non-localhost devices, you must serve the application over **HTTPS** or deploy it to a platform like Render.*

5. **Access the application:**
   Open your browser and navigate to `http://localhost:8000` (Gunicorn default port).

## 🛠️ Tech Stack

- **Backend:** Python, Flask, Flask-SocketIO, Eventlet
- **State Management:** Redis (In-Memory Key-Value Store)
- **Frontend:** Vanilla JavaScript, HTML5, Vanilla CSS
- **Signaling:** WebSockets (Socket.IO)
- **Media Streaming:** WebRTC API

## 📱 Mobile Experience
BaatCheet is designed to feel like a native application on mobile devices.
- **Floating Miniplayer:** The video feed collapses into a picture-in-picture window while chatting.
- **Smart Controls:** Controls intuitively adapt and wrap perfectly based on your screen size.
- **Dynamic Glassmorphism:** Deep blurs and frosted glass panels that maintain performance on mobile devices.

## 🔒 Security & Privacy
This application does **not** use a permanent database. All room states and active connections are held entirely in Redis with TTLs (Time-To-Live). Once the last person disconnects, the room automatically self-destructs and wipes itself from existence.

---
<div align="center">
  <p>Built with ❤️ using Flask and WebRTC.</p>
</div>
