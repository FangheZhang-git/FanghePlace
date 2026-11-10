const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { sessionSecurity } = require('../sessionSecurity');
const { contentSecurityPolicy } = require('../contentSecurity');
const path = require('node:path');
const fs = require('node:fs');

test('cookie sessions require bound CSRF, revoke on logout, reject bearer tokens and refresh permissions', async () => {
    const rows = new Map();
    let admin = 0;
    const db = { async query(sql, args) {
        if (sql.startsWith('INSERT INTO web_sessions')) { rows.set(args[0], args[1]); return [{}]; }
        if (sql.startsWith('DELETE FROM web_sessions WHERE token_hash')) { rows.delete(args[0]); return [{}]; }
        if (sql.startsWith('SELECT u.id')) return [rows.has(args[0]) ? [{ id: 7, is_admin: admin, expires: Date.now()/1000+3600 }] : []];
        return [[]];
    } };
    const sessions = sessionSecurity(db, { production: true }, 'x'.repeat(48));
    const app = express().use(sessions.protectWrites).use(express.json());
    app.get('/api/session', sessions.describe);
    app.post('/login', async (req,res) => res.json({user:await sessions.issue(req,res,{id:7,is_admin:0})}));
    app.post('/logout', sessions.logout);
    app.get('/private', sessions.authenticate, (req,res)=>res.json(req.user));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    const url='http://127.0.0.1:'+server.address().port;
    const post=(route,cookie,csrf,origin=url)=>fetch(url+route,{method:'POST',headers:{Cookie:cookie,'X-CSRF-Token':csrf,Origin:origin,'Content-Type':'application/json'},body:'{}'});
    try {
        const guest=await fetch(url+'/api/session');const guestCookie=guest.headers.getSetCookie()[0].split(';')[0];const {csrfToken}=await guest.json();
        assert.match(guest.headers.getSetCookie()[0],/HttpOnly/);assert.match(guest.headers.getSetCookie()[0],/Secure/);assert.match(guest.headers.getSetCookie()[0],/SameSite=Lax/);
        assert.equal((await post('/login',guestCookie,'bad')).status,403);
        assert.equal((await post('/login',guestCookie,csrfToken,'https://evil.example')).status,403);
        const login=await post('/login',guestCookie,csrfToken);assert.equal(login.status,200);
        assert.equal((await login.json()).token,undefined);
        const sessionCookie=login.headers.getSetCookie().find(c=>c.startsWith('__Host-scholarmatch_session=')).split(';')[0];
        assert.equal((await fetch(url+'/private',{headers:{Authorization:'Bearer old-token'}})).status,401);
        assert.equal((await fetch(url+'/private',{headers:{Cookie:sessionCookie}})).status,200);
        admin=1;assert.equal((await (await fetch(url+'/private',{headers:{Cookie:sessionCookie}})).json()).is_admin,1);
        assert.equal((await post('/logout',sessionCookie,csrfToken)).status,403);
        const state=await (await fetch(url+'/api/session',{headers:{Cookie:sessionCookie}})).json();
        assert.equal((await post('/logout',sessionCookie,state.csrfToken)).status,200);
        assert.equal((await fetch(url+'/private',{headers:{Cookie:sessionCookie}})).status,401);
    } finally {await new Promise(resolve=>server.close(resolve));}
});

test('CSP blocks inline handlers/eval and permits required CAPTCHA sources',()=>{
    const directives=contentSecurityPolicy(path.resolve(__dirname,'..'),true).directives;
    assert.deepEqual(directives.scriptSrcAttr,["'none'"]);
    assert.ok(!directives.scriptSrc.includes("'unsafe-inline'"));
    assert.ok(!directives.scriptSrc.includes("'unsafe-eval'"));
    assert.ok(directives.frameSrc.includes('https://challenges.cloudflare.com'));
    for(const file of fs.readdirSync(path.resolve(__dirname,'..')).filter(f=>f.endsWith('.html'))){
        const html=fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');
        assert.ok(!/\son(?:click|keyup|load|error)\s*=/i.test(html),file);
    }
});

test('patched minimatch preserves Crawlee glob matching behavior',()=>{
    const {createRequire}=require('node:module');
    const coreRequire=createRequire(require.resolve('@crawlee/core'));
    const {Minimatch,minimatch}=coreRequire('minimatch');
    const pattern='https://example.org/scholarships/**';
    assert.ok(new Minimatch(pattern,{nocase:true}).match('https://EXAMPLE.org/scholarships/a'));
    assert.ok(minimatch('https://example.org/scholarships/a',pattern,{nocase:true}));
    assert.equal(minimatch('https://other.org/scholarships/a',pattern),false);
});
