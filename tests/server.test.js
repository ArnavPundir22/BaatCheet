const request = require('supertest');
const { app, redisClient, pubClient, subClient } = require('../server');

describe('AuraMeet Express Server', () => {
    // connection is handled by server.js on require

    afterAll(async () => {
        // Close redis connections so Jest can exit
        if (redisClient.isReady) await redisClient.quit();
        if (pubClient.isReady) await pubClient.quit();
        if (subClient.isReady) await subClient.quit();
    });

    test('GET / should return 200 OK', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toContain('AuraMeet'); // checking if EJS template rendered
    });

    test('GET /about should return 200 OK', async () => {
        const response = await request(app).get('/about');
        expect(response.status).toBe(200);
    });

    test('POST / with empty body should fail gracefully', async () => {
        const response = await request(app).post('/').type('form').send({});
        expect(response.status).toBe(200); // the current logic re-renders index with an error
        expect(response.text).toContain('Username is required.');
    });
});
