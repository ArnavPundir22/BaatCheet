const THEMES = {

// free theme
    aurora: {
        name: "Aurora",
        premium: false,

        bgDark: "#050510",
        bgCard: "rgba(10, 10, 25, 0.7)",
        panelBg: "rgba(15, 23, 42, 0.30)",

        primary: "#00f3ff",
        primaryHover: "#5cffff",

        secondary: "#ff00ea",
        secondaryHover: "#ff54f0",

        border: "rgba(0, 243, 255, 0.3)",

        textMain: "#e0f2fe",
        textMuted: "#94a3b8",
        textAccent: "#a5b4fc",

        buttonText: "#ffffff",

        success: "#86efac",
        error: "#fca5a5",
        neutral: "#8696a0",

        blob1: "#00f3ff",
        blob2: "#ff00ea"
    },

    midnightRomance: {
        name: "Midnight Romance",
        premium: false,

        bgDark: "#0f0614",
        bgCard: "rgba(25, 10, 25, 0.8)",
        panelBg: "rgba(45, 15, 35, 0.55)",

        primary: "#ff4da6",
        primaryHover: "#ff7abf",

        secondary: "#d946ef",
        secondaryHover: "#e879f9",

        border: "rgba(255, 77, 166, 0.3)",

        textMain: "#ffe4ec",
        textMuted: "#d8b4c7",
        textAccent: "#f9a8d4",

        buttonText: "#ffffff",

        success: "#86efac",
        error: "#fca5a5",
        neutral: "#8696a0",

        blob1: "#ff2d95",
        blob2: "#c026d3"
    },

    sunsetGlow: {
        name: "Sunset Glow",
        premium: false,

        bgDark: "#1a1020",
        bgCard: "rgba(35, 20, 28, 0.78)",
        panelBg: "rgba(45, 25, 35, 0.35)",

        primary: "#ff7b54",
        primaryHover: "#ff936f",

        secondary: "#ffb26b",
        secondaryHover: "#ffc98f",

        border: "rgba(255, 123, 84, 0.28)",

        textMain: "#fff4eb",
        textMuted: "#d8b4a0",
        textAccent: "#ffd59e",

        buttonText: "#ffffff",

        success: "#4ade80",
        error: "#fb7185",
        neutral: "#94a3b8",

        blob1: "#d65a31",
        blob2: "#ffd166"
    },

    cyberNeon: {
        name: "Cyber Neon",
        premium: false,

        bgDark: "#060818",
        bgCard: "rgba(8, 12, 32, 0.8)",
        panelBg: "rgba(10, 15, 40, 0.45)",

        primary: "#00ff9d",
        primaryHover: "#4dffb8",

        secondary: "#00e5ff",
        secondaryHover: "#6ff3ff",

        border: "rgba(0, 255, 157, 0.25)",

        textMain: "#ecfeff",
        textMuted: "#94a3b8",
        textAccent: "#00ff9d",

        buttonText: "#ffffff",

        success: "#22c55e",
        error: "#ef4444",
        neutral: "#94a3b8",

        blob1: "#00ff9d",
        blob2: "#00e5ff"
    },

    coffeeHouse: {
        name: "Coffee House",
        premium: false,

        bgDark: "#1c120d",
        bgCard: "rgba(40, 28, 20, 0.85)",
        panelBg: "rgba(60, 40, 25, 0.45)",

        primary: "#d4a373",
        primaryHover: "#e6b98a",

        secondary: "#8b5e34",
        secondaryHover: "#a06b3f",

        border: "rgba(212, 163, 115, 0.25)",

        textMain: "#f5ebe0",
        textMuted: "#c8b6a6",
        textAccent: "#ddb892",

        buttonText: "#ffffff",

        success: "#22c55e",
        error: "#ef4444",
        neutral: "#94a3b8",

        blob1: "#6f4e37",
        blob2: "#d4a373"
    },

    minimalBlack: {
        name: "Minimal Black",
        premium: false,

        bgDark: "#000000",
        bgCard: "rgba(18, 18, 18, 0.9)",
        panelBg: "rgba(25, 25, 25, 0.45)",

        primary: "#f5f5f5",
        primaryHover: "#ffffff",

        secondary: "#737373",
        secondaryHover: "#a3a3a3",

        border: "rgba(255,255,255,0.12)",

        textMain: "#ffffff",
        textMuted: "#9ca3af",
        textAccent: "#e5e5e5",

        buttonText: "#000000",

        success: "#22c55e",
        error: "#ef4444",
        neutral: "#6b7280",

        blob1: "#111111",
        blob2: "#222222"
    }
};

function applyTheme(themeName) {
    const theme = THEMES[themeName];

    if (!theme) {
        console.error(`Theme "${themeName}" not found`);
        return;
    }

    const root = document.documentElement;

    root.style.setProperty("--bg-dark", theme.bgDark);
    root.style.setProperty("--bg-card", theme.bgCard);

    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--primary-hover", theme.primaryHover);

    root.style.setProperty("--secondary", theme.secondary);
    root.style.setProperty("--secondary-hover", theme.secondaryHover);

    root.style.setProperty("--border", theme.border);

    root.style.setProperty("--text-main", theme.textMain);
    root.style.setProperty("--text-muted", theme.textMuted);
    root.style.setProperty("--text-accent", theme.textAccent);

    root.style.setProperty("--success", theme.success);
    root.style.setProperty("--error", theme.error);
    root.style.setProperty("--neutral", theme.neutral);

    root.style.setProperty("--blob-1", theme.blob1);
    root.style.setProperty("--blob-2", theme.blob2);

    root.style.setProperty("--panel-bg", theme.panelBg);

    root.style.setProperty("--button-text", theme.buttonText || "#ffffff" );
    root.style.setProperty("--bg-card", theme.bgCard);


    document.body.classList.remove(
    "theme-aurora",
    "theme-midnightRomance",
    "theme-sakuraCloud",
    "theme-sunsetGlow",
    "theme-cyberNeon",
    "theme-coffeeHouse",
    "theme-minimalBlack"
);

document.body.classList.add(`theme-${themeName}`);
}

function saveTheme(themeName) {
    localStorage.setItem("baatcheet-theme", themeName);
}

function loadTheme() {
    return localStorage.getItem("baatcheet-theme") || "aurora";
}

function setTheme(themeName) {
    saveTheme(themeName);
    applyTheme(themeName);
}

console.log("Theme engine loaded");

applyTheme(loadTheme());