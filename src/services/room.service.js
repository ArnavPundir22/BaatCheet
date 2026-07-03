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

module.exports = {
    generateRoomCode,
    roomExists,
    createRoom,
    getRoomName,
    getActiveRoomsCount,
    addUserToRoom,
    removeUserFromRoom
};
