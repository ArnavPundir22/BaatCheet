require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import Modules
const routes = require('./src/routes');
const setupSockets = require('./src/sockets');
const { pubClient, subClient, redisClient } = require('./src/config/redis');

const app = express();
const server = http.createServer(app);

// Trust the reverse proxy (e.g., Render, Heroku, Nginx) so rate limiter uses correct IP
app.set('trust proxy', 1);

// Setup Express Middleware
app.use(helmet({ contentSecurityPolicy: false })); 
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(morgan('combined'));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Use Routes
app.use('/', routes);

// Connect Redis
Promise.all([pubClient.connect(), subClient.connect(), redisClient.connect()]).then(() => {
    console.log('Connected to Redis');
}).catch(console.error);

// Socket.IO Setup
const io = new Server(server, {
    cors: { origin: '*' },
    adapter: createAdapter(pubClient, subClient),
    maxHttpBufferSize: 1e7 // 10MB
});

setupSockets(io);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).send('Internal Server Error');
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server listening on port ${PORT}`);
    });

    const shutdown = async () => {
        console.log('Graceful shutdown initiated...');
        server.close(async () => {
            console.log('HTTP server closed.');
            try {
                await pubClient.quit();
                await subClient.quit();
                await redisClient.quit();
                console.log('Redis connections closed.');
            } catch (err) {
                console.error('Error closing Redis connections:', err);
            }
            process.exit(0);
        });

        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

module.exports = { app, server, io, redisClient, pubClient, subClient };
