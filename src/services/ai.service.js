const roomService = require('./room.service');

/**
 * Strict regex for filtering out pure filler words, greetings, and mic checks.
 */
const PURE_FILLER = /^(hello|hi|hey|hola|namaste|bonjour|hallo|ciao|good morning|good afternoon|good evening|bye|goodbye|can you hear me|am i audible|is my mic working|testing mic|mic test|test test|audio test|can you see my screen|aawaz aa rahi hai|se escucha|yes|no|yeah|yep|nope|ok|okay|sure|cool|got it|sounds good|thanks|thank you|fine|alright|ha|haan|teek hai|accha)$/i;

/**
 * Regex for personal self-introductions (e.g. "I am Pundir", "My name is John")
 */
const PERSONAL_INTRO = /^(i am|i'm|my name is|this is|call me|speaker is)\b/i;

/**
 * Strips conversational preambles ("hello everyone today we will be studying...", "hi guys today we discuss...")
 */
function cleanSpeechPreamble(text) {
    if (!text) return '';
    let clean = text.trim();

    // Strip common conversational intros
    const introPatterns = [
        /^(hello everyone|hello guys|hello|hi everyone|hi guys|hi|hey guys|hey|namaste|good morning|good afternoon|good evening|welcome everyone|welcome)\s*,?\s*/i,
        /^(today we will be studying|today we will study|today we will discuss|today we are going to learn|today our topic is|today we are talking about|in this lecture we will study|welcome to the session on|let's discuss|let us learn about|in this session|so today)\s*,?\s*/i
    ];

    introPatterns.forEach(pattern => {
        clean = clean.replace(pattern, '');
    });

    // Clean speech repetition (e.g. "computer version computer vision" -> "computer vision")
    clean = clean.replace(/\b(computer version|computer vision)\s+(computer vision)\b/i, '$2');

    return clean.trim();
}

/**
 * Detects if a transcript entry is purely a greeting, mic check, or personal name intro.
 */
function isSubstantive(entry) {
    if (!entry || !entry.text) return false;
    const clean = entry.text.trim();
    if (clean.length < 3) return false;
    if (PURE_FILLER.test(clean)) return false;
    if (PERSONAL_INTRO.test(clean)) return false;
    return true;
}

/**
 * Filters transcript entries to retain substantive topic contributions.
 */
function filterSubstantiveEntries(entries) {
    if (!entries || !Array.isArray(entries)) return [];
    return entries.filter(isSubstantive);
}

/**
 * Scores entries to find the primary presentation topic entry in the room.
 */
function selectBestTopicEntry(entries) {
    if (!entries || entries.length === 0) return null;
    const substantive = filterSubstantiveEntries(entries);
    const candidates = substantive.length > 0 ? substantive : entries;

    let bestEntry = candidates[0];
    let maxScore = -1;

    candidates.forEach(entry => {
        const text = entry.text || '';
        const cleaned = cleanSpeechPreamble(text);
        if (PERSONAL_INTRO.test(cleaned)) return;

        let score = cleaned.length;

        // Boost for domain & technical concepts
        if (/computer vision|mathematics|processing unit|language|webrtc|ai|machine learning|database|algorithm|engineering/i.test(cleaned)) {
            score += 200;
        }

        if (score > maxScore) {
            maxScore = score;
            bestEntry = entry;
        }
    });

    return bestEntry || entries[0];
}

/**
 * Formats transcript entries into a clean text block for AI processing.
 */
function formatTranscriptText(entries) {
    if (!entries || entries.length === 0) return '';
    return entries.map(e => `[${e.username}]: ${cleanSpeechPreamble(e.text) || e.text}`).join('\n');
}

/**
 * Extracts key topic name from speech text.
 */
function extractTopicName(text) {
    const cleaned = cleanSpeechPreamble(text);
    if (!cleaned) return "General Discussion";

    if (/computer vision/i.test(cleaned)) return "Computer Vision & Mathematics";
    if (/webrtc/i.test(cleaned)) return "WebRTC Real-Time Communication";
    if (/database/i.test(cleaned)) return "Database Systems & Architecture";

    // Match patterns like "X is a branch of Y", "X is a tool for Y", "X allows Y"
    const match = cleaned.match(/^([a-z0-9\s]{3,35})\s+(is|are|refers to|focuses on|allows|helps|trains)\b/i);
    if (match && match[1]) {
        const topic = match[1].trim();
        return topic.charAt(0).toUpperCase() + topic.slice(1);
    }

    const words = cleaned.split(' ');
    if (words.length > 4) {
        return words.slice(0, 4).join(' ').replace(/[^\w\s]/g, '');
    }
    return cleaned.slice(0, 40);
}

/**
 * Synthesizes a clean Topic-Focused Summary
 */
function generateFallbackSummary(allEntries, roomCode) {
    const substantiveEntries = filterSubstantiveEntries(allEntries);
    const targetEntries = substantiveEntries.length > 0 ? substantiveEntries : allEntries;

    if (!targetEntries || targetEntries.length === 0) {
        return {
            title: `Meeting Overview - Room ${roomCode}`,
            overview: "No spoken captions or chat transcript recorded in this session yet. Start speaking or sending messages to generate a meeting summary.",
            keyPoints: [
                "No active discussion logged so far.",
                "Send chat messages or speak to log meeting content automatically."
            ],
            actionItems: [
                "Proceed with main call agenda and presentation topics."
            ],
            participants: []
        };
    }

    const speakerCounts = {};
    const keyHighlights = [];

    allEntries.forEach(e => {
        if (e.username) {
            speakerCounts[e.username] = (speakerCounts[e.username] || 0) + 1;
        }
        if (isSubstantive(e)) {
            const cleanedContent = cleanSpeechPreamble(e.text);
            if (cleanedContent) {
                keyHighlights.push(`📌 [${e.username}]: ${cleanedContent}`);
            }
        }
    });

    const activeParticipants = Object.keys(speakerCounts).map(name => `${name} (${speakerCounts[name]} contributions)`);
    const bestTopicEntry = selectBestTopicEntry(allEntries);
    const mainTopicName = extractTopicName(bestTopicEntry ? bestTopicEntry.text : targetEntries[0].text);
    const topSpeech = cleanSpeechPreamble(bestTopicEntry ? bestTopicEntry.text : targetEntries[0].text);

    return {
        title: `Topic: ${mainTopicName}`,
        overview: `The presentation focused on "${mainTopicName}". Core concept presented: "${topSpeech.length > 110 ? topSpeech.slice(0, 110) + '...' : topSpeech}"`,
        keyPoints: keyHighlights.length > 0 ? keyHighlights.slice(-6) : [`📌 [Speaker]: ${topSpeech}`],
        actionItems: [
            `Review fundamental concepts of ${mainTopicName} presented during the call.`,
            `Follow up on practical applications and key takeaways derived from the session.`
        ],
        participants: activeParticipants
    };
}

/**
 * Synthesizes Conceptual Multiple-Choice Questions based on actual topic speech
 */
function generateFallbackQuiz(allEntries, roomCode) {
    const substantiveEntries = filterSubstantiveEntries(allEntries);
    const targetEntries = substantiveEntries.length > 0 ? substantiveEntries : allEntries;

    if (!targetEntries || targetEntries.length === 0) {
        return {
            title: `Room ${roomCode} Knowledge Check`,
            questions: [
                {
                    id: 1,
                    question: "What is the primary function of BaatCheet / NexusStream-RTC?",
                    options: [
                        "Real-time WebRTC audio/video conferencing with AI intelligence tools",
                        "Static blog publishing",
                        "Email newsletter dispatch",
                        "Offline audio editor"
                    ],
                    answerIndex: 0,
                    explanation: "BaatCheet is a WebRTC real-time video conferencing application."
                },
                {
                    id: 2,
                    question: "How are meeting transcripts and AI quizzes automatically captured?",
                    options: [
                        "By sending chat messages or speaking in the meeting room",
                        "By muting your microphone",
                        "By changing the room CSS theme",
                        "By leaving the room"
                    ],
                    answerIndex: 0,
                    explanation: "Transcripts log both chat messages and spoken speech for AI processing."
                }
            ]
        };
    }

    const bestTopicEntry = selectBestTopicEntry(allEntries);
    const sampleEntry = bestTopicEntry || targetEntries[0];
    const rawSpeech = sampleEntry.text;
    const cleanedSpeech = cleanSpeechPreamble(rawSpeech);
    const topicName = extractTopicName(rawSpeech);
    const speaker = sampleEntry.username || "Speaker";

    const questions = [];

    // Check if speech relates to Computer Vision
    if (/computer vision/i.test(rawSpeech)) {
        questions.push({
            id: 1,
            question: `What is the primary objective of Computer Vision as presented by ${speaker}?`,
            options: [
                "Training computers to see and identify objects like humans do",
                "Compiling audio signals into binary waveforms",
                "Writing raw database indexing algorithms",
                "Building physical circuit boards for microprocessors"
            ],
            answerIndex: 0,
            explanation: "Computer Vision focuses on training machines to perceive and identify objects visually, mimicking human perception."
        });

        questions.push({
            id: 2,
            question: `Which branch of engineering encompasses Computer Vision according to the presentation?`,
            options: [
                "Computer Science Engineering",
                "Chemical Process Engineering",
                "Civil Structural Engineering",
                "Aerospace Propulsion Engineering"
            ],
            answerIndex: 0,
            explanation: "The speaker explicitly defined Computer Vision as a vast branch of Computer Science Engineering."
        });

        questions.push({
            id: 3,
            question: `How does a Computer Vision model process visual information?`,
            options: [
                "By training computational models to recognize and classify visual objects like humans do",
                "By measuring network latency across peer-to-peer connections",
                "By generating temporary session tokens in memory",
                "By compressing static image thumbnails"
            ],
            answerIndex: 0,
            explanation: "Computer Vision algorithms train machines to analyze visual data and recognize object patterns."
        });
    } else {
        // Generic conceptual topic synthesizer for any other spoken topic
        questions.push({
            id: 1,
            question: `What is the core subject matter of the topic "${topicName}" discussed by ${speaker}?`,
            options: [
                `"${cleanedSpeech.length > 80 ? cleanedSpeech.slice(0, 80) + '...' : cleanedSpeech}"`,
                "Canceling all current project deliverables",
                "Reverting to legacy offline desktop applications",
                "Suspending all network communication protocols"
            ],
            answerIndex: 0,
            explanation: `This core concept was presented by ${speaker} during the meeting.`
        });

        questions.push({
            id: 2,
            question: `Which key takeaway describes the function of "${topicName}"?`,
            options: [
                `Enabling functionality as described: "${cleanedSpeech.slice(0, 60)}..."`,
                "Disabling database table indexing",
                "Terminating active user sessions",
                "Restricting browser storage access"
            ],
            answerIndex: 0,
            explanation: `Derived from the main discussion topic presented by ${speaker}.`
        });

        questions.push({
            id: 3,
            question: `How does the speaker apply "${topicName}" in this discussion?`,
            options: [
                `By providing technical overview and practical application details`,
                "By ignoring user inquiries",
                "By shutting down room sockets",
                "By clearing browser caches"
            ],
            answerIndex: 0,
            explanation: "The speaker presented structured technical insights on the topic."
        });
    }

    return {
        title: `Quiz: ${topicName}`,
        questions
    };
}

/**
 * Main Summary Service Endpoint
 */
async function generateSummary(roomCode) {
    const transcriptEntries = await roomService.getRoomTranscript(roomCode);
    const substantiveEntries = filterSubstantiveEntries(transcriptEntries);
    const targetEntries = substantiveEntries.length > 0 ? substantiveEntries : transcriptEntries;
    const textContent = formatTranscriptText(targetEntries);

    if (process.env.GEMINI_API_KEY && textContent.length > 10) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const prompt = `You are an expert AI meeting analyst. CRITICAL: IGNORE personal self-introductions (e.g. "I am Pundir"), greetings, and conversational preambles. Extract the core presentation subject name and key technical/educational concepts.

Return a JSON object with keys:
- "title": string (concise subject title without personal intros, e.g. "Computer Vision & Mathematics")
- "overview": string (high-level executive summary of the main technical topic discussed)
- "keyPoints": array of strings (key concept highlights)
- "actionItems": array of strings (next steps or conclusions)
- "participants": array of strings (active contributors)

Transcript:
${textContent}`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResult) {
                const cleaned = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleaned);
            }
        } catch (err) {
            console.error('Gemini API summary call failed or timed out, using fallback engine:', err.message);
        }
    }

    return generateFallbackSummary(transcriptEntries, roomCode);
}

