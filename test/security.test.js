const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { securityConfig, publicFiles, scalarBody, validateAuth, accountLimiter, captcha } = require('../security');
const { validateWrite } = require('../requestValidation');

async function withServer(app, run) {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    try { await run(`http://127.0.0.1:${server.address().port}`); }
    finally { await new Promise(resolve => server.close(resolve)); }
}
function base() { return express().use(express.json({ limit: '50kb' })).use(scalarBody).use(validateWrite); }
function post(url, body, headers = {}) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
test('production refuses weak secrets and missing/partial CAPTCHA setup', () => {
    assert.throws(() => securityConfig({ JWT_SECRET: 'short' }));
    assert.throws(() => securityConfig({ JWT_SECRET: 'x'.repeat(32), RAILWAY_ENVIRONMENT_ID: 'production-id' }));
    assert.throws(() => securityConfig({ JWT_SECRET: 'x'.repeat(32), NODE_ENV: 'production' }));
    assert.throws(() => securityConfig({ JWT_SECRET: 'x'.repeat(32), TURNSTILE_SITE_KEY: 'public' }));
    assert.equal(securityConfig({ JWT_SECRET: 'x'.repeat(32) }).siteKey, '');
    assert.equal(securityConfig({ JWT_SECRET: 'x'.repeat(32), NODE_ENV: 'production', TURNSTILE_SITE_KEY: 'public', TURNSTILE_SECRET_KEY: 'private', TURNSTILE_HOSTNAMES: 'example.com' }).production, true);
});
test('public assets work; source, SQL, dotfiles, dependencies and traversal are not served', async () => {
    const app = express().use(publicFiles(path.resolve(__dirname, '..')));
    await withServer(app, async url => {
        for (const file of ['/', '/login.html', '/styles.css', '/javascript/authSecurity.js', '/image/ScholarMatch.png']) assert.equal((await fetch(url + file)).status, 200, file);
        for (const file of ['/server.js', '/security.js', '/requestValidation.js', '/package.json', '/scholarmatch-production.sql', '/.env', '/node_modules/express/package.json', '/database/research/moderate-scholarships.js', '/javascript/%2e%2e%2fserver.js', '/css/../server.js']) assert.equal((await fetch(url + file)).status, 404, file);
    });
});
test('structured SQL parameters and invalid fields are rejected before handlers', async () => {
    const app = base();
    app.post('/login', validateAuth, (req, res) => res.json({ email: req.body.email }));
    app.post('/profile', (req, res) => res.json(req.body));
    app.post('/submit-scholarship', (req, res) => res.sendStatus(204));
    await withServer(app, async url => {
        for (const body of [{ email: { password: 1 }, password: 'test' }, { email: ['a@b.com'], password: 'test' }, []]) assert.equal((await post(url + '/login', body)).status, 400);
        assert.equal((await post(url + '/profile', { gpa: -1 })).status, 400);
        assert.equal((await post(url + '/profile', { has_ap: 'false' })).status, 400);
        assert.equal((await post(url + '/submit-scholarship', { name: 'A', apply_url: 'javascript:alert(1)' })).status, 400);
        assert.equal((await post(url + '/submit-scholarship', { name: 'A', race: 'No Restriction' })).status, 204);
        const response = await post(url + '/profile', { gpa: '3.5', has_ap: '0', willing_essay: true });
        assert.deepEqual(await response.json(), { gpa: 3.5, has_ap: 0, willing_essay: 1 });
        const login = await post(url + '/login', { email: " x'OR1=1@example.com ", password: 'test' });
        assert.equal(login.status, 200); // SQL-like text stays a scalar; not a keyword blacklist.
    });
});
test('CAPTCHA requires tokens, expected hostname/action, and fails closed on outage/reuse', async () => {
    const config = { siteKey: 'public', secretKey: 'private', hostnames: ['example.com'] };
    let result = { success: true, hostname: 'example.com', action: 'login' };
    let outage = false;
    let calls = 0;
    const app = base();
    app.post('/login', captcha(config, async () => {
        calls++;
        if (outage) throw Error('network unavailable');
        return { ok: true, json: async () => result };
    }), (req, res) => res.sendStatus(204));
    await withServer(app, async url => {
        assert.equal((await post(url + '/login', {})).status, 400);
        assert.equal(calls, 0);
        assert.equal((await post(url + '/login', { captchaToken: 'token' })).status, 204);
        for (const invalid of [{ success: false, 'error-codes': ['timeout-or-duplicate'] }, { success: true, hostname: 'evil.example', action: 'login' }, { success: true, hostname: 'example.com', action: 'signup' }]) {
            result = invalid;
            assert.equal((await post(url + '/login', { captchaToken: 'token' })).status, 400);
        }
        outage = true;
        assert.equal((await post(url + '/login', { captchaToken: 'token' })).status, 503);
    });
});
test('account throttling cannot be bypassed by changing forwarded IP headers', async () => {
    const app = base();
    app.post('/login', validateAuth, accountLimiter(), (req, res) => res.sendStatus(401));
    await withServer(app, async url => {
        for (let i = 0; i < 10; i++) assert.equal((await post(url + '/login', { email: 'Test@Example.com', password: 'test' }, { 'X-Forwarded-For': `192.0.2.${i}` })).status, 401);
        const limited = await post(url + '/login', { email: 'test@example.com', password: 'test' });
        assert.equal(limited.status, 429);
        assert.ok(limited.headers.get('retry-after'));
    });
});

test('Railway binding and proxy trust must be explicit and bounded', () => {
    const env = { JWT_SECRET: 'x'.repeat(32) };
    assert.equal(securityConfig(env).host, '127.0.0.1');
    assert.equal(securityConfig(env).trustProxy, false);
    assert.equal(securityConfig({ ...env, RAILWAY_ENVIRONMENT_ID: 'test', TURNSTILE_SITE_KEY: 'public', TURNSTILE_SECRET_KEY: 'private', TURNSTILE_HOSTNAMES: 'example.com' }).host, '0.0.0.0');
    assert.equal(securityConfig({ ...env, TRUSTED_PROXY_HOPS: '1' }).trustProxy, 1);
    assert.throws(() => securityConfig({ ...env, TRUSTED_PROXY_HOPS: 'true' }));
    assert.throws(() => securityConfig({ ...env, TRUSTED_PROXY_HOPS: '1', TRUSTED_PROXIES: 'loopback' }));
});
