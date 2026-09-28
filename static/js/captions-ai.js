/**
 * BaatCheet / NexusStream-RTC
 * Multi-Language Live Closed Captions, AI Meeting Summary & Interactive AI Quiz Engine
 */

(function () {
    'use strict';

    // State
    let recognition = null;
    let isCaptionsActive = false;
    let captionHideTimeout = null;
    let currentLang = 'en-US';

    // Elements
    const toggleCaptionsBtn = document.getElementById('toggle-captions');
    const captionContainer = document.getElementById('caption-container');
    const captionText = document.getElementById('caption-text');
    const captionLangSelect = document.getElementById('caption-lang-select');

    const summaryBtn = document.getElementById('ai-summary-btn');
    const summaryModal = document.getElementById('ai-summary-modal');
    const summaryBody = document.getElementById('ai-summary-body');
    const closeSummaryModalBtn = document.getElementById('close-summary-modal');
    const closeSummaryBtn = document.getElementById('close-summary-btn');
    const copySummaryBtn = document.getElementById('copy-summary-btn');

    const quizBtn = document.getElementById('ai-quiz-btn');
    const quizModal = document.getElementById('ai-quiz-modal');
    const quizBody = document.getElementById('ai-quiz-body');
    const closeQuizModalBtn = document.getElementById('close-quiz-modal');
    const closeQuizBtn = document.getElementById('close-quiz-btn');
    const submitQuizBtn = document.getElementById('submit-quiz-btn');

    let currentQuizData = null;
    let userAnswers = {};

    // Check Speech Recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    function initCaptions() {
        if (!SpeechRecognition) {
            console.warn('SpeechRecognition API is not supported in this browser.');
            if (toggleCaptionsBtn) {
                toggleCaptionsBtn.style.opacity = '0.5';
                toggleCaptionsBtn.title = 'Live Captions not supported in this browser';
            }
            return;
        }

        if (captionLangSelect) {
            currentLang = captionLangSelect.value || 'en-US';
        }

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = currentLang;

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            const activeSocket = window.socket;
            const currentRoom = window.ROOM_CODE;
            const currentUser = window.USERNAME || 'Me';
            const spokenText = finalTranscript.trim() || interimTranscript.trim();

            if (spokenText.length > 0 && isCaptionsActive) {
                const langBadge = currentLang ? `[${currentLang.split('-')[0].toUpperCase()}] ` : '';
                showCaptionText(`${langBadge}[${currentUser}]: ${spokenText}`);
            }

            // Always emit speech to server for room transcript so AI Summary & Quiz work whether CC is ON or OFF
            if (finalTranscript.trim().length > 0 && activeSocket) {
                activeSocket.emit('caption_speech', {
                    room: currentRoom,
                    username: currentUser,
                    text: finalTranscript.trim(),
                    isFinal: true,
                    lang: currentLang
                });
            } else if (interimTranscript.trim().length > 0 && activeSocket) {
                activeSocket.emit('caption_speech', {
                    room: currentRoom,
                    username: currentUser,
                    text: interimTranscript.trim(),
                    isFinal: false,
                    lang: currentLang
                });
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            
            // Ignore non-fatal speech pauses & aborted states so onend automatically restarts recognition
            if (event.error === 'no-speech' || event.error === 'aborted') {
                return;
            }

            const isBrave = (navigator.brave && typeof navigator.brave.isBrave === 'function');

            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                if (isBrave) {
                    console.warn('Brave speech privacy block');
                } else {
                    console.warn('Microphone or Speech Recognition permission was denied.');
                }
            }
        };

        recognition.onend = () => {
            // Keep background engine continuously restarting so transcript is always logged for AI features
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (e) { }
            }, 150);
        };
    }

    async function startCaptions() {
        if (!SpeechRecognition) {
            alert('Live Closed Captions are not supported in this browser. Please use Google Chrome, MS Edge, or Safari.');
            return;
        }

        // Soft check microphone permission without throwing fatal error if already active
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err) {
                console.warn('Microphone permission check:', err);
            }
        }

        if (!recognition) initCaptions();
        if (!recognition) return;

        if (captionLangSelect) {
            currentLang = captionLangSelect.value;
            recognition.lang = currentLang;
        }

        isCaptionsActive = true;
        if (toggleCaptionsBtn) toggleCaptionsBtn.classList.add('active');

        try {
            recognition.start();
            showCaptionText(`[System]: Live Captions Enabled (${currentLang})`);
        } catch (err) {
            showCaptionText(`[System]: Live Captions Active (${currentLang})`);
        }
    }

    function stopCaptions() {
        isCaptionsActive = false;
        if (toggleCaptionsBtn) toggleCaptionsBtn.classList.remove('active');
        if (captionContainer) captionContainer.style.display = 'none';
    }

    function showCaptionText(text) {
        if (!captionContainer || !captionText) return;
        captionText.textContent = text;
        captionContainer.style.display = 'flex';

        if (captionHideTimeout) clearTimeout(captionHideTimeout);
        // Dynamically scale display duration based on text length (7s minimum, up to 20s for long paragraphs)
        const duration = Math.min(20000, Math.max(7000, text.length * 90));
        captionHideTimeout = setTimeout(() => {
            captionContainer.style.display = 'none';
        }, duration);
    }

    // Toggle button listener
    if (toggleCaptionsBtn) {
        toggleCaptionsBtn.addEventListener('click', () => {
            if (isCaptionsActive) {
                stopCaptions();
            } else {
                startCaptions();
            }
        });
    }

    // Auto-start background transcript listener for AI Summary & Quiz (even when CC visual is OFF)
    setTimeout(() => {
        if (!recognition) initCaptions();
        if (recognition) {
            try { recognition.start(); } catch (e) { }
        }
    }, 1000);

    // Dynamic Language Selector Switcher
    if (captionLangSelect) {
        captionLangSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            if (isCaptionsActive && recognition) {
                try { recognition.stop(); } catch (err) { }
                recognition.lang = currentLang;
                setTimeout(() => {
                    if (isCaptionsActive) {
                        try { recognition.start(); } catch (err) { }
                        showCaptionText(`[System]: Switched CC Language to ${currentLang}`);
                    }
                }, 150);
            }
        });
    }

    // Bind Socket Events with Retry Loop
    function bindSocketEvents() {
        if (!window.socket) {
            setTimeout(bindSocketEvents, 300);
            return;
        }

        window.socket.off('caption_speech');
        window.socket.on('caption_speech', (data) => {
            const { username, text, lang, sender_sid } = data;
            // Prevent duplicate display of own captions broadcasted back from server
            if (sender_sid && window.socket && sender_sid === window.socket.id) {
                return;
            }
            if (text) {
                const langBadge = lang ? `[${lang.split('-')[0].toUpperCase()}] ` : '';
                showCaptionText(`${langBadge}[${username}]: ${text}`);
            }
        });
    }

    function getRoomCode() {
        return window.ROOM_CODE || (typeof ROOM_CODE !== 'undefined' ? ROOM_CODE : '');
    }

    function getUsername() {
        return window.USERNAME || (typeof USERNAME !== 'undefined' ? USERNAME : 'Me');
    }

    // AI Summary Modal Logic
    async function loadAISummary() {
        const optionsDropdown = document.getElementById('options-dropdown');
        if (optionsDropdown) optionsDropdown.classList.remove('show');

        if (!summaryModal || !summaryBody) return;
        summaryModal.style.display = 'flex';
        summaryBody.innerHTML = `<div class="ai-loading"><div class="spinner"></div> Synthesizing meeting notes & multi-lingual transcript...</div>`;

        const room = getRoomCode();

        try {
            const res = await fetch(`/api/room/${room}/summary`);
            const data = await res.json();

            if (data.success && data.summary) {
                renderSummary(data.summary);
            } else {
                summaryBody.innerHTML = `<div class="ai-error">Failed to generate summary: ${data.error || 'Unknown error'}</div>`;
            }
        } catch (err) {
            summaryBody.innerHTML = `<div class="ai-error">Network error while fetching summary.</div>`;
        }
    }

    function renderSummary(summary) {
        let html = `<div class="summary-container">`;
        html += `<h4 class="summary-title">${summary.title || 'Meeting Summary'}</h4>`;
        html += `<p class="summary-overview">${summary.overview || ''}</p>`;

        if (summary.keyPoints && summary.keyPoints.length > 0) {
            html += `<div class="summary-section"><h5>📌 Key Topics & Highlights</h5><ul>`;
            summary.keyPoints.forEach(point => {
                html += `<li>${point}</li>`;
            });
            html += `</ul></div>`;
        }

        if (summary.actionItems && summary.actionItems.length > 0) {
            html += `<div class="summary-section"><h5>✅ Action Items</h5><ul>`;
            summary.actionItems.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += `</ul></div>`;
        }

        if (summary.participants && summary.participants.length > 0) {
            html += `<div class="summary-section"><h5>👥 Active Contributors</h5><div class="participant-pills">`;
            summary.participants.forEach(p => {
                html += `<span class="participant-pill">${p}</span>`;
            });
            html += `</div></div>`;
        }

        html += `</div>`;
        summaryBody.innerHTML = html;
    }

    if (summaryBtn) summaryBtn.addEventListener('click', loadAISummary);
    if (closeSummaryModalBtn) closeSummaryModalBtn.addEventListener('click', () => summaryModal.style.display = 'none');
    if (closeSummaryBtn) closeSummaryBtn.addEventListener('click', () => summaryModal.style.display = 'none');

    if (copySummaryBtn) {
        copySummaryBtn.addEventListener('click', () => {
            const textToCopy = summaryBody.innerText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                copySummaryBtn.textContent = '✓ Copied!';
                setTimeout(() => copySummaryBtn.textContent = '📋 Copy Summary', 2000);
            });
        });
    }

    // AI Quiz Modal Logic
    async function loadAIQuiz() {
        const optionsDropdown = document.getElementById('options-dropdown');
        if (optionsDropdown) optionsDropdown.classList.remove('show');

        if (!quizModal || !quizBody) return;
        quizModal.style.display = 'flex';
        quizBody.innerHTML = `<div class="ai-loading"><div class="spinner"></div> Generating interactive room quiz...</div>`;
        if (submitQuizBtn) submitQuizBtn.style.display = 'none';
        userAnswers = {};

        const room = getRoomCode();

        try {
            const res = await fetch(`/api/room/${room}/quiz`);
            const data = await res.json();

            if (data.success && data.quiz) {
                currentQuizData = data.quiz;
                renderQuiz(data.quiz);
            } else {
                quizBody.innerHTML = `<div class="ai-error">Failed to generate quiz: ${data.error || 'Unknown error'}</div>`;
            }
        } catch (err) {
            quizBody.innerHTML = `<div class="ai-error">Network error while fetching quiz.</div>`;
        }
    }

    function renderQuiz(quiz) {
        let html = `<div class="quiz-container"><h4 class="quiz-title">${quiz.title || 'Room Knowledge Check'}</h4>`;

        if (!quiz.questions || quiz.questions.length === 0) {
            html += `<p>No quiz questions available yet.</p></div>`;
            quizBody.innerHTML = html;
            return;
        }

        quiz.questions.forEach((q, idx) => {
            html += `<div class="quiz-card" data-qid="${q.id}">`;
            html += `<div class="quiz-question font-semibold">Q${idx + 1}: ${q.question}</div>`;
            html += `<div class="quiz-options">`;

            q.options.forEach((opt, optIdx) => {
                html += `<button class="quiz-option-btn" data-qid="${q.id}" data-opt="${optIdx}">
                    <span class="opt-letter">${String.fromCharCode(65 + optIdx)}</span> ${opt}
                </button>`;
            });

            html += `</div><div class="quiz-explanation" id="exp-${q.id}" style="display:none;"></div></div>`;
        });

        html += `</div>`;
        quizBody.innerHTML = html;
        if (submitQuizBtn) submitQuizBtn.style.display = 'inline-block';

        // Add option selection events
        document.querySelectorAll('.quiz-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const qid = btn.getAttribute('data-qid');
                const optIdx = parseInt(btn.getAttribute('data-opt'), 10);
                userAnswers[qid] = optIdx;

                document.querySelectorAll(`.quiz-option-btn[data-qid="${qid}"]`).forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    if (submitQuizBtn) {
        submitQuizBtn.addEventListener('click', () => {
            if (!currentQuizData || !currentQuizData.questions) return;
            let score = 0;
            const total = currentQuizData.questions.length;

            currentQuizData.questions.forEach(q => {
                const selectedOpt = userAnswers[q.id];
                const expEl = document.getElementById(`exp-${q.id}`);

                document.querySelectorAll(`.quiz-option-btn[data-qid="${q.id}"]`).forEach((btn, idx) => {
                    btn.disabled = true;
                    if (idx === q.answerIndex) {
                        btn.classList.add('correct');
                    } else if (idx === selectedOpt && selectedOpt !== q.answerIndex) {
                        btn.classList.add('incorrect');
                    }
                });

                if (selectedOpt === q.answerIndex) {
                    score++;
                }

                if (expEl && q.explanation) {
                    expEl.innerHTML = `💡 <strong>Explanation:</strong> ${q.explanation}`;
                    expEl.style.display = 'block';
                }
            });

            submitQuizBtn.style.display = 'none';

            const scoreHtml = `<div class="quiz-score-banner">
                🎉 Quiz Completed! You scored <strong>${score} / ${total}</strong>
            </div>`;
            quizBody.insertAdjacentHTML('afterbegin', scoreHtml);
        });
    }

    if (quizBtn) quizBtn.addEventListener('click', loadAIQuiz);
    if (closeQuizModalBtn) closeQuizModalBtn.addEventListener('click', () => quizModal.style.display = 'none');
    if (closeQuizBtn) closeQuizBtn.addEventListener('click', () => quizModal.style.display = 'none');

    // Close modals on backdrop click
    if (summaryModal) {
        summaryModal.addEventListener('click', (e) => {
            if (e.target === summaryModal) summaryModal.style.display = 'none';
        });
    }
    if (quizModal) {
        quizModal.addEventListener('click', (e) => {
            if (e.target === quizModal) quizModal.style.display = 'none';
        });
    }

    // Initialize speech engine and socket bindings
    function startEngine() {
        initCaptions();
        bindSocketEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startEngine);
    } else {
        startEngine();
    }

})();

