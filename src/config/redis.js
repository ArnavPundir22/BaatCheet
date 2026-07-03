const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();
const redisClient = createClient({ url: REDIS_URL }); // for state

module.exports = {
    pubClient,
    subClient,
    redisClient
};
