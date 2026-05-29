# 🚀 Deployment & Setup

This guide details how to configure, run, and deploy the BaatCheet application for both local development and production environments.

## 🛠 Prerequisites

Before starting, ensure you have the following installed on your system:
-   **Python 3.10+**: The backend framework is built on Python.
-   **Redis Server**: Required for state management and Socket.IO message queuing.
-   **Modern Web Browser**: Chrome, Firefox, Safari, or Edge (must support WebRTC).

## 💻 Local Development Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/yourusername/baatcheet.git
    cd baatcheet
    ```

2.  **Create a Virtual Environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Start Redis Server:**
    Make sure your local Redis server is running on the default port `6379`.
    ```bash
    redis-server
    ```

5.  **Run the Flask Development Server:**
    ```bash
    python app.py
    ```
    Access the app at `http://localhost:5000`.

## 🌐 Production Deployment (Gunicorn & Eventlet)

For production, the built-in Flask server is not sufficient. BaatCheet uses `gunicorn` with `eventlet` workers to handle asynchronous WebSocket connections efficiently.

### Running with Gunicorn

Use the following command to start the application (this is what the `Procfile` uses for platforms like Heroku/Render):
```bash
gunicorn --worker-class eventlet -w 1 app:app
```
*Note: Due to how Socket.IO manages state, it is recommended to start with `-w 1` (one worker). If you scale to multiple workers, ensure your `REDIS_URL` is correctly configured so the workers can communicate via the Redis message queue.*

### Environment Variables

You can customize the application behavior using the following environment variables:
-   `SECRET_KEY`: Security key for Flask sessions (Default: `super-secret-ephemeral-key`).
-   `REDIS_URL`: Connection string for your Redis instance (Default: `redis://localhost:6379`).
-   `PORT`: The port on which the server binds (Useful for cloud deployments).

## 🔒 A Note on HTTPS and WebRTC

WebRTC requires a secure context to access the user's camera and microphone.
-   **Localhost:** Browsers allow media access over `http://localhost`.
-   **Network/Internet:** If you access the application over a network IP (e.g., `http://192.168.1.5:5000`) or deploy it to a live domain without SSL, the browser will **block** camera and microphone access.
-   **Solution:** You MUST deploy the application behind an HTTPS proxy (like Nginx with Let's Encrypt), or use a cloud provider like Render or Heroku that automatically provisions SSL certificates.
