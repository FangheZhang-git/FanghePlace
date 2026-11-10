const { randomBytes, createHash, createHmac, timingSafeEqual } = require('node:crypto');
const SESSION_TTL = 60 * 60 * 1000;
const schema = `CREATE TABLE IF NOT EXISTS web_sessions (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id BIGINT NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX sessions_expiry (expires_at),
    CONSTRAINT web_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`;
function sessionSecurity(db, config, secret) {
    const cookieName = config.production ? '__Host-scholarmatch_session' : 'scholarmatch_session';
    const guestName = config.production ? '__Host-scholarmatch_csrf' : 'scholarmatch_csrf';
    const options = { httpOnly: true, secure: config.production, sameSite: 'lax', path: '/' };
    const hash = value => createHash('sha256').update(value).digest('hex');
    const csrf = value => createHmac('sha256', secret).update('csrf:' + value).digest('hex');
    function cookie(req, name) {
        const matches = (req.headers.cookie || '').split(';').map(s => s.trim()).filter(s => s.startsWith(name + '='));
        if (matches.length !== 1) return '';
        const value = matches[0].slice(name.length + 1);
        return /^[a-f0-9]{64}$/.test(value) ? value : '';
    }
    async function getUser(req) {
        const value = cookie(req, cookieName);
        if (!value) return null;
        const [rows] = await db.query(`SELECT u.id, u.email, u.username, u.is_admin, UNIX_TIMESTAMP(s.expires_at) AS expires
            FROM web_sessions s JOIN users u ON u.id=s.user_id
            WHERE s.token_hash=? AND s.expires_at > UTC_TIMESTAMP()`, [hash(value)]);
        return rows[0] || null;
    }
    async function revoke(req) {
        const value = cookie(req, cookieName);
        if (value) await db.query('DELETE FROM web_sessions WHERE token_hash=?', [hash(value)]);
    }
    async function issue(req, res, user) {
        await revoke(req);
        const value = randomBytes(32).toString('hex');
        await db.query('INSERT INTO web_sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))', [hash(value), user.id]);
        res.cookie(cookieName, value, { ...options, maxAge: SESSION_TTL });
        res.clearCookie(guestName, options);
        return { id: user.id, username: user.username, is_admin: Boolean(user.is_admin) };
    }
    async function authenticate(req, res, next) {
        try {
            const user = await getUser(req);
            if (!user) return res.status(401).json({ message: 'Please log in again.' });
            req.user = user;
            next();
        } catch (error) { next(error); }
    }
    // A session-bound HMAC plus same-origin enforcement protects every write, including login.
    function protectWrites(req, res, next) {
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
        const origin = req.get('Origin');
        const target = `${req.protocol}://${req.get('host')}`;
        if ((origin && origin !== target) || ['cross-site', 'same-site'].includes(req.get('Sec-Fetch-Site'))) {
            return res.status(403).json({ message: 'Cross-origin writes are not allowed.' });
        }
        const value = cookie(req, cookieName) || cookie(req, guestName);
        const supplied = req.get('X-CSRF-Token') || '';
        if (!value || !/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(csrf(value)))) {
            return res.status(403).json({ message: 'Security session expired. Reload and try again.' });
        }
        next();
    }
    async function describe(req, res, next) {
        try {
            const user = await getUser(req);
            let value = cookie(req, cookieName) || cookie(req, guestName);
            if (!user && cookie(req, cookieName)) {
                res.clearCookie(cookieName, options);
                value = '';
            }
            if (!value) {
                value = randomBytes(32).toString('hex');
                res.cookie(guestName, value, { ...options, maxAge: SESSION_TTL });
            }
            res.json({ user, csrfToken: csrf(value) });
        } catch (error) { next(error); }
    }
    async function logout(req, res, next) {
        try {
            await revoke(req);
            res.clearCookie(cookieName, options);
            res.clearCookie(guestName, options);
            res.json({ message: 'Logged out' });
        } catch (error) { next(error); }
    }
    async function initialize() {
        const [columns] = await db.query("SELECT COLUMN_TYPE AS type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='id'");
        const idType = columns[0]?.type;
        if (!/^(?:bigint|int)(?:\(\d+\))?(?: unsigned)?$/i.test(idType || '')) throw new Error('Unsupported user key type');
        await db.query(schema.replace('user_id BIGINT NOT NULL', `user_id ${idType} NOT NULL`));
        await db.query('DELETE FROM web_sessions WHERE expires_at <= UTC_TIMESTAMP()');
    }
    return { initialize, authenticate, issue, protectWrites, describe, logout };
}
module.exports = { sessionSecurity, schema };
