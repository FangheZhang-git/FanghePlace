const form = document.getElementById("signupForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailValue = document.getElementById("email").value;
    const passwordValue = document.getElementById("password").value;

    const response = await fetch("http://localhost:3001/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: emailValue,
            password: passwordValue
        })
    });

    const data = await response.json();
    
    document.getElementById("message").innerText = data.message;

});
