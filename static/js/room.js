const socket = io();

// UI Elements
const videoGrid = document.getElementById('video-grid');
const localVideo = document.getElementById('local-video');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const toggleAudioBtn = document.getElementById('toggle-audio');
const toggleVideoBtn = document.getElementById('toggle-video');
const leaveRoomBtn = document.getElementById('leave-room');

// WebRTC and Media configuration
let localStream;
const peers = {}; // Store RTCPeerConnection objects by socket ID

const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Initialize Media
async function initMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        localVideo.srcObject = localStream;

        // After getting media, join the room via Socket
        socket.emit('join', { room: ROOM_CODE, username: USERNAME });
    } catch (err) {
        console.error("Error accessing media devices.", err);
        addChatMessage("System", "Error accessing camera/microphone. Please check permissions.", true);

        // Still join the room even if no media
        socket.emit('join', { room: ROOM_CODE, username: USERNAME });
    }
}

// Helper to create a new Peer Connection
function createPeerConnection(sid, username) {
    const pc = new RTCPeerConnection(iceServers);
    peers[sid] = pc;

    // Add local tracks to the connection
    if (localStream) {
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('webrtc_ice_candidate', {
                target_sid: sid,
                candidate: event.candidate
            });
        }
    };

    // Handle incoming streams
    pc.ontrack = (event) => {
        // Create video element if it doesn't exist
        let videoWrapper = document.getElementById(`wrapper-${sid}`);
        if (!videoWrapper) {
            videoWrapper = document.createElement('div');
            videoWrapper.id = `wrapper-${sid}`;
            videoWrapper.className = 'video-wrapper';

            const videoElement = document.createElement('video');
            videoElement.id = `video-${sid}`;
            videoElement.autoplay = true;
            videoElement.playsInline = true;

            const label = document.createElement('span');
            label.className = 'video-label';
            label.innerText = username;

            videoWrapper.appendChild(videoElement);
            videoWrapper.appendChild(label);
            videoGrid.appendChild(videoWrapper);
            makeDraggable(videoWrapper);
        }

        const videoElement = document.getElementById(`video-${sid}`);
        if (videoElement.srcObject !== event.streams[0]) {
            videoElement.srcObject = event.streams[0];
            videoElement.play().catch(e => console.error("Error playing remote video:", e));
        }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            removePeerVideo(sid);
            pc.close();
            delete peers[sid];
        }
    };

    return pc;
}

// Remove remote video element
function removePeerVideo(sid) {
    const wrapper = document.getElementById(`wrapper-${sid}`);
    if (wrapper) {
        wrapper.remove();
    }
}

// --- Socket Events (Signaling & Chat) ---

socket.on('user_joined', async (data) => {
    // New user joined, we need to send them an offer
    const sid = data.sid;
    const pc = createPeerConnection(sid, data.username);

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('webrtc_offer', {
            target_sid: sid,
            username: USERNAME,
            sdp: pc.localDescription
        });
    } catch (err) {
        console.error("Error creating offer:", err);
    }
});

socket.on('webrtc_offer', async (data) => {
    // Received an offer, create a peer connection and send an answer
    const sid = data.sender_sid;
    const pc = createPeerConnection(sid, data.sender_username);

    try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc_answer', {
            target_sid: sid,
            sdp: pc.localDescription
        });
    } catch (err) {
        console.error("Error handling offer:", err);
    }
});

socket.on('webrtc_answer', async (data) => {
    // Received an answer, complete the connection
    const sid = data.sender_sid;
    const pc = peers[sid];
    if (pc) {
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (err) {
            console.error("Error setting remote description from answer:", err);
        }
    }
});

socket.on('webrtc_ice_candidate', async (data) => {
    // Received an ICE candidate
    const sid = data.sender_sid;
    const pc = peers[sid];
    if (pc) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
            console.error("Error adding ICE candidate:", err);
        }
    }
});

socket.on('user_left', (data) => {
    removePeerVideo(data.sid);
    if (peers[data.sid]) {
        peers[data.sid].close();
        delete peers[data.sid];
    }
});

// --- Chat Logic ---

