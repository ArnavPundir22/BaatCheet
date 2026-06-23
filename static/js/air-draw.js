document.addEventListener('DOMContentLoaded', () => {
    const videoElement = document.getElementById('local-video');
    const canvasElement = document.getElementById('air-draw-canvas');
    const toggleBtn = document.getElementById('toggle-air-draw');

    if (!videoElement || !canvasElement || !toggleBtn) return;

    const canvasCtx = canvasElement.getContext('2d', { willReadFrequently: true });
    const airDrawControls = document.getElementById('air-draw-controls');
    const airDrawCursor = document.getElementById('air-draw-cursor');
    let isDrawingEnabled = false;
    let hands = null;
    let camera = null;

    // Pen settings
    let currentColor = '#10b981';
    let isRainbow = false;
    let hue = 0;
    let currentStrokeWidth = 6;

    // Stroke History for Vector Rendering
    let strokes = [];
    let currentStroke = null;
    const LINE_LIFESPAN = 5000; // 5 seconds before fading out completely
    let smoothedPoint = null;

    // Set up controls listeners
    if (airDrawControls) {
        // Color buttons
        const colorBtns = airDrawControls.querySelectorAll('.color-btn');
        colorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                colorBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const selectedColor = btn.getAttribute('data-color');
                if (selectedColor === 'rainbow') {
                    isRainbow = true;
                } else {
                    isRainbow = false;
                    currentColor = selectedColor;
                }
            });
        });

        // Stroke width slider
        const strokeSlider = document.getElementById('stroke-width');
        if (strokeSlider) {
            strokeSlider.addEventListener('input', (e) => {
                currentStrokeWidth = parseInt(e.target.value);
            });
        }
    }

    // Resize canvas to match video dimensions
    function resizeCanvas() {
        if (videoElement.videoWidth && videoElement.videoHeight) {
            if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
                canvasElement.width = videoElement.videoWidth;
                canvasElement.height = videoElement.videoHeight;
            }
        } else {
            // Fallback before video metadata is fully loaded
            canvasElement.width = videoElement.clientWidth || 640;
            canvasElement.height = videoElement.clientHeight || 480;
        }
    }

    // Initialize MediaPipe Hands
    async function initMediaPipe() {
        if (hands) return;

        hands = new window.Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);

        camera = new window.Camera(videoElement, {
            onFrame: async () => {
                if (isDrawingEnabled && videoElement.readyState >= 2) {
                    await hands.send({ image: videoElement });
                }
            },
            width: 640,
            height: 480
        });
        
        camera.start();
    }

    // Calculate distance between two landmarks (normalized coordinates)
    function getDistance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    // Check if a finger is extended (tip is further from wrist than PIP joint)
    function isFingerUp(landmarks, tipIndex, pipIndex) {
        const wrist = landmarks[0];
        const tipDist = getDistance(wrist, landmarks[tipIndex]);
        const pipDist = getDistance(wrist, landmarks[pipIndex]);
        return tipDist > pipDist;
    }

    
    // --- TESTING UTILITY ---
    window.simulateDraw = function(x, y, isDrawing) {
        if (!isDrawingEnabled) return;
        resizeCanvas();
        const now = Date.now();
        const rawPoint = { x: x * canvasElement.width, y: y * canvasElement.height };
        
        if (!smoothedPoint) smoothedPoint = { ...rawPoint };
        else { smoothedPoint.x = smoothedPoint.x * 0.5 + rawPoint.x * 0.5; smoothedPoint.y = smoothedPoint.y * 0.5 + rawPoint.y * 0.5; }
        
        if (isDrawing) {
            let strokeColor = currentColor === 'rainbow' ? `hsl(${(now / 10) % 360}, 100%, 50%)` : currentColor;
            if (!currentStroke) { currentStroke = { width: currentStrokeWidth, points: [] }; strokes.push(currentStroke); }
            currentStroke.points.push({ x: smoothedPoint.x, y: smoothedPoint.y, color: strokeColor, timestamp: now, width: currentStrokeWidth });
            if (window.broadcastAirDrawStroke) window.broadcastAirDrawStroke({ x, y, color: strokeColor, timestamp: now, width: currentStrokeWidth });
        } else { currentStroke = null; smoothedPoint = null; }
    };

    // MediaPipe results callback
    function onResults(results) {
        if (!isDrawingEnabled) return;
        
        resizeCanvas();
        const now = Date.now();

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];

            const indexUp = isFingerUp(landmarks, 8, 6);
            const middleUp = isFingerUp(landmarks, 12, 10);
            
            const rawPoint = {
                x: indexTip.x * canvasElement.width,
                y: indexTip.y * canvasElement.height
            };

            // Smooth the point to reduce jitter and "dotted" look
            if (!smoothedPoint) {
                smoothedPoint = { ...rawPoint };
            } else {
                smoothedPoint.x = smoothedPoint.x * 0.5 + rawPoint.x * 0.5;
                smoothedPoint.y = smoothedPoint.y * 0.5 + rawPoint.y * 0.5;
            }

            // Check drawing state
            if (indexUp && !middleUp) {
                // Pen Down - Drawing
                let strokeColor = currentColor;
                if (isRainbow) {
                    strokeColor = `hsl(${hue}, 100%, 50%)`;
                    hue = (hue + 2) % 360;
                }

                if (!currentStroke) {
                    currentStroke = {
                        width: currentStrokeWidth,
                        points: []
                    };
                    strokes.push(currentStroke);
                }

                const newLocalPoint = {
                    x: smoothedPoint.x,
                    y: smoothedPoint.y,
                    color: strokeColor,
                    timestamp: now,
                    width: currentStrokeWidth
                };
                currentStroke.points.push(newLocalPoint);

                // Broadcast normalized point to peers
                if (window.broadcastAirDrawStroke) {
                    window.broadcastAirDrawStroke({
                        x: smoothedPoint.x / canvasElement.width,
                        y: smoothedPoint.y / canvasElement.height,
                        color: strokeColor,
                        timestamp: now,
                        width: currentStrokeWidth
                    });
                }
            } else if (indexUp && middleUp) {
                // Pause mode
                currentStroke = null;
                smoothedPoint = null;
            } else {
                // Not drawing
                currentStroke = null;
                smoothedPoint = null;
            }
            
            // Update DOM Cursor instead of drawing on canvas
            if (airDrawCursor) {
                airDrawCursor.style.display = 'block';
                
                // Canvas coordinates
                const drawX = smoothedPoint ? smoothedPoint.x : rawPoint.x;
                const drawY = smoothedPoint ? smoothedPoint.y : rawPoint.y;
                
                // Convert to screen coordinates (X is mirrored)
                const screenXPercent = (1 - (drawX / canvasElement.width)) * 100;
                const screenYPercent = (drawY / canvasElement.height) * 100;
                
                airDrawCursor.style.left = `${screenXPercent}%`;
                airDrawCursor.style.top = `${screenYPercent}%`;
                
                // Size and color
                const cursorSize = currentStrokeWidth * 2;
                airDrawCursor.style.width = `${cursorSize}px`;
                airDrawCursor.style.height = `${cursorSize}px`;
                
                let pointerColor = currentColor;
                if (isRainbow) pointerColor = `hsl(${hue}, 100%, 50%)`;
                
                airDrawCursor.style.backgroundColor = (indexUp && !middleUp) ? pointerColor : 'rgba(255, 255, 255, 0.6)';
                
                // Add glow if drawing
                if (indexUp && !middleUp) {
                    airDrawCursor.style.boxShadow = `0 0 12px ${pointerColor}`;
                    airDrawCursor.style.border = 'none';
                } else {
                    airDrawCursor.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.5)';
                    airDrawCursor.style.border = '2px solid rgba(255, 255, 255, 0.8)';
                }
            }
            
        } else {
            currentStroke = null;
            smoothedPoint = null;
            if (airDrawCursor) airDrawCursor.style.display = 'none';
        }
    }

    // --- GLOBAL RENDER LOOP ---
    function renderLoop() {
        requestAnimationFrame(renderLoop);
        
        try {
            const now = Date.now();
            
            // Render local canvas if enabled
        if (isDrawingEnabled && canvasElement && canvasCtx) {
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            
            // Filter out expired strokes
            strokes = strokes.filter(stroke => {
                return stroke.points.length > 0 && (now - stroke.points[stroke.points.length - 1].timestamp) < LINE_LIFESPAN;
            });

            // Draw remaining active strokes
            strokes.forEach(stroke => {
                for (let i = 1; i < stroke.points.length; i++) {
                    const p1 = stroke.points[i - 1];
                    const p2 = stroke.points[i];
                    
                    const age = now - p2.timestamp;
                    if (age > LINE_LIFESPAN) continue;
                    
                    const opacity = Math.max(0, 1 - (age / LINE_LIFESPAN));
                    
                    canvasCtx.beginPath();
                    canvasCtx.moveTo(p1.x, p1.y);
                    canvasCtx.lineTo(p2.x, p2.y);
                    
                    canvasCtx.globalAlpha = opacity;
                    canvasCtx.strokeStyle = p2.color;
                    canvasCtx.lineWidth = stroke.width;
                    canvasCtx.lineCap = 'round';
                    canvasCtx.lineJoin = 'round';
                    
                    canvasCtx.shadowColor = p2.color;
                    canvasCtx.shadowBlur = stroke.width * 2;
                    canvasCtx.stroke();
                }
            });
            canvasCtx.globalAlpha = 1.0;
            canvasCtx.shadowBlur = 0;
        }

        // Render ALL remote canvases
        if (window.remoteAirDrawStrokes) {
            for (const [sid, pointsArray] of Object.entries(window.remoteAirDrawStrokes)) {
                const remoteCanvas = document.getElementById(`air-draw-remote-${sid}`);
                if (!remoteCanvas) continue;
                
                // Ensure canvas size matches video size
                const videoElement = document.getElementById(`video-${sid}`);
                if (videoElement && (remoteCanvas.width !== videoElement.clientWidth || remoteCanvas.height !== videoElement.clientHeight)) {
                    remoteCanvas.width = videoElement.clientWidth;
                    remoteCanvas.height = videoElement.clientHeight;
                }

                const ctx = remoteCanvas.getContext('2d');
                ctx.clearRect(0, 0, remoteCanvas.width, remoteCanvas.height);

                // Filter expired points
                window.remoteAirDrawStrokes[sid] = pointsArray.filter(p => (now - p.timestamp) < LINE_LIFESPAN);
                const activePoints = window.remoteAirDrawStrokes[sid];
                if (activePoints.length === 0) continue;

                // Group flat points into strokes based on timestamp gaps (>100ms)
                const remoteStrokes = [];
                let currentRemoteStroke = null;
                
                for (let i = 0; i < activePoints.length; i++) {
                    const p = activePoints[i];
                    if (!currentRemoteStroke || i === 0 || (p.timestamp - activePoints[i-1].timestamp > 150)) {
                        currentRemoteStroke = { width: p.width || 6, points: [] };
                        remoteStrokes.push(currentRemoteStroke);
                    }
                    currentRemoteStroke.points.push(p);
                }

                // Draw strokes
                remoteStrokes.forEach(stroke => {
                    for (let i = 1; i < stroke.points.length; i++) {
                        const p1 = stroke.points[i - 1];
                        const p2 = stroke.points[i];
                        
                        const age = now - p2.timestamp;
                        if (age > LINE_LIFESPAN) continue;
                        
                        const opacity = Math.max(0, 1 - (age / LINE_LIFESPAN));
                        
                        ctx.beginPath();
                        ctx.moveTo(p1.x * remoteCanvas.width, p1.y * remoteCanvas.height);
                        ctx.lineTo(p2.x * remoteCanvas.width, p2.y * remoteCanvas.height);
                        
                        ctx.globalAlpha = opacity;
                        ctx.strokeStyle = p2.color;
                        ctx.lineWidth = stroke.width;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.shadowColor = p2.color;
                            ctx.shadowBlur = stroke.width * 2;
                            ctx.stroke();
                        }
                    });
                    ctx.globalAlpha = 1.0;
                    ctx.shadowBlur = 0;
                }
            }
        } catch (err) {
            console.error("Render loop error:", err);
        }
    }
    
    // Start global render loop
    renderLoop();

    // Toggle Logic
    toggleBtn.addEventListener('click', async () => {
        isDrawingEnabled = !isDrawingEnabled;
        
        if (isDrawingEnabled) {
            toggleBtn.classList.add('active');
            
            // Show loading state on button
            if (!hands) {
                const originalHtml = toggleBtn.innerHTML;
                toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin-animation"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>';
                
                // Add simple rotation animation for loading state if not exists
                if (!document.getElementById('spin-keyframe')) {
                    const style = document.createElement('style');
                    style.id = 'spin-keyframe';
                    style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } } .spin-animation { animation: spin 1s linear infinite; }`;
                    document.head.appendChild(style);
                }

                await initMediaPipe();
                toggleBtn.innerHTML = originalHtml;
            } else {
                // If camera was paused, resume it
                if (camera) camera.start();
            }
            if (airDrawControls) airDrawControls.style.display = 'flex';
        } else {
            toggleBtn.classList.remove('active');
            if (airDrawControls) airDrawControls.style.display = 'none';
            if (airDrawCursor) airDrawCursor.style.display = 'none';
            // Clear canvas completely when turned off
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            strokes = [];
            currentStroke = null;
            smoothedPoint = null;
        }
    });
});
