const socket = io();

// UI Elements
const videoGrid = document.getElementById('video-grid');
const localVideo = document.getElementById('local-video');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const toggleAudioBtn = document.getElementById('toggle-audio');
const toggleVideoBtn = document.getElementById('toggle-video');
const shareScreenBtn = document.getElementById('share-screen');
const leaveRoomBtn = document.getElementById('leave-room');

// Reply Elements
let replyingTo = null;
const replyPreview = document.getElementById('reply-preview');
const replyPreviewUser = document.getElementById('reply-preview-user');
const replyPreviewText = document.getElementById('reply-preview-text');
const cancelReplyBtn = document.getElementById('cancel-reply-btn');

if (cancelReplyBtn) {
    cancelReplyBtn.addEventListener('click', cancelReply);
}

function cancelReply() {
    replyingTo = null;
    if (replyPreview) replyPreview.style.display = 'none';
}

// --- Visual Viewport Fix for Mobile Keyboard ---
function adjustViewport() {
    if (window.innerWidth <= 1024) {
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        const sidebar = document.querySelector('.chat-sidebar');
        if (sidebar) {
            sidebar.style.height = `${vh}px`;
        }
        document.body.style.height = `${vh}px`;
        window.scrollTo(0, 0);
    } else {
        const sidebar = document.querySelector('.chat-sidebar');
        if (sidebar) {
            sidebar.style.height = ''; 
        }
        document.body.style.height = '';
        
        // Reset draggable transforms when switching back to desktop
        document.querySelectorAll('.video-wrapper').forEach(w => {
            if (typeof w.resetDrag === 'function') {
                w.resetDrag();
            }
        });
    }
}

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', adjustViewport);
    window.visualViewport.addEventListener('scroll', adjustViewport);
}
window.addEventListener('resize', adjustViewport);
// Initial call
adjustViewport();

// WebRTC and Media configuration
let localStream;
let screenStream = null;
let originalVideoTrack = null;
const peers = {}; // Store RTCPeerConnection objects by socket ID

const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

if (window.TURN_CONFIG && window.TURN_CONFIG.url) {
    iceServers.iceServers.push({
        urls: window.TURN_CONFIG.url,
        username: window.TURN_CONFIG.username,
        credential: window.TURN_CONFIG.credential
    });
}

// Initialize Media
async function initMedia() {
    console.log("navigator =", navigator);
    console.log("navigator.mediaDevices =", navigator.mediaDevices);
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
        addChatMessage("System", "🔒 History is never saved. You are seeing live messages only.", true);
    } catch (err) {
        console.error("Error accessing media devices.", err);
        addChatMessage("System", "Error accessing camera/microphone. Please check permissions.", true);

        // Still join the room even if no media
        socket.emit('join', { room: ROOM_CODE, username: USERNAME });
        addChatMessage("System", "🔒 History is never saved. You are seeing live messages only.", true);
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

            const maximizeBtn = document.createElement('button');
            maximizeBtn.className = 'maximize-btn btn-icon';
            maximizeBtn.title = 'Maximize Video';
            maximizeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
            
            maximizeBtn.onclick = (e) => {
                e.stopPropagation();
                toggleMaximize(videoWrapper, maximizeBtn);
            };

            videoWrapper.appendChild(videoElement);
            videoWrapper.appendChild(label);
            videoWrapper.appendChild(maximizeBtn);
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

socket.on('screen_share_status', (data) => {
    const wrapper = document.getElementById(`wrapper-${data.sender_sid}`);
    const videoGrid = document.getElementById('video-grid');
    if (wrapper) {
        if (data.is_sharing) {
            wrapper.classList.add('is-screen-share');
            if (videoGrid) videoGrid.classList.add('has-screen-share');
        } else {
            wrapper.classList.remove('is-screen-share');
            if (videoGrid) videoGrid.classList.remove('has-screen-share');
        }
    }
});

// --- Chat Logic ---

function addChatMessage(user, text, isSystem = false, image = null, audio = null, replyTo = null) {
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

        if (replyTo) {
            const replyCtx = document.createElement('div');
            replyCtx.className = 'reply-context';
            const rUser = document.createElement('span');
            rUser.className = 'reply-user';
            rUser.innerText = replyTo.user;
            const rText = document.createElement('span');
            rText.className = 'reply-text';
            rText.innerText = replyTo.text;
            replyCtx.appendChild(rUser);
            replyCtx.appendChild(rText);
            msgDiv.appendChild(replyCtx);
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
                viewBtn.classList.add('expired-glitch');
                viewBtn.onclick = null; // Remove listener
                setTimeout(() => viewBtn.remove(), 800);
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
                    playBtn.classList.add('expired-glitch');

                    playBtn.onclick = null;
                    audioObj.src = '';
                    setTimeout(() => playBtn.remove(), 800);
                };
            };
            msgDiv.appendChild(playBtn);
        }

        const replyBtn = document.createElement('button');
        replyBtn.className = 'reply-btn';
        replyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>';
        replyBtn.title = 'Reply';
        replyBtn.onclick = () => {
            let rText = text || (image ? '📸 Image' : (audio ? '🎙️ Audio' : ''));
            replyingTo = { user, text: rText };
            replyPreviewUser.innerText = user;
            replyPreviewText.innerText = rText;
            replyPreview.style.display = 'flex';
            chatInput.focus();
        };
        msgDiv.appendChild(replyBtn);
    }

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
}

