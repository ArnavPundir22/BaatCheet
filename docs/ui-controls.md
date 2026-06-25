# 🎮 UI & Controls Logic

BaatCheet features a highly interactive, responsive, and dynamic user interface built with Vanilla JavaScript and CSS3. The focus is on providing a seamless "native-app" feel, particularly on mobile devices.

## 📱 Mobile Miniplayer (Picture-in-Picture)

To allow users to chat while keeping an eye on the video feed, the application implements a custom floating miniplayer for screen sizes under `1024px` width.

### How it Works
-   **CSS Media Queries:** When the screen width is mobile-sized, the `.video-area` class transforms into a floating element (`position: absolute`, `z-index: 100`, `bottom: 80px`).
-   **Drag & Drop Logic:** Custom touch and mouse event listeners (`touchstart`, `touchmove`, `touchend`, `mousedown`, `mousemove`, `mouseup`) are attached to the video wrapper.
-   **Translation:** During dragging, JavaScript calculates the delta coordinates and applies a GPU-accelerated `transform: translate3d(x, y, 0)` to move the miniplayer smoothly without layout thrashing.
-   **Safe Zones:** Clicks on the actual control buttons (`.controls`) are intercepted to prevent accidental dragging while toggling audio/video.

## 🎛️ Media Controls

Users have full control over their local media streams.

-   **Toggle Audio (`toggleAudioBtn`):** Accesses the local WebRTC stream, gets the first audio track (`localStream.getAudioTracks()[0]`), and flips its `.enabled` property. The UI updates dynamically to reflect the muted/unmuted state.
-   **Toggle Video (`toggleVideoBtn`):** Functions similarly to audio, toggling the `.enabled` property of the first video track. Disabling the video track stops sending frames, effectively turning off the camera while keeping the WebRTC connection alive.
-   **More Options Dropdown (3-Dot Menu):** Consolidates advanced features into a sleek glassmorphic menu:
    -   **Share Screen:** Leverages `navigator.mediaDevices.getDisplayMedia` to capture the desktop screen. When active, it automatically hides all other participant videos to maximize screen real estate. *Note: Mobile OS limitations prevent web-based screen sharing. On mobile, clicking this button gracefully pops open the Tips & Info modal to educate the user.*
    -   **Copy Invite Link:** Writes the current URL to the clipboard using the `navigator.clipboard.writeText` API for easy sharing.
    -   **Themes:** Opens the `#theme-modal` to dynamically alter the application's CSS variables (e.g., Matrix Green, Cyberpunk Purple).
    -   **Tips & Info:** Opens an educational modal detailing platform capabilities, security guarantees, and device limitations.
-   **Leave Room (`leaveRoomBtn`):** Emits a `leave` Socket.IO event to gracefully inform the server and peers, then redirects the user back to the homepage.

## 💬 Real-Time Chat & Typing Indicators

The chat system is designed to look and feel like modern messaging apps (e.g., WhatsApp, iMessage).

-   **Message Rendering:** Messages are dynamically created as DOM elements. `mine` and `theirs` CSS classes dictate bubble alignment (right for self, left for others). System messages are centered.
-   **Typing Events:** When a user types in the input field, a `typing` event is emitted. The client uses a debounce timer (`setTimeout`) of 1.5 seconds. If no input is detected within this window, a `stop_typing` event is fired.
-   **UI Feedback:** When receiving a `user_typing` event, a CSS-animated bouncing dot indicator (`#typing-indicator`) is appended to the bottom of the chat list, auto-scrolling the view.
-   **Inline Message Replies:** Users can hover over any chat bubble to reveal a `↩️` reply button positioned outside the message bubble for a cleaner UI. Clicking it populates a `replyingTo` state object and reveals a glassmorphic `#reply-preview` banner above the chat input. When the message is dispatched, the socket payload includes the `reply_to` context, which is rendered dynamically as a WhatsApp-style quoted block inside the chat bubble by `addChatMessage`.
-   **"Zero-Log" Cyberpunk Purge:** To visually reinforce the ephemeral nature, clicking "Leave Room" triggers a full-screen `#purge-overlay`. This overlay features high-fidelity cyberpunk visual effects including screen flickering, glitch text, and dual-rotating spinners for 1200ms before disconnecting the socket and routing home.

## 🎉 Animated Reactions & Emoji Gallery

Users can send ephemeral emoji reactions that float across everyone's screens, or use them inline within the chat.

