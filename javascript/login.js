
const form = document.getElementById("loginForm");

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
        messageElement.innerText = "Login successful!";
        messageElement.style.color = "green";

        setTimeout(() => {
            window.location.href = "profile.html";
        }, 1000); // wait 1 second before redirect
    } else {
        messageElement.innerText = data.message;
        messageElement.style.color = "red";
    }
});
