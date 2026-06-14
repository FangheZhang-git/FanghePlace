const form = document.getElementById("signupForm");

function goToLoadingPage(nextPage, message) {
    window.location.href =
        `loading.html?next=${encodeURIComponent(nextPage)}&message=${encodeURIComponent(message)}`;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstNameValue = document.getElementById("first_name").value;
    const lastNameValue = document.getElementById("last_name").value;
    const userNameValue = document.getElementById("username").value;
    const emailValue = document.getElementById("email").value;
    const passwordValue = document.getElementById("password").value;

    const response = await fetch("http://localhost:3001/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            first_name: firstNameValue,
            last_name: lastNameValue,
            username: userNameValue,
            email: emailValue,
            password: passwordValue
        })
    });

    const data = await response.json();
    const messageBox = document.getElementById("message");

    messageBox.innerText = data.message;

    if(response.ok){
        messageBox.classList.remove("error");

        //save login token
        localStorage.setItem("token", data.token);

        const payload = JSON.parse(
            atob(data.token.split(".")[1])
        );

        localStorage.setItem("user_id", payload.id);
        localStorage.setItem("username", payload.username);

        goToLoadingPage("index.html", "Creating your account");
    }
    else{
        messageBox.classList.add("error");
    }
});
