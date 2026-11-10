document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { user } = await ScholarMatchSession.ready;
        if (!user) return location.replace('login.html');
        const remaining = user.expires * 1000 - Date.now();
        if (remaining <= 0) return location.replace('login.html');
        setTimeout(() => location.replace('login.html'), remaining);
    } catch {
        alert('Unable to verify your session. Please reload.');
    }
});