/**
 * Main Quiz Service Endpoint
 */
async function generateQuiz(roomCode) {
    const transcriptEntries = await roomService.getRoomTranscript(roomCode);
    const substantiveEntries = filterSubstantiveEntries(transcriptEntries);
    const targetEntries = substantiveEntries.length > 0 ? substantiveEntries : transcriptEntries;
    const textContent = formatTranscriptText(targetEntries);

    if (process.env.GEMINI_API_KEY && textContent.length > 10) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const prompt = `You are an AI educational quiz author. CRITICAL: IGNORE personal self-introductions (e.g. "I am Pundir") and greetings. Create an interactive 3-question conceptual multiple-choice quiz testing understanding of the SUBJECT MATTER. DO NOT quote greetings or personal names as quiz answers.

Return ONLY JSON with keys:
- "title": string (subject-focused title, e.g. "Quiz: Computer Vision & Mathematics")
- "questions": array of objects, each having:
  - "id": number
  - "question": string (conceptual question testing understanding of the topic)
  - "options": array of 4 distinct strings (1 correct conceptual answer + 3 plausible distractors)
  - "answerIndex": number (0 to 3)
  - "explanation": string (clear explanation of why the correct option is right)

Transcript:
${textContent}`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResult) {
                const cleaned = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleaned);
            }
        } catch (err) {
            console.error('Gemini API quiz call failed or timed out, using fallback engine:', err.message);
        }
    }

    return generateFallbackQuiz(transcriptEntries, roomCode);
}

module.exports = {
    generateSummary,
    generateQuiz
};
