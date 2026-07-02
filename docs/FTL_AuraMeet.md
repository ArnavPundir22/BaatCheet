# Feature Traceability List (FTL) - AuraMeet

| Feature ID | Feature Name | Description | Target Role | Test Scenario | Expected Outcome | Priority |
|---|---|---|---|---|---|---|
| BC-F01 | Ephemeral Room Creation | Generate temporary rooms stored in Redis. | All Users | User creates a room from the landing page. | Room is created, user is redirected to the room URL, Redis TTL is set. | MVP |
| BC-F02 | Real-Time Chat | WebSocket-based text messaging. | All Users | Two users in a room send messages back and forth. | Messages appear instantly without page reloads. | MVP |
| BC-F03 | WhatsApp-Style Inline Replies | Ability to quote and reply to specific messages. | All Users | User clicks reply icon on a specific message. | A context banner appears; sent message includes the quoted text. | MVP |
| BC-F04 | Desktop Screen Sharing | Peer-to-peer screen casting via WebRTC. | Desktop Users | User clicks share screen icon. | Browser prompts for permission; video feed appears for other participants. | MVP |
| BC-F05 | Mobile Screen Share Block | Prevent mobile users from initiating screen share. | Mobile Users | Mobile user clicks screen share icon. | An "App Info & Tips" modal appears explaining the desktop requirement. | MVP |
| BC-F06 | Leave & Destroy Animation | High-fidelity glitch animation upon exiting. | All Users | User clicks "Leave Room". | Screen flickers, glitch text appears, followed by home page redirect. | MVP |
| BC-F07 | Zero-Footprint State Purge | Automated deletion of room data. | System | The last user leaves a room. | Server clears all Redis hashes and keys associated with the room. | MVP |
| BC-F08 | 3D Human Character UI | Interactive 3D element on the landing page. | All Users | User loads the landing page. | 3D character loads seamlessly, enhancing the cyberpunk aesthetic. | V1.5 |
| BC-F09 | Pro Meeting Pass (SaaS) | PostgreSQL/Razorpay integration for premium features. | Pro User | User attempts to bypass a time limit. | Prompts Razorpay checkout; session extends upon success. | V1.5 |
