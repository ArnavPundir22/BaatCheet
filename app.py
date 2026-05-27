import eventlet
eventlet.monkey_patch()

import string
import random
from flask import Flask, render_template, request, redirect, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'super-secret-ephemeral-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory storage for active rooms
# Format: { 'room_code': { 'users': {'session_id': 'username'} } }
active_rooms = {}

def generate_room_code(length=6):
    letters = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choice(letters) for _ in range(length))
        if code not in active_rooms:
            return code

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        action = request.form.get('action')
        username = request.form.get('username')
        
        if not username:
            return render_template('index.html', error="Username is required.")

        if action == 'create':
            room_code = generate_room_code()
            active_rooms[room_code] = {'users': {}}
            return redirect(url_for('room', room_code=room_code, username=username))
        
        elif action == 'join':
            room_code = request.form.get('room_code').upper()
            if room_code in active_rooms:
                return redirect(url_for('room', room_code=room_code, username=username))
            else:
                return render_template('index.html', error="Invalid room code.")
                
    return render_template('index.html')

@app.route('/room/<room_code>')
def room(room_code):
    username = request.args.get('username')
    if not username:
        return redirect(url_for('index'))
        
    if room_code not in active_rooms:
        return redirect(url_for('index'))
        
    return render_template('room.html', room_code=room_code, username=username)

# --- Socket.IO Events ---

@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    
    if room not in active_rooms:
        return
        
    join_room(room)
    active_rooms[room]['users'][request.sid] = username
    
    # Notify others in the room
    emit('message', {'user': 'System', 'text': f"{username} has joined the room."}, to=room)
    # Send the updated list of users to everyone in the room
    emit('user_joined', {'sid': request.sid, 'username': username}, to=room, include_self=False)

@socketio.on('leave')
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    
    if room in active_rooms and request.sid in active_rooms[room]['users']:
        del active_rooms[room]['users'][request.sid]
        
        # Notify others
        emit('message', {'user': 'System', 'text': f"{username} has left the room."}, to=room)
        emit('user_left', {'sid': request.sid, 'username': username}, to=room)
        
        # If room is empty, delete it
        if len(active_rooms[room]['users']) == 0:
            del active_rooms[room]

@socketio.on('disconnect')
def on_disconnect():
    # Find which room the user was in
    for room_code, room_data in list(active_rooms.items()):
        if request.sid in room_data['users']:
            username = room_data['users'][request.sid]
            leave_room(room_code)
            del room_data['users'][request.sid]
            
            emit('message', {'user': 'System', 'text': f"{username} has disconnected."}, to=room_code)
            emit('user_left', {'sid': request.sid, 'username': username}, to=room_code)
            
            if len(room_data['users']) == 0:
                del active_rooms[room_code]

@socketio.on('send_message')
def handle_message(data):
    room = data['room']
    if room in active_rooms:
        emit('message', {'user': data['username'], 'text': data['text']}, to=room)

@socketio.on('typing')
def handle_typing(data):
    room = data['room']
    if room in active_rooms:
        emit('user_typing', {'username': data['username']}, to=room, include_self=False)

@socketio.on('stop_typing')
def handle_stop_typing(data):
    room = data['room']
    if room in active_rooms:
        emit('user_stop_typing', {'username': data['username']}, to=room, include_self=False)

@socketio.on('reaction')
def handle_reaction(data):
    room = data['room']
    if room in active_rooms:
        emit('reaction', {'reaction': data['reaction'], 'sender_sid': request.sid}, to=room)

# --- WebRTC Signaling Events ---

@socketio.on('webrtc_offer')
def handle_webrtc_offer(data):
    # Relay offer to the specific peer
    emit('webrtc_offer', {
        'sdp': data['sdp'],
        'sender_sid': request.sid,
        'sender_username': data['username']
    }, to=data['target_sid'])

@socketio.on('webrtc_answer')
def handle_webrtc_answer(data):
    # Relay answer back to the peer that created the offer
    emit('webrtc_answer', {
        'sdp': data['sdp'],
        'sender_sid': request.sid
    }, to=data['target_sid'])

@socketio.on('webrtc_ice_candidate')
def handle_ice_candidate(data):
    # Relay ICE candidate to the specific peer
    emit('webrtc_ice_candidate', {
        'candidate': data['candidate'],
        'sender_sid': request.sid
    }, to=data['target_sid'])

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
