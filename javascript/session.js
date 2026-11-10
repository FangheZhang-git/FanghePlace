// Authentication stays in an HttpOnly cookie; only public session state and a CSRF token enter JS.
window.ScholarMatchSession = (() => {
    for (const key of ['token', 'user_id', 'username']) localStorage.removeItem(key);
    let state;
    const ready = fetch('/api/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) })
        .then(async response => {
            if (!response.ok) throw new Error('Unable to check your session. Reload and try again.');
            state = await response.json();
            return state;
        });
    ready.catch(() => {});
    async function request(url, options = {}) {
        const target = new URL(url, location.href);
        if (target.origin !== location.origin) throw new Error('Only same-origin requests are supported.');
        await ready;
        const headers = new Headers(options.headers);
        headers.delete('Authorization');
        if (!['GET', 'HEAD', 'OPTIONS'].includes((options.method || 'GET').toUpperCase())) {
            headers.set('X-CSRF-Token', state.csrfToken);
        }
        const response = await fetch(target, { ...options, headers, credentials: 'same-origin' });
        if (response.status === 401) state.user = null;
        return response;
    }
    async function logout() {
        const response = await request('/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        if (!response.ok) throw new Error('Logout failed. Please try again.');
        location.replace('index.html');
    }
    return { ready, request, logout };
})();
