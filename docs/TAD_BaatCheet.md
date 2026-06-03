# Technical Architecture Document (TAD) - BaatCheet

## 1. Introduction
This document outlines the technical architecture for **BaatCheet**, an ephemeral, cyberpunk-themed real-time communication platform. It focuses on zero-footprint state management, WebRTC peer-to-peer data transfers, and WebSocket communication.

## 2. Technology Stack

### 2.1 Backend Framework
- **Framework:** Flask (Version 3.1.3)
- **Language:** Python (Version 3.x)
- **WebSockets:** Flask-SocketIO (Version 5.6.1) powered by `eventlet` (Version 0.36.1) for asynchronous concurrency.
- **WSGI Server:** Gunicorn (Version 22.0.0) configured for eventlet worker classes.

### 2.2 In-Memory Data Store & Message Broker
- **Database/Cache:** Redis (Version 5.0.3)
- **Usage:** Used as an ephemeral data store (tracking room existence and user state) and as a message queue for scaling SocketIO across multiple worker processes.

### 2.3 Frontend Technologies
- **UI Architecture:** Server-rendered Jinja2 templates (via Flask) combined with heavy vanilla JavaScript for client-side interactivity.
- **Real-Time Data:** Socket.io client library for text and metadata exchange.
- **Media Streaming:** WebRTC API native to modern browsers for high-performance peer-to-peer screen casting.
- **Styling:** Custom Vanilla CSS tailored for a "glassmorphism" cyberpunk aesthetic.

### 2.4 Infrastructure & Integrations (Future/Planned)
- **Persistence:** PostgreSQL (planned for SaaS user accounts).
- **Payments:** Razorpay (planned for "Pro Meeting Pass" monetization).

## 3. Architecture Pattern
- **Event-Driven Architecture:** The core communication relies on WebSocket events (`join`, `send_message`, `webrtc_offer`, etc.) rather than traditional REST paradigms.
- **Ephemeral State Pattern:** Redis keys are created with short TTLs (Time-To-Live). When the last user leaves a room, all associated data is programmatically wiped, ensuring a zero-footprint design.

## 4. Development Environment
- **Runtime:** Python Virtual Environment (`venv`).
- **Dependencies Management:** `requirements.txt`.
