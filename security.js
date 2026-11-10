const express = require('express');
const { createHash } = require('node:crypto');
const rateLimit = require('express-rate-limit');

function securityConfig(env = process.env) {
    const production = env.NODE_ENV === 'production' || Boolean(env.RAILWAY_ENVIRONMENT_ID);
    if (!env.JWT_SECRET || Buffer.byteLength(env.JWT_SECRET) < 32) {
        throw new Error('JWT_SECRET must contain at least 32 bytes of random secret material');
    }
    const siteKey = env.TURNSTILE_SITE_KEY || '';
    const secretKey = env.TURNSTILE_SECRET_KEY || '';
    const hostnames = (env.TURNSTILE_HOSTNAMES || '').split(',').map(s => s.trim()).filter(Boolean);
    if (Boolean(siteKey) !== Boolean(secretKey) || ((production || siteKey) && (!siteKey || !hostnames.length))) {
        throw new Error('Configure TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY and TURNSTILE_HOSTNAMES before production startup');
    }
    let trustProxy = false;
    if (env.TRUSTED_PROXIES && env.TRUSTED_PROXY_HOPS) throw new Error('Configure proxy addresses OR proxy hops, not both');
    if (env.TRUSTED_PROXY_HOPS) {
        if (!/^[1-5]$/.test(env.TRUSTED_PROXY_HOPS)) throw new Error('TRUSTED_PROXY_HOPS must be 1–5');
        trustProxy = Number(env.TRUSTED_PROXY_HOPS);
    } else if (env.TRUSTED_PROXIES) {
        trustProxy = env.TRUSTED_PROXIES.split(',').map(value => value.trim()).filter(Boolean);
    }
    const host = env.HOST || (env.RAILWAY_ENVIRONMENT_ID ? '0.0.0.0' : '127.0.0.1');
    return { production, siteKey, secretKey, hostnames, trustProxy, host };
}

function publicFiles(root) {
    const pages = new Set(['index.html', 'high-school-scholarship-matching.html',
        'scholarship-finder-for-high-school-students.html', 'results.html', 'profile.html',
        'submit-scholarship.html', 'admin.html', 'login.html', 'signup.html', 'loading.html',
        'privacy.html', 'terms.html', 'showTopbar.html', 'scholarships.html', 'scholarship.html',
        'styles.css', 'admin.js', 'robots.txt', 'sitemap.xml', 'googlec694c46f6aa9bd23.html']);
    const serve = express.static(root, { dotfiles: 'deny', index: 'index.html', redirect: false });
    return (req, res, next) => {
        let pathname;
        try { pathname = decodeURIComponent(req.path); } catch { return res.sendStatus(400); }
        const file = pathname === '/' ? 'index.html' : pathname.slice(1);
        const safeAsset = /^(css\/[^/]+\.css|javascript\/[^/]+\.js|(?:image|carousel)\/[^/]+\.(?:svg|png|jpe?g|webp|gif|ico))$/.test(file);
        if (!file.includes('..') && !file.includes('\\') && (pages.has(file) || safeAsset)) return serve(req, res, next);
        next();
    };
}

// Reject structured SQL parameters: mysql2 query placeholders also accept objects/arrays.
function scalarBody(req, res, next) {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
    if (!req.is('application/json')) return res.status(415).json({ message: 'JSON body required' });
    if (!req.body || Array.isArray(req.body) || typeof req.body !== 'object' ||
        Object.keys(req.body).length > 50 || Object.entries(req.body).some(([key, value]) =>
            ['__proto__', 'constructor', 'prototype'].includes(key) ||
            (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) ||
            (typeof value === 'string' && value.length > 10000))) {
        return res.status(400).json({ message: 'Invalid request body' });
    }
    next();
}

function validateAuth(req, res, next) {
    const b = req.body;
    if (typeof b.email !== 'string' || b.email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim()) ||
        typeof b.password !== 'string' || !b.password.length || Buffer.byteLength(b.password) > 72) {
        return res.status(400).json({ message: 'Enter a valid email and password (maximum 72 bytes).' });
    }
    b.email = b.email.trim().toLowerCase();
    if (req.path === '/signup') {
        if (b.password.length < 12) return res.status(400).json({ message: 'Use a password of at least 12 characters.' });
        for (const key of ['first_name', 'last_name', 'username']) {
            if (typeof b[key] !== 'string' || !b[key].trim() || b[key].length > 50) {
                return res.status(400).json({ message: 'Name and username fields must contain 1–50 characters.' });
            }
            b[key] = b[key].trim();
        }
    }
    next();
}

function accountLimiter() {
    return rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true,
        legacyHeaders: false, skipSuccessfulRequests: true,
        keyGenerator: req => createHash('sha256').update(req.body.email).digest('hex'),
        message: { message: 'Too many attempts for this account. Please try again later.' } });
}

function captcha(config, request = fetch) {
    return async (req, res, next) => {
        if (!config.siteKey) return next(); // Development only; production config requires keys.
        const token = req.body.captchaToken;
        if (typeof token !== 'string' || !token || token.length > 2048) {
            return res.status(400).json({ message: 'Complete the security verification.' });
        }
        try {
            const result = await request('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST', signal: AbortSignal.timeout(8000),
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: config.secretKey, response: token, remoteip: req.ip })
            });
            if (!result.ok) throw new Error('Verification unavailable');
            const data = await result.json();
            if (!data.success || !config.hostnames.includes(data.hostname) || data.action !== req.path.slice(1)) {
                return res.status(400).json({ message: 'Security verification failed. Please try again.' });
            }
            next();
        } catch {
            res.status(503).json({ message: 'Security verification unavailable. Please try again later.' });
        }
    };
}

module.exports = { securityConfig, publicFiles, scalarBody, validateAuth, accountLimiter, captcha };
