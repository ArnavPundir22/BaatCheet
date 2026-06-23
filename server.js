const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Setup Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Redis Setup
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();
const redisClient = createClient({ url: REDIS_URL }); // for state

Promise.all([pubClient.connect(), subClient.connect(), redisClient.connect()]).then(() => {
    console.log('Connected to Redis');
}).catch(console.error);

// Socket.IO Setup
const io = new Server(server, {
    cors: { origin: '*' },
    adapter: createAdapter(pubClient, subClient),
    maxHttpBufferSize: 1e7 // 10MB
});

// Helpers
function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function toHex(str) {
    return Buffer.from(str, 'utf8').toString('hex');
}

function fromHex(hex) {
    return Buffer.from(hex, 'hex').toString('utf8');
}

function generateTimestampParam() {
    const now = Math.floor(Date.now() / 1000);
    const earlier = now - Math.floor(Math.random() * 3600);
    return `${earlier}~${now}`;
}

async function generateRoomCode(length = 6) {
    while (true) {
        const code = makeid(length);
        const exists = await redisClient.exists(`room:${code}:exists`);
        if (!exists) return code;
    }
}

// Routes
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'static', 'sw.js')));
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'static', 'manifest.json')));
app.get('/favicon.ico', (req, res) => res.status(404).send());

app.get('/about', (req, res) => res.render('about'));

app.get('/', async (req, res) => {
    let activeRooms = 0;
    try {
        const keys = await redisClient.keys("room:*:exists");
        activeRooms = keys.length;
    } catch (e) { }
    res.render('index', { error: null, active_rooms: activeRooms });
});

app.post('/', async (req, res) => {
    let activeRooms = 0;
    try {
        const keys = await redisClient.keys("room:*:exists");
        activeRooms = keys.length;
    } catch (e) { }

    const { action, username, room_name, room_code } = req.body;

    if (!username) {
        return res.render('index', { error: "Username is required.", active_rooms: activeRooms });
    }

    if (action === 'create') {
        const newRoomCode = await generateRoomCode();
        await redisClient.setEx(`room:${newRoomCode}:exists`, 3600, "1");
        if (room_name) {
            await redisClient.setEx(`room:${newRoomCode}:name`, 3600, room_name);
        }
        const encodedRoom = toHex(newRoomCode);
        const encodedUser = toHex(username);
        const ts = generateTimestampParam();
        return res.redirect(`/secure/env-${encodedRoom}/session/sess-${encodedUser}?ts=${ts}`);
    } else if (action === 'join') {
        const code = (room_code || '').toUpperCase();
        const exists1 = await redisClient.exists(`room:${code}:exists`);
        const exists2 = await redisClient.exists(`room:${code}:users`);
        if (exists1 || exists2) {
            const encodedRoom = toHex(code);
            const encodedUser = toHex(username);
            const ts = generateTimestampParam();
            return res.redirect(`/secure/env-${encodedRoom}/session/sess-${encodedUser}?ts=${ts}`);
        } else {
            return res.render('index', { error: "Invalid room code.", active_rooms: activeRooms });
        }
    }
    res.redirect('/');
});

app.get('/join/:room_code', async (req, res) => {
    const { room_code } = req.params;
    const exists1 = await redisClient.exists(`room:${room_code}:exists`);
    const exists2 = await redisClient.exists(`room:${room_code}:users`);
    
    if (!(exists1 || exists2)) {
        let activeRooms = 0;
        try {
            const keys = await redisClient.keys("room:*:exists");
            activeRooms = keys.length;
        } catch (e) { }
        return res.render('index', { error: "Invalid or expired room code.", active_rooms: activeRooms });
    }

    let room_name = await redisClient.get(`room:${room_code}:name`);
    if (!room_name) room_name = "Ephemeral Room";

    res.render('join_direct', { room_code, room_name });
});


app.get('/secure/env-:encoded_room/session/sess-:encoded_user', async (req, res) => {
    let room_code, username;
    try {
        room_code = fromHex(req.params.encoded_room);
        username = fromHex(req.params.encoded_user);
    } catch (e) {
        return res.redirect('/');
    }

    if (!username || !room_code) return res.redirect('/');

    const exists1 = await redisClient.exists(`room:${room_code}:exists`);
    const exists2 = await redisClient.exists(`room:${room_code}:users`);
    if (!(exists1 || exists2)) return res.redirect('/');

    let room_name = await redisClient.get(`room:${room_code}:name`);
    if (!room_name) room_name = "Ephemeral Room";

    const turnConfig = process.env.TURN_URL ? {
        url: process.env.TURN_URL,
        username: process.env.TURN_USERNAME || '',
        credential: process.env.TURN_CREDENTIAL || ''
    } : null;

    res.render('room', { room_code, room_name, username, turnConfig: JSON.stringify(turnConfig) });
});

