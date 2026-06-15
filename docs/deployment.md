# 🚀 Deployment & Setup

This guide details how to configure, run, and deploy the BaatCheet application for both local development and production environments.

## 🛠 Prerequisites

Before starting, ensure you have the following installed on your system:
-   **Node.js 18+**: The backend framework is built on Node.js.
-   **Redis Server**: Required for state management and Socket.IO message queuing/scaling.
-   **Modern Web Browser**: Chrome, Firefox, Safari, or Edge (must support WebRTC).

## 💻 Local Development Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/ArnavPundir22/BaatCheet.git
    cd BaatCheet
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Start Redis Server:**
    Make sure your local Redis server is running on the default port `6379`.
    ```bash
    redis-server
    ```

4.  **Run the Node.js Development Server:**
    ```bash
    npm start
    ```
    Access the app at `http://localhost:5000`.

## 🌐 Production Deployment (Render / Heroku / Custom VPS)

For production, BaatCheet is designed to deploy seamlessly on modern platforms like Render. It uses `express` and `socket.io` to handle asynchronous WebSocket connections efficiently.

### Running in Production

Use the following command to start the application (platforms like Render will detect this via `package.json`):
```bash
npm start
```
*Note: If you scale to multiple instances (e.g., Node.js cluster or multiple horizontal containers), ensure your `REDIS_URL` is correctly configured so the instances can communicate via the Redis Adapter.*

### Environment Variables

You can customize the application behavior using the following environment variables:
-   `PORT`: The port on which the server binds (Default: `5000`).
-   `REDIS_URL`: Connection string for your Redis instance (Default: `redis://localhost:6379`).
-   `TURN_URL`: The URL of your TURN server for reliable WebRTC video routing (e.g., `turn:global.relay.metered.ca:80`).
-   `TURN_USERNAME`: Username for your TURN server.
-   `TURN_CREDENTIAL`: Password/Credential for your TURN server.

## 🔒 A Note on HTTPS, TURN, and WebRTC

WebRTC requires a secure context to access the user's camera and microphone.
-   **Localhost:** Browsers allow media access over `http://localhost`.
-   **Network/Internet:** If you access the application over a network IP (e.g., `http://192.168.1.5:5000`) or deploy it to a live domain without SSL, the browser will **block** camera and microphone access.
-   **Solution (HTTPS):** You MUST deploy the application behind an HTTPS proxy (like Nginx with Let's Encrypt), or use a cloud provider like Render or Heroku that automatically provisions SSL certificates.
-   **Solution (TURN):** To ensure 100% connectivity for users on strict corporate, university, or 5G networks (Symmetric NAT), you must configure a TURN server via the environment variables listed above. Free TURN servers can be acquired from providers like Metered.ca.