-   **Full Emoji Picker Integration:** Upgraded to a comprehensive emoji picker using `emoji-picker-element`, which utilizes the modern Web Components standard for high performance and native DOM encapsulation.
-   **UI Integration & State Management:** Designed with a dark-mode, glassmorphic UI, the emoji gallery is seamlessly accessible from both the reaction toolbar and the chat input field. The state is centrally managed so picking an emoji while typing appends it to the chat input, whereas picking it from the reaction menu instantly broadcasts it.
-   **Floating Animation (`showFloatingReaction`):** When a reaction is triggered, a temporary DOM element is created and injected into the user's specific video wrapper (or randomly on screen as a fallback).
-   **Math & Randomization:** The spawn position includes a random horizontal offset (`(Math.random() - 0.5) * 80`) to ensure multiple reactions don't overlap perfectly.
-   **CSS Keyframes:** The element uses CSS animations (`@keyframes floatUp`) to rise, fade out, and disappear.
-   **Garbage Collection:** A `setTimeout` removes the element from the DOM after 3.6 seconds to prevent memory leaks and DOM clutter.

## 🎨 Multiplayer Air Draw

A dynamic collaborative drawing feature allows participants to draw over the video feed in real time.

-   **Canvas Overlay:** An interactive HTML5 `<canvas>` sits over the video wrapper, scaling responsively with the participant's video using CSS absolute positioning and `pointer-events` routing.
-   **Drawing Engine & Normalization:** Tracks mouse, touch, and hand-tracking coordinates to render smooth strokes using `CanvasRenderingContext2D`. To ensure drawings align perfectly across devices with varying screen resolutions, all X and Y coordinates are normalized (e.g., `x / canvas.width`) before being broadcasted.
-   **Real-Time Synchronization:** As the user draws, the normalized coordinate objects `{x, y, color, type}` are emitted continuously via WebSockets (`draw` event). Remote clients receive these events, scale the normalized coordinates back up to their local canvas dimensions (`normalizedX * localCanvas.width`), and render the stroke.
-   **Network Resiliency & Clear States:** The implementation handles network synchronization across all remote participants' video feeds. If a user clicks the "Clear Canvas" button, a `clear_canvas` WebSocket event is dispatched to wipe the remote contexts simultaneously.

## 👻 View-Once Ephemeral Media (Images & Audio)

BaatCheet implements a "Snapchat-like" view-once media system directly in the browser without relying on any backend storage or databases.

### 🖼️ Ephemeral Images
-   **Client-Side Compression:** When an image is selected, it is loaded into a hidden `<canvas>` element using the `FileReader` and `Image` APIs. The canvas aggressively resizes and compresses the image to a maximum 800x800 resolution at 70% JPEG quality.
-   **Transmission:** The compressed image is converted into a Base64 string (`canvas.toDataURL()`) and transmitted over WebSockets alongside the chat message payload.
-   **View-Once Logic:** The recipient sees a "📸 View Once Image" button. Clicking this triggers a modal overlay to display the image. Crucially, the button's `onclick` listener is immediately set to `null`, the button is disabled, and its text changes to "❌ Expired".
-   **Destruction:** When the modal is closed, the underlying `<img>` `src` attribute is wiped (`viewerImg.src = ''`), completely destroying the image data from the DOM and memory.

### 🎙️ Ephemeral Audio Messages
-   **MediaRecorder API:** A microphone button listens for `mousedown`/`touchstart` events. Upon activation, it requests a dedicated audio stream via `navigator.mediaDevices.getUserMedia({ audio: true })`.
-   **Recording & Encoding:** A `MediaRecorder` instance captures the audio stream into chunks. When the user releases the button (`mouseup`/`touchend`), the recording stops, and the chunks are assembled into a `.webm` Blob.
-   **Transmission:** Similar to images, the audio Blob is read as a Base64 Data URL via `FileReader` and sent through the WebSocket pipeline. The active microphone tracks are immediately stopped (`track.stop()`) to release the device hardware.
-   **Play-Once Logic:** The recipient receives a "▶️ Play Audio Message" button. When clicked, a new JavaScript `Audio(base64Data)` object is instantiated and played.
-   **Destruction:** The script listens for the audio object's `onended` event. Once playback completes, the button is permanently disabled ("❌ Expired"), and the audio object's `src` is cleared, wiping it from memory.