let unreadMessageCount = 0;

socket.on('message', (data) => {
    if (data.user === 'System') {
        addChatMessage(data.user, data.text, true);
    } else {
        addChatMessage(data.user, data.text, false, data.image, data.audio, data.reply_to);
        
        // Handle unread message notifications when chat is hidden
        if (document.body.classList.contains('chat-hidden')) {
            unreadMessageCount++;
            const badge = document.getElementById('chat-notification-badge');
            if (badge) {
                badge.textContent = unreadMessageCount > 99 ? '99+' : unreadMessageCount;
                badge.style.display = 'block';
            }
        }
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
            text: text,
            reply_to: replyingTo
        });
        chatInput.value = '';
        cancelReply();
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
                image: base64Img,
                reply_to: replyingTo
            });
            // Reset input
            imageUpload.value = '';
            cancelReply();
        });
    }
});

function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
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
                        audio: reader.result,
                        reply_to: replyingTo
                    });
                    cancelReply();
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

// --- Dropdown Logic ---
const moreOptionsBtn = document.getElementById('more-options-btn');
const optionsDropdown = document.getElementById('options-dropdown');

if (moreOptionsBtn && optionsDropdown) {
    moreOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        optionsDropdown.classList.toggle('show');
    });

    optionsDropdown.querySelectorAll('.dropdown-item').forEach(btn => {
        btn.addEventListener('click', () => {
            optionsDropdown.classList.remove('show');
        });
    });
}

document.addEventListener('click', (e) => {
    if (optionsDropdown && !optionsDropdown.contains(e.target) && e.target !== moreOptionsBtn) {
        optionsDropdown.classList.remove('show');
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
    console.log("showFloatingReaction called for", wrapperId, emoji);
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
                toggleAudioBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>';
            } else {
                toggleAudioBtn.classList.remove('active');
                toggleAudioBtn.classList.add('inactive');
                toggleAudioBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"></line><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path><path d="M5 10v2a7 7 0 0 0 12 5"></path><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path><path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>';
            }
        }
    }
});

toggleVideoBtn.addEventListener('click', () => {
    if (localStream && !screenStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            if (videoTrack.enabled) {
                toggleVideoBtn.classList.remove('inactive');
                toggleVideoBtn.classList.add('active');
                toggleVideoBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>';
            } else {
                toggleVideoBtn.classList.remove('active');
                toggleVideoBtn.classList.add('inactive');
                toggleVideoBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"></line><path d="M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16"></path><path d="M9.5 4h5l2.5 3h3a2 2 0 0 1 2 2v7.5"></path></svg>';
            }
        }
    }
});

// --- Screen Sharing Logic ---

if (shareScreenBtn) {
    shareScreenBtn.addEventListener('click', async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            const infoModal = document.getElementById("info-modal");
            if (infoModal) infoModal.style.display = "flex";
            return;
        }

        if (screenStream) {
            stopScreenSharing();
        } else {
            try {
                screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                
                if (localStream) {
                    originalVideoTrack = localStream.getVideoTracks()[0];
                }

                // Replace track for all active peer connections
                for (let sid in peers) {
                    const pc = peers[sid];
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack).catch(e => console.error("Error replacing track:", e));
                    }
                }

                // Update local video element
                localVideo.srcObject = new MediaStream([screenTrack]);
                localVideo.muted = true;
                document.querySelector('.local-wrapper').classList.add('is-screen-share');
                const videoGrid = document.getElementById('video-grid');
                if (videoGrid) videoGrid.classList.add('has-screen-share');
                socket.emit('screen_share_status', { room: ROOM_CODE, is_sharing: true });

                // Update UI state
                shareScreenBtn.classList.add('active');
                shareScreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="14" x="3" y="3" rx="2" ry="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path><line x1="3" y1="3" x2="21" y2="21"></line></svg> Stop Sharing';
                toggleVideoBtn.disabled = true;

                // Listen for native stop sharing from browser UI
                screenTrack.onended = () => {
                    stopScreenSharing();
                };
            } catch (err) {
                console.error("Error starting screen share: ", err);
                addChatMessage('System', 'Screen sharing was denied or failed to start.', true);
            }
        }
    });
}

