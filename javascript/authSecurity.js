// Shared login/signup transport: never submit until required verification is ready.
window.authRequest = (() => {
    const form = document.querySelector('form');
    const button = form.querySelector('button[type="submit"]');
    const message = document.getElementById('message');
    const container = document.createElement('div');
    container.id = 'securityVerification';
    form.insertBefore(container, button);
    let widget;
    let required = false;
    let token = '';
    button.disabled = true;
    const ready = (async () => {
        const response = await ScholarMatchSession.request('/api/security-config');
        if (!response.ok) throw new Error('Unable to load security verification. Please reload.');
        const config = await response.json();
        required = Boolean(config.siteKey);
        if (!required) { button.disabled = false; return; }
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Security verification timed out. Please reload.')), 15000);
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.onload = () => { clearTimeout(timer); resolve(); };
            script.onerror = () => { clearTimeout(timer); reject(new Error('Unable to load security verification. Please reload.')); };
            document.head.appendChild(script);
        });
        widget = window.turnstile.render(container, {
            sitekey: config.siteKey, action: form.id === 'loginForm' ? 'login' : 'signup',
            callback(value) { token = value; button.disabled = false; message.textContent = ''; },
            'expired-callback'() { token = ''; button.disabled = true; },
            'error-callback'() {
                token = ''; button.disabled = true;
                message.textContent = 'Security verification failed. Please reload and try again.';
            }
        });
    })();
    ready.catch(error => { message.textContent = error.message; });
    return async (url, body) => {
        await ready;
        if (required && !token) throw new Error('Complete the security verification.');
        button.disabled = true;
        try {
            return await ScholarMatchSession.request(url, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...body, captchaToken: token })
            });
        } finally {
            if (required) { token = ''; window.turnstile.reset(widget); }
            else button.disabled = false;
        }
    };
})();
