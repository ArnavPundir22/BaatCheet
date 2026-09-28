const EventEmitter = require('events');

class MockRedisClient extends EventEmitter {
    constructor() {
        super();
        this.store = new Map();
        this.lists = new Map();
        this.hashes = new Map();
        this.isReal = false;
    }
    async connect() { return true; }
    async quit() { return true; }
    duplicate() { return new MockRedisClient(); }
    async exists(key) { return (this.store.has(key) || this.hashes.has(key)) ? 1 : 0; }
    async set(key, val) { this.store.set(key, val); return 'OK'; }
    async setEx(key, ttl, val) { this.store.set(key, val); return 'OK'; }
    async get(key) { return this.store.get(key) || null; }
    async del(key) { this.store.delete(key); this.hashes.delete(key); this.lists.delete(key); return 1; }
    async hSet(key, field, val) {
        if (!this.hashes.has(key)) this.hashes.set(key, new Map());
        this.hashes.get(key).set(field, val);
        return 1;
    }
    async hDel(key, field) {
        if (this.hashes.has(key)) this.hashes.get(key).delete(field);
        return 1;
    }
    async hLen(key) {
        return this.hashes.has(key) ? this.hashes.get(key).size : 0;
    }
    async rPush(key, val) {
        if (!this.lists.has(key)) this.lists.set(key, []);
        this.lists.get(key).push(val);
        return this.lists.get(key).length;
    }
    async lRange(key, start, stop) {
        const arr = this.lists.get(key) || [];
        return arr.slice(start, stop === -1 ? undefined : stop + 1);
    }
    async expire(key, ttl) { return 1; }
    async keys(pattern) { return Array.from(this.store.keys()); }
}

let pubClient, subClient, redisClient;

if (process.env.REDIS_URL) {
    try {
        const { createClient } = require('redis');
        pubClient = createClient({ url: process.env.REDIS_URL });
        subClient = pubClient.duplicate();
        redisClient = createClient({ url: process.env.REDIS_URL });

        pubClient.on('error', () => {});
        subClient.on('error', () => {});
        redisClient.on('error', () => {});
        pubClient.isReal = true;
    } catch (e) {
        pubClient = new MockRedisClient();
        subClient = pubClient.duplicate();
        redisClient = new MockRedisClient();
    }
} else {
    pubClient = new MockRedisClient();
    subClient = pubClient.duplicate();
    redisClient = new MockRedisClient();
}

module.exports = {
    pubClient,
    subClient,
    redisClient
};
