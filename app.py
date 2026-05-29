import eventlet
eventlet.monkey_patch()

import os
import string
import random
import redis
from flask import Flask, render_template, request, redirect, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'super-secret-ephemeral-key')

# Setup Redis URL (defaults to localhost for development)
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')

# Connect to Redis
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# Setup SocketIO with Redis message queue for multi-worker scaling
socketio = SocketIO(
    app, 
    cors_allowed_origins="*", 
    async_mode='eventlet',
    message_queue=REDIS_URL
)

def generate_room_code(length=6):
    letters = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choice(letters) for _ in range(length))
        if not redis_client.exists(f"room:{code}:exists"):
            return code

@app.route('/sw.js')
def sw():
    return app.send_static_file('sw.js')

@app.route('/manifest.json')
def manifest():
    return app.send_static_file('manifest.json')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        action = request.form.get('action')
        username = request.form.get('username')
        
        if not username:
            return render_template('index.html', error="Username is required.")

        if action == 'create':
            room_code = generate_room_code()
            # Set a temporary marker for the room so it can be joined. 
            # It expires in 1 hour if no one actually connects via WebSockets.
            redis_client.setex(f"room:{room_code}:exists", 3600, "1")
            return redirect(url_for('room', room_code=room_code, username=username))
        
        elif action == 'join':
            room_code = request.form.get('room_code').upper()
            if redis_client.exists(f"room:{room_code}:exists") or redis_client.exists(f"room:{room_code}:users"):
                return redirect(url_for('room', room_code=room_code, username=username))
            else:
                return render_template('index.html', error="Invalid room code.")
                
    return render_template('index.html')

@app.route('/room/<room_code>')
def room(room_code):
    username = request.args.get('username')
    if not username:
        return redirect(url_for('index'))
        
    if not (redis_client.exists(f"room:{room_code}:exists") or redis_client.exists(f"room:{room_code}:users")):
        return redirect(url_for('index'))
        
    return render_template('room.html', room_code=room_code, username=username)

# --- Socket.IO Events ---

@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    
    # Check if room is valid
    if not (redis_client.exists(f"room:{room}:exists") or redis_client.exists(f"room:{room}:users")):
        return
        
    join_room(room)
    
    # Store user state in Redis
    redis_client.hset(f"room:{room}:users", request.sid, username)
    redis_client.set(f"sid:{request.sid}:room", room)
    redis_client.set(f"sid:{request.sid}:username", username)
    
    emit('message', {'user': 'System', 'text': f"{username} has joined the room."}, to=room)
    emit('user_joined', {'sid': request.sid, 'username': username}, to=room, include_self=False)

@socketio.on('leave')
def on_leave(data):
    username = data['username']
    room = data['room']
    _leave_room_logic(request.sid, room, username)

@socketio.on('disconnect')
def on_disconnect():
    room = redis_client.get(f"sid:{request.sid}:room")
    username = redis_client.get(f"sid:{request.sid}:username")
    if room and username:
        _leave_room_logic(request.sid, room, username)

def _leave_room_logic(sid, room, username):
    leave_room(room)
    
    # Remove user from Redis state
    redis_client.hdel(f"room:{room}:users", sid)
    redis_client.delete(f"sid:{sid}:room")
    redis_client.delete(f"sid:{sid}:username")
    
    emit('message', {'user': 'System', 'text': f"{username} has left the room."}, to=room)
    emit('user_left', {'sid': sid, 'username': username}, to=room)
    
    # If room is completely empty, wipe it from existence (Ephemeral design preserved!)
    if redis_client.hlen(f"room:{room}:users") == 0:
        redis_client.delete(f"room:{room}:exists")
        redis_client.delete(f"room:{room}:users")

@socketio.on('send_message')
def handle_message(data):
    room = data['room']
    if redis_client.exists(f"room:{room}:exists") or redis_client.exists(f"room:{room}:users"):
        emit('message', {'user': data['username'], 'text': data['text']}, to=room)

@socketio.on('typing')
def handle_typing(data):
    emit('user_typing', {'username': data['username']}, to=data['room'], include_self=False)

@socketio.on('stop_typing')
def handle_stop_typing(data):
    emit('user_stop_typing', {'username': data['username']}, to=data['room'], include_self=False)

@socketio.on('reaction')
def handle_reaction(data):
    emit('reaction', {'reaction': data['reaction'], 'sender_sid': request.sid}, to=data['room'])

# --- WebRTC Signaling Events ---

@socketio.on('webrtc_offer')
def handle_webrtc_offer(data):
    emit('webrtc_offer', {
        'sdp': data['sdp'],
        'sender_sid': request.sid,
        'sender_username': data['username']
    }, to=data['target_sid'])

@socketio.on('webrtc_answer')
def handle_webrtc_answer(data):
    emit('webrtc_answer', {
        'sdp': data['sdp'],
        'sender_sid': request.sid
    }, to=data['target_sid'])

@socketio.on('webrtc_ice_candidate')
def handle_ice_candidate(data):
    emit('webrtc_ice_candidate', {
        'candidate': data['candidate'],
        'sender_sid': request.sid
    }, to=data['target_sid'])

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