function stopScreenSharing() {
    if (!screenStream) return;
    
    const screenTrack = screenStream.getVideoTracks()[0];
    screenTrack.stop();
    screenStream = null;
    document.querySelector('.local-wrapper').classList.remove('is-screen-share');
    const videoGrid = document.getElementById('video-grid');
    if (videoGrid) videoGrid.classList.remove('has-screen-share');
    socket.emit('screen_share_status', { room: ROOM_CODE, is_sharing: false });
    
    if (originalVideoTrack) {
        for (let sid in peers) {
            const pc = peers[sid];
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
                sender.replaceTrack(originalVideoTrack).catch(e => console.error("Error restoring track:", e));
            }
        }
        localVideo.srcObject = localStream;
    } else {
        for (let sid in peers) {
            const pc = peers[sid];
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
                sender.replaceTrack(null).catch(e => console.error("Error nulling track:", e));
            }
        }
        localVideo.srcObject = null;
    }
    
    // Update UI state
    shareScreenBtn.classList.remove('active');
    shareScreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="14" x="3" y="3" rx="2" ry="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="m8 10 4-4 4 4"></path><path d="M12 6v8"></path></svg> Share Screen';
    toggleVideoBtn.disabled = false;
}

leaveRoomBtn.addEventListener('click', () => {
    const purgeOverlay = document.getElementById('purge-overlay');
    if (purgeOverlay) {
        purgeOverlay.classList.add('active');
        setTimeout(() => {
            socket.emit('leave', { room: ROOM_CODE, username: USERNAME });
            window.location.href = '/';
        }, 1200);
    } else {
        socket.emit('leave', { room: ROOM_CODE, username: USERNAME });
        window.location.href = '/';
    }
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
            const originalIcon = inviteBtn.innerHTML;
            inviteBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M20 6 9 17l-5-5"></path>
            </svg>
            `;
            inviteBtn.classList.add('active');

            setTimeout(() => {
                inviteBtn.innerHTML = originalIcon;
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

    el.resetDrag = () => {
        xOffset = 0;
        yOffset = 0;
        currentX = 0;
        currentY = 0;
        initialX = 0;
        initialY = 0;
        el.style.transform = '';
        el.style.zIndex = '';
    };

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

// Maximize Video Logic
function toggleMaximize(wrapper, btn) {
    const isMaximized = wrapper.classList.contains('maximized-video');
    
    // Unmaximize any currently maximized video
    document.querySelectorAll('.maximized-video').forEach(el => {
        if (el !== wrapper) {
            el.classList.remove('maximized-video');
            const otherBtn = el.querySelector('.maximize-btn');
            if (otherBtn) {
                otherBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
                otherBtn.title = 'Maximize Video';
            }
        }
    });

    if (!isMaximized) {
        wrapper.classList.add('maximized-video');
        document.body.classList.add('has-maximized-video');
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>';
        btn.title = 'Minimize Video';
    } else {
        wrapper.classList.remove('maximized-video');
        document.body.classList.remove('has-maximized-video');
        document.body.classList.remove('chat-hidden');
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
        btn.title = 'Maximize Video';
    }
}

const localMaximizeBtn = document.querySelector('.local-wrapper .maximize-btn');
if (localMaximizeBtn && localWrapper) {
    localMaximizeBtn.onclick = (e) => {
        e.stopPropagation();
        toggleMaximize(localWrapper, localMaximizeBtn);
    };
}

// Theme Modal

const themeBtn = document.getElementById("theme-btn");
const themeModal = document.getElementById("theme-modal");
const closeThemeModal = document.getElementById("close-theme-modal");

themeBtn.addEventListener("click", () => {
    themeModal.style.display = "flex";
});

closeThemeModal.addEventListener("click", () => {
    themeModal.style.display = "none";
});
document.querySelectorAll(".theme-option").forEach(button => {
    button.addEventListener("click", () => {
        const themeName = button.dataset.theme;

        setTheme(themeName);

        themeModal.style.display = "none";
    });
});

// Info Modal
const infoBtn = document.getElementById("info-btn");
const infoModal = document.getElementById("info-modal");
const closeInfoModal = document.getElementById("close-info");

if (infoBtn && infoModal && closeInfoModal) {
    infoBtn.addEventListener("click", () => {
        infoModal.style.display = "flex";
    });

    closeInfoModal.addEventListener("click", () => {
        infoModal.style.display = "none";
    });
}

// Fullscreen Chat Toggle Logic
const closeChatBtn = document.getElementById('close-chat-btn');
const floatingChatToggle = document.getElementById('floating-chat-toggle');

if (closeChatBtn) {
    closeChatBtn.addEventListener('click', () => {
        document.body.classList.add('chat-hidden');
    });
}

if (floatingChatToggle) {
    floatingChatToggle.addEventListener('click', () => {
        document.body.classList.remove('chat-hidden');
        
        // Reset unread count
        unreadMessageCount = 0;
        const badge = document.getElementById('chat-notification-badge');
        if (badge) {
            badge.style.display = 'none';
        }
    });
}
