const roomService = require('../services/room.service');

function setupSockets(io) {
    io.on('connection', (socket) => {
        socket.on('join', async (data) => {
            const { username, room } = data;
            const exists = await roomService.roomExists(room);
            if (!exists) return;

            socket.join(room);
            await roomService.addUserToRoom(room, socket.id, username);

            io.to(room).emit('message', { user: 'System', text: `${username} has joined the room.` });
            socket.to(room).emit('user_joined', { sid: socket.id, username });
        });

        socket.on('leave', async (data) => {
            const { username, room } = data;
            socket.leave(room);
            await handleUserLeave(io, socket.id, room, username);
        });

        socket.on('disconnect', async () => {
            const result = await roomService.removeUserFromRoom(socket.id);
            if (result) {
                io.to(result.room).emit('message', { user: 'System', text: `${result.username} has left the room.` });
                io.to(result.room).emit('user_left', { sid: socket.id, username: result.username });
            }
        });

        socket.on('send_message', async (data) => {
            const { room } = data;
            const exists = await roomService.roomExists(room);
            if (exists) {
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
}

async function handleUserLeave(io, sid, room, username) {
    if (!room || !username) return;
    await roomService.removeUserFromRoom(sid);
    io.to(room).emit('message', { user: 'System', text: `${username} has left the room.` });
    io.to(room).emit('user_left', { sid, username });
}

module.exports = setupSockets;
