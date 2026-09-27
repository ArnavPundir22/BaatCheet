const https = require('https');
const http = require('http');

/**
 * Periodically pings the server to keep free-tier PaaS instances (like Render) active
 * and prevent cold-starts or automatic spin-downs after 15 minutes of inactivity.
 */
function startKeepAlive() {
    const url = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || process.env.PING_URL;
    
    if (!url) {
        console.log('[Keep-Alive] No RENDER_EXTERNAL_URL or SELF_URL environment variable set.');
        console.log('[Keep-Alive] Render automatically sets RENDER_EXTERNAL_URL in production. Set SELF_URL to force local/custom pinging.');
        return;
    }

    const intervalMinutes = parseInt(process.env.PING_INTERVAL_MINUTES, 10) || 14;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`[Keep-Alive] Service active. Target: ${url}/ping (Interval: every ${intervalMinutes} mins)`);

    // Perform an initial ping after 1 minute to verify connectivity
    setTimeout(() => pingServer(url), 60 * 1000);

    // Schedule recurring pings
    setInterval(() => pingServer(url), intervalMs);
}

function pingServer(url) {
    const pingTarget = url.endsWith('/') ? `${url}ping` : `${url}/ping`;
    const client = pingTarget.startsWith('https') ? https : http;

    client.get(pingTarget, (res) => {
        console.log(`[Keep-Alive Ping] ${pingTarget} responded with status: ${res.statusCode} at ${new Date().toISOString()}`);
    }).on('error', (err) => {
        console.error('[Keep-Alive Ping Error]:', err.message);
    });
}

module.exports = startKeepAlive;