function addChatMessage(user, text, isSystem = false, image = null, audio = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';

    if (isSystem) {
        msgDiv.classList.add('system');
        msgDiv.innerText = text;
    } else {
        if (user === USERNAME) {
            msgDiv.classList.add('mine');
        } else {
            msgDiv.classList.add('theirs');
            const senderSpan = document.createElement('div');
            senderSpan.className = 'sender';
            senderSpan.innerText = user;
            msgDiv.appendChild(senderSpan);
        }

        if (text) {
            const textSpan = document.createElement('span');
            textSpan.innerText = text;
            msgDiv.appendChild(textSpan);
        }
        
        if (image) {
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-primary view-image-btn';
            viewBtn.innerText = '📸 View Once Image';
            viewBtn.onclick = () => {
                showImageModal(image);
                viewBtn.disabled = true;
                viewBtn.innerText = '❌ Expired';
                viewBtn.classList.remove('btn-primary');
                viewBtn.classList.add('btn-secondary');
                viewBtn.onclick = null; // Remove listener
            };
            msgDiv.appendChild(viewBtn);
        }
        
        if (audio) {
            const playBtn = document.createElement('button');
            playBtn.className = 'btn btn-primary play-audio-btn';
            playBtn.innerText = '▶️ Play Audio Message';
            playBtn.onclick = () => {
                const audioObj = new Audio(audio);
                audioObj.play();
                playBtn.innerText = '🔊 Playing...';
                playBtn.disabled = true;
                
                audioObj.onended = () => {
                    playBtn.innerText = '❌ Expired';
                    playBtn.classList.remove('btn-primary');
                    playBtn.classList.add('btn-secondary');
                    audioObj.src = ""; // destroy
                    playBtn.onclick = null;
                };
            };
            msgDiv.appendChild(playBtn);
        }
    }

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
}

socket.on('message', (data) => {
    if (data.user === 'System') {
        addChatMessage(data.user, data.text, true);
    } else {
        addChatMessage(data.user, data.text, false, data.image, data.audio);
    }
});

const typingIndicator = document.getElementById('typing-indicator');
const typingText = document.querySelector('.typing-text');
let typingTimer;
let isTyping = false;

function sendMessage() {
    const text = chatInput.value.trim();
    if (text) {
        socket.emit('send_message', {
            room: ROOM_CODE,
            username: USERNAME,
            text: text
        });
        chatInput.value = '';
        socket.emit('stop_typing', { room: ROOM_CODE, username: USERNAME });
        isTyping = false;
    }
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

chatInput.addEventListener('input', () => {
    if (!isTyping) {
        isTyping = true;
        socket.emit('typing', { room: ROOM_CODE, username: USERNAME });
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        isTyping = false;
        socket.emit('stop_typing', { room: ROOM_CODE, username: USERNAME });
    }, 1500);
});

socket.on('user_typing', (data) => {
    typingText.innerText = data.username;
    typingIndicator.style.display = 'flex';
    // Move indicator to bottom
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('user_stop_typing', (data) => {
    typingIndicator.style.display = 'none';
});

// --- Image Ephemeral Sharing Logic ---
const imageBtn = document.getElementById('image-btn');
const imageUpload = document.getElementById('image-upload');
const imageViewerOverlay = document.getElementById('image-viewer-overlay');
const closeViewerBtn = document.getElementById('close-viewer');
const viewerImg = document.getElementById('viewer-img');

imageBtn.addEventListener('click', () => {
    imageUpload.click();
});

imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        console.log("Compressing image...");
        compressImage(file, (base64Img) => {
            console.log("Image compressed, sending to server...");
            socket.emit('send_message', {
                room: ROOM_CODE,
                username: USERNAME,
                text: '', // Fallback empty text
                image: base64Img
            });
            // Reset input
            imageUpload.value = '';
        });
    }
});

function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.7)); // compress to ~70% JPEG quality
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function showImageModal(base64Img) {
    viewerImg.src = base64Img;
    imageViewerOverlay.style.display = 'flex';
}

closeViewerBtn.addEventListener('click', () => {
    imageViewerOverlay.style.display = 'none';
    viewerImg.src = ''; // Destroy data from DOM
});

// --- Audio Ephemeral Sharing Logic ---
const audioBtn = document.getElementById('audio-btn');
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

if (audioBtn) {
    audioBtn.addEventListener('mousedown', startAudioRecording);
    audioBtn.addEventListener('mouseup', stopAudioRecording);
    audioBtn.addEventListener('mouseleave', stopAudioRecording);
    audioBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startAudioRecording(); }, { passive: false });
    audioBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopAudioRecording(); }, { passive: false });
    audioBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); stopAudioRecording(); }, { passive: false });
}

function startAudioRecording() {
    if (isRecording) return;
    
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        isRecording = true;
        audioBtn.classList.add('recording');
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            
            // Stop tracks to release mic
            stream.getTracks().forEach(track => track.stop());
            
            // Send if we recorded something substantial
            if (audioBlob.size > 100) {
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    socket.emit('send_message', {
                        room: ROOM_CODE,
                        username: USERNAME,
                        text: '',
                        audio: reader.result
                    });
                };
            }
        };
        
        mediaRecorder.start();
    }).catch(err => {
        console.error("Error accessing microphone for recording: ", err);
        alert("Microphone permission denied or not available.");
    });
}

function stopAudioRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false;
    audioBtn.classList.remove('recording');
    if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

// --- Reactions Logic ---

const toggleReactionBtn = document.getElementById('toggle-reaction');
const reactionPanel = document.getElementById('reaction-panel');

toggleReactionBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    reactionPanel.classList.toggle('show');
});

document.addEventListener('click', (e) => {
    if (!reactionPanel.contains(e.target) && e.target !== toggleReactionBtn) {
        reactionPanel.classList.remove('show');
    }
});

document.querySelectorAll('.reaction-emoji').forEach(btn => {
    btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        socket.emit('reaction', { room: ROOM_CODE, reaction: emoji });
        reactionPanel.classList.remove('show');
    });
});

function showFloatingReaction(wrapperId, emoji) {
    const wrapper = document.getElementById(wrapperId);

    const reactionEl = document.createElement('div');
    reactionEl.className = 'floating-reaction';
    reactionEl.innerText = emoji;

    if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        // Add random horizontal offset (-40px to 40px)
        const randomX = (Math.random() - 0.5) * 80;
        reactionEl.style.left = `${startX + randomX}px`;
    } else {
        // Fallback if wrapper not found, just put it randomly on screen
        const randomLeft = 20 + Math.random() * 60;
        reactionEl.style.left = `${randomLeft}vw`;
    }

    document.body.appendChild(reactionEl);

    // Remove element after animation completes
    setTimeout(() => {
        if (reactionEl.parentNode === document.body) {
            document.body.removeChild(reactionEl);
        }
    }, 3600);
}

socket.on('reaction', (data) => {
    const isMe = data.sender_sid === socket.id;
    const wrapperId = isMe ? 'wrapper-local' : `wrapper-${data.sender_sid}`;

    // Wait, the local wrapper doesn't have an ID. Let's add it or use the class.
    const localWrapper = document.querySelector('.local-wrapper');
    if (isMe && localWrapper) {
        if (!localWrapper.id) localWrapper.id = 'wrapper-local';
    }

    showFloatingReaction(isMe ? 'wrapper-local' : `wrapper-${data.sender_sid}`, data.reaction);
});

// --- Controls Logic ---

toggleAudioBtn.addEventListener('click', () => {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            if (audioTrack.enabled) {
                toggleAudioBtn.classList.remove('inactive');
                toggleAudioBtn.classList.add('active');
                toggleAudioBtn.innerText = '🎤';
            } else {
                toggleAudioBtn.classList.remove('active');
                toggleAudioBtn.classList.add('inactive');
                toggleAudioBtn.innerText = '🔇';
            }
        }
    }
});

toggleVideoBtn.addEventListener('click', () => {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            if (videoTrack.enabled) {
                toggleVideoBtn.classList.remove('inactive');
                toggleVideoBtn.classList.add('active');
                toggleVideoBtn.innerText = '📷';
            } else {
                toggleVideoBtn.classList.remove('active');
                toggleVideoBtn.classList.add('inactive');
                toggleVideoBtn.innerText = '🚫';
            }
        }
    }
});

leaveRoomBtn.addEventListener('click', () => {
    socket.emit('leave', { room: ROOM_CODE, username: USERNAME });
    window.location.href = '/';
});

// Invite Copy Logic
const inviteBtn = document.getElementById('invite-btn');

if (inviteBtn) {
    inviteBtn.addEventListener('click', async () => {
        const inviteLink = `${window.location.origin}/`;
        const textToCopy = `Hey!\n\nJoin my BaatCheet video room.\n\nRoom Code: ${ROOM_CODE}\nSite: ${inviteLink}\n\nSee you there!`;
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            
            // Visual feedback
            const originalIcon = inviteBtn.innerText;
            inviteBtn.innerText = '✅';
            inviteBtn.classList.add('active');
            
            setTimeout(() => {
                inviteBtn.innerText = originalIcon;
                inviteBtn.classList.remove('active');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard. Room Code: ' + ROOM_CODE);
        }
    });
}

// Start everything
initMedia();

// --- Mobile Draggable Floating Windows Logic ---

function makeDraggable(el) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    el.addEventListener("touchstart", dragStart, { passive: false });
    el.addEventListener("touchend", dragEnd, false);
    el.addEventListener("touchmove", drag, { passive: false });

    el.addEventListener("mousedown", dragStart, false);
    document.addEventListener("mouseup", dragEnd, false);
    document.addEventListener("mousemove", drag, false);

    function dragStart(e) {
        if (window.innerWidth > 1024) return;

        // Prevent click events from propagating if we're dragging (or just bring to front)
        el.style.zIndex = 1000;

        if (e.type === "touchstart") {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }

        if (e.target === el || el.contains(e.target)) {
            isDragging = true;
        }
    }

    function dragEnd(e) {
        if (!isDragging) return;
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        el.style.zIndex = 50;
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();

            if (e.type === "touchmove") {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }

            xOffset = currentX;
            yOffset = currentY;

            el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
    }
}

// Make the local video draggable on mobile
const localWrapper = document.querySelector('.local-wrapper');
if (localWrapper) {
    makeDraggable(localWrapper);
}
