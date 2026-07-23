const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const clientOptions = {
    url: REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {
            console.warn(`Redis client reconnecting... Attempt #${retries}`);
            return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000 // 10 seconds
    }
};

const pubClient = createClient(clientOptions);
const subClient = createClient(clientOptions);
const redisClient = createClient(clientOptions);

// Attach mandatory error listeners to prevent uncaught exceptions
pubClient.on('error', (err) => console.error('Redis pubClient Error:', err));
subClient.on('error', (err) => console.error('Redis subClient Error:', err));
redisClient.on('error', (err) => console.error('Redis redisClient Error:', err));

module.exports = {
    pubClient,
    subClient,
    redisClient
};

