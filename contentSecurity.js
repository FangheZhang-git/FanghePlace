const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
function contentSecurityPolicy(root, production) {
    const hashes = new Set();
    for (const file of fs.readdirSync(root).filter(name => name.endsWith('.html'))) {
        const html = fs.readFileSync(path.join(root, file), 'utf8');
        for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
            if (!/\bsrc\s*=/i.test(match[1]) && match[2].trim()) {
                hashes.add(`'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`);
            }
        }
    }
    return { directives: {
        reportUri: ['/api/csp-report'],
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ...hashes, 'https://challenges.cloudflare.com', 'https://cdn.gtranslate.net', 'https://translate.google.com', 'https://translate.googleapis.com', 'https://www.gstatic.com'],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://translate.googleapis.com', 'https://www.gstatic.com', 'https://fonts.googleapis.com'],
        imgSrc: ['https://fonts.gstatic.com', "'self'", 'data:', 'https://translate.google.com', 'https://translate.googleapis.com', 'https://www.google.com', 'https://www.gstatic.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'https://translate-pa.googleapis.com', 'https://translate.googleapis.com', 'https://translate.google.com', 'https://challenges.cloudflare.com'],
        frameSrc: ['https://challenges.cloudflare.com', 'https://translate.google.com'],
        objectSrc: ["'none'"], baseUri: ["'none'"], formAction: ["'self'"], frameAncestors: ["'none'"],
        upgradeInsecureRequests: production ? [] : null
    } };
}
module.exports = { contentSecurityPolicy };
