
const form = document.getElementById("loginForm");

function goToLoadingPage(nextPage, message) {
    window.location.replace(
        `loading.html?next=${encodeURIComponent(nextPage)}&message=${encodeURIComponent(message)}`
    );
}

function getReturnPage(fallbackPage) {
    const params = new URLSearchParams(window.location.search);
    const requestedNext = params.get("next");
    const referrer = document.referrer;
    const blockedPages = new Set(["loading.html", "login.html", "signup.html"]);

    const candidates = [requestedNext, referrer, fallbackPage];

    for (const candidate of candidates) {
        if (!candidate) continue;

        try {
            const url = new URL(candidate, window.location.href);
            const fileName = url.pathname.split("/").pop() || "index.html";

            if (url.origin === window.location.origin && !blockedPages.has(fileName)) {
                return `${url.pathname}${url.search}${url.hash}`;
            }
        } catch {
            if (!blockedPages.has(candidate)) {
                return candidate;
            }
        }
    }

    return fallbackPage;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    let response;
    try {
        response = await window.authRequest('/login', { email, password });
    } catch (error) {
        document.getElementById('message').textContent = error.message || 'Unable to log in. Please try again.';
        return;
    }

    const data = await response.json();

    const messageElement = document.getElementById("message");
    if (response.ok) {
        const payload = data.user;

        messageElement.innerText = "Login successful!";
        messageElement.style.color = "green";

        const nextPage = payload.is_admin ? "admin.html" : getReturnPage("index.html");
        goToLoadingPage(nextPage, "Logging you in");

    } else {
        messageElement.innerText = data.message;
        messageElement.style.color = "red";
    }
});