// Socket.IO
io.on('connection', (socket) => {
    socket.on('join', async (data) => {
        const { username, room } = data;
        const exists1 = await redisClient.exists(`room:${room}:exists`);
        const exists2 = await redisClient.exists(`room:${room}:users`);
        if (!(exists1 || exists2)) return;

        socket.join(room);
        await redisClient.hSet(`room:${room}:users`, socket.id, username);
        await redisClient.set(`sid:${socket.id}:room`, room);
        await redisClient.set(`sid:${socket.id}:username`, username);

        io.to(room).emit('message', { user: 'System', text: `${username} has joined the room.` });
        socket.to(room).emit('user_joined', { sid: socket.id, username });
    });

    const leaveRoomLogic = async (sid, room, username) => {
        if (!room || !username) return;
        
        // Remove user from Redis
        await redisClient.hDel(`room:${room}:users`, sid);
        await redisClient.del(`sid:${sid}:room`);
        await redisClient.del(`sid:${sid}:username`);

        io.to(room).emit('message', { user: 'System', text: `${username} has left the room.` });
        io.to(room).emit('user_left', { sid, username });

        // If room empty, wipe it
        const len = await redisClient.hLen(`room:${room}:users`);
        if (len === 0) {
            await redisClient.del(`room:${room}:exists`);
            await redisClient.del(`room:${room}:users`);
        }
    };

    socket.on('leave', async (data) => {
        const { username, room } = data;
        socket.leave(room);
        await leaveRoomLogic(socket.id, room, username);
    });

    socket.on('disconnect', async () => {
        const room = await redisClient.get(`sid:${socket.id}:room`);
        const username = await redisClient.get(`sid:${socket.id}:username`);
        if (room && username) {
            await leaveRoomLogic(socket.id, room, username);
        }
    });

    socket.on('send_message', async (data) => {
        const { room } = data;
        const exists1 = await redisClient.exists(`room:${room}:exists`);
        const exists2 = await redisClient.exists(`room:${room}:users`);
        if (exists1 || exists2) {
            const payload = { user: data.username };
            if (data.text) payload.text = data.text;
            if (data.image) payload.image = data.image;
            if (data.audio) payload.audio = data.audio;
            if (data.reply_to) payload.reply_to = data.reply_to;
            io.to(room).emit('message', payload);
        }
    });

    socket.on('typing', (data) => {
        socket.to(data.room).emit('user_typing', { username: data.username });
    });

    socket.on('stop_typing', (data) => {
        socket.to(data.room).emit('user_stop_typing', { username: data.username });
    });

    socket.on('reaction', (data) => {
        io.to(data.room).emit('reaction', { reaction: data.reaction, sender_sid: socket.id });
    });

    socket.on('screen_share_status', (data) => {
        socket.to(data.room).emit('screen_share_status', { is_sharing: data.is_sharing, sender_sid: socket.id });
    });

    socket.on('media_status', (data) => {
        socket.to(data.room).emit('media_status', { type: data.type, enabled: data.enabled, sender_sid: socket.id });
    });

    socket.on('air_draw_sync', (data) => {
        console.log(`Routing air draw from ${socket.id} to room ${data.room}`);
        socket.to(data.room).emit('air_draw_sync', { sender_sid: socket.id, points: data.points });
    });

    socket.on('webrtc_offer', (data) => {
        io.to(data.target_sid).emit('webrtc_offer', {
            sdp: data.sdp,
            sender_sid: socket.id,
            sender_username: data.username
        });
    });

    socket.on('webrtc_answer', (data) => {
        io.to(data.target_sid).emit('webrtc_answer', {
            sdp: data.sdp,
            sender_sid: socket.id
        });
    });

    socket.on('webrtc_ice_candidate', (data) => {
        io.to(data.target_sid).emit('webrtc_ice_candidate', {
            candidate: data.candidate,
            sender_sid: socket.id
        });
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});
