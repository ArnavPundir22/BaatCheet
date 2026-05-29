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
-   **Leave Room (`leaveRoomBtn`):** Emits a `leave` Socket.IO event to gracefully inform the server and peers, then redirects the user back to the homepage.

## 💬 Real-Time Chat & Typing Indicators

The chat system is designed to look and feel like modern messaging apps (e.g., WhatsApp, iMessage).

-   **Message Rendering:** Messages are dynamically created as DOM elements. `mine` and `theirs` CSS classes dictate bubble alignment (right for self, left for others). System messages are centered.
-   **Typing Events:** When a user types in the input field, a `typing` event is emitted. The client uses a debounce timer (`setTimeout`) of 1.5 seconds. If no input is detected within this window, a `stop_typing` event is fired.
-   **UI Feedback:** When receiving a `user_typing` event, a CSS-animated bouncing dot indicator (`#typing-indicator`) is appended to the bottom of the chat list, auto-scrolling the view.

## 🎉 Animated Reactions

Users can send ephemeral emoji reactions that float across everyone's screens.

-   **Reaction Panel:** A glassmorphic pop-up panel contains selectable emojis. Clicking outside the panel or on the toggle button safely closes it via event propagation control (`e.stopPropagation()`).
-   **Floating Animation (`showFloatingReaction`):** When a reaction is triggered, a temporary DOM element is created and injected into the user's specific video wrapper (or randomly on screen as a fallback).
-   **Math & Randomization:** The spawn position includes a random horizontal offset (`(Math.random() - 0.5) * 80`) to ensure multiple reactions don't overlap perfectly.
-   **CSS Keyframes:** The element uses CSS animations (`@keyframes floatUp`) to rise, fade out, and disappear.
-   **Garbage Collection:** A `setTimeout` removes the element from the DOM after 3.6 seconds to prevent memory leaks and DOM clutter.
