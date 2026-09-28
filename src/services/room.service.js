const { redisClient } = require('../config/redis');
const { makeid } = require('../utils/helpers');

async function generateRoomCode(length = 6) {
    while (true) {
        const code = makeid(length);
        const exists = await redisClient.exists(`room:${code}:exists`);
        if (!exists) return code;
    }
}

async function roomExists(code) {
    const exists1 = await redisClient.exists(`room:${code}:exists`);
    const exists2 = await redisClient.exists(`room:${code}:users`);
    return exists1 || exists2;
}

async function createRoom(code, name) {
    await redisClient.setEx(`room:${code}:exists`, 3600, "1");
    if (name) {
        await redisClient.setEx(`room:${code}:name`, 3600, name);
    }
}

async function getRoomName(code) {
    let name = await redisClient.get(`room:${code}:name`);
    if (!name) name = "Ephemeral Room";
    return name;
}

async function getActiveRoomsCount() {
    let activeRooms = 0;
    try {
        const keys = await redisClient.keys("room:*:exists");
        activeRooms = keys.length;
    } catch (e) { }
    return activeRooms;
}

async function addUserToRoom(room, sid, username) {
    await redisClient.hSet(`room:${room}:users`, sid, username);
    await redisClient.set(`sid:${sid}:room`, room);
    await redisClient.set(`sid:${sid}:username`, username);
}

async function removeUserFromRoom(sid) {
    const room = await redisClient.get(`sid:${sid}:room`);
    const username = await redisClient.get(`sid:${sid}:username`);
    
    if (!room || !username) return null;

    await redisClient.hDel(`room:${room}:users`, sid);
    await redisClient.del(`sid:${sid}:room`);
    await redisClient.del(`sid:${sid}:username`);

    const len = await redisClient.hLen(`room:${room}:users`);
    if (len === 0) {
        await redisClient.del(`room:${room}:exists`);
        await redisClient.del(`room:${room}:users`);
        await redisClient.del(`room:${room}:name`); // clean up name too
    }
    
    return { room, username };
}

// In-memory fallback if Redis is unavailable
const memoryTranscripts = new Map();

async function addTranscriptEntry(room, username, text, type = 'spoken') {
    if (!room || !text) return;
    const entry = JSON.stringify({
        username,
        text,
        type, // 'spoken' or 'chat'
        timestamp: new Date().toISOString()
    });

    try {
        await redisClient.rPush(`room:${room}:transcript`, entry);
        await redisClient.expire(`room:${room}:transcript`, 7200); // 2 hour TTL
    } catch (e) {
        if (!memoryTranscripts.has(room)) memoryTranscripts.set(room, []);
        memoryTranscripts.get(room).push(JSON.parse(entry));
    }
}

async function getRoomTranscript(room) {
    if (!room) return [];
    try {
        const raw = await redisClient.lRange(`room:${room}:transcript`, 0, -1);
        if (raw && raw.length > 0) {
            return raw.map(item => JSON.parse(item));
        }
    } catch (e) { }

    return memoryTranscripts.get(room) || [];
}

module.exports = {
    generateRoomCode,
    roomExists,
    createRoom,
    getRoomName,
    getActiveRoomsCount,
    addUserToRoom,
    removeUserFromRoom,
    addTranscriptEntry,
    getRoomTranscript
};

