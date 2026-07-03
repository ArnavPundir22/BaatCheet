const roomService = require('../services/room.service');
const { toHex, fromHex, generateTimestampParam } = require('../utils/helpers');

async function renderIndex(req, res) {
    const activeRooms = await roomService.getActiveRoomsCount();
    res.render('index', { error: null, active_rooms: activeRooms });
}

async function handleAction(req, res) {
    const activeRooms = await roomService.getActiveRoomsCount();
    const { action, username, room_name, room_code } = req.body;

    if (!username) {
        return res.render('index', { error: "Username is required.", active_rooms: activeRooms });
    }

    if (action === 'create') {
        const newRoomCode = await roomService.generateRoomCode();
        await roomService.createRoom(newRoomCode, room_name);
        
        const encodedRoom = toHex(newRoomCode);
        const encodedUser = toHex(username);
        const ts = generateTimestampParam();
        return res.redirect(`/secure/env-${encodedRoom}/session/sess-${encodedUser}?ts=${ts}`);
    } else if (action === 'join') {
        const code = (room_code || '').toUpperCase();
        const exists = await roomService.roomExists(code);
        
        if (exists) {
            const encodedRoom = toHex(code);
            const encodedUser = toHex(username);
            const ts = generateTimestampParam();
            return res.redirect(`/secure/env-${encodedRoom}/session/sess-${encodedUser}?ts=${ts}`);
        } else {
            return res.render('index', { error: "Invalid room code.", active_rooms: activeRooms });
        }
    }
    res.redirect('/');
}

async function joinDirect(req, res) {
    const { room_code } = req.params;
    const exists = await roomService.roomExists(room_code);
    
    if (!exists) {
        const activeRooms = await roomService.getActiveRoomsCount();
        return res.render('index', { error: "Invalid or expired room code.", active_rooms: activeRooms });
    }

    const room_name = await roomService.getRoomName(room_code);
    res.render('join_direct', { room_code, room_name });
}

async function renderRoom(req, res) {
    let room_code, username;
    try {
        room_code = fromHex(req.params.encoded_room);
        username = fromHex(req.params.encoded_user);
    } catch (e) {
        return res.redirect('/');
    }

    if (!username || !room_code) return res.redirect('/');

    const exists = await roomService.roomExists(room_code);
    if (!exists) return res.redirect('/');

    const room_name = await roomService.getRoomName(room_code);

    const turnConfig = process.env.TURN_URL ? {
        url: process.env.TURN_URL,
        username: process.env.TURN_USERNAME || '',
        credential: process.env.TURN_CREDENTIAL || ''
    } : null;

    res.render('room', { room_code, room_name, username, turnConfig: JSON.stringify(turnConfig) });
}

module.exports = {
    renderIndex,
    handleAction,
    joinDirect,
    renderRoom
};
