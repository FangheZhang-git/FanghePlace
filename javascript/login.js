
const form = document.getElementById("loginForm");

function goToLoadingPage(nextPage, message) {
    window.location.href =
        `loading.html?next=${encodeURIComponent(nextPage)}&message=${encodeURIComponent(message)}`;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    const messageElement = document.getElementById("message");
    if (response.ok) {
        localStorage.setItem("token", data.token);

        // Decode JWT payload
        const payload = JSON.parse(
            atob(data.token.split(".")[1])
        );

        localStorage.setItem("user_id", payload.id);
        localStorage.setItem("username", payload.username);

        messageElement.innerText = "Login successful!";
        messageElement.style.color = "green";

        const nextPage = payload.is_admin ? "admin.html" : "index.html";
        goToLoadingPage(nextPage, "Logging you in");

    } else {
        messageElement.innerText = data.message;
        messageElement.style.color = "red";
    }
});
