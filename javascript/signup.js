const form = document.getElementById("signupForm");

function goToLoadingPage(nextPage, message) {
    window.location.replace(
        `loading.html?next=${encodeURIComponent(nextPage)}&message=${encodeURIComponent(message)}`
    );
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstNameValue = document.getElementById("first_name").value;
    const lastNameValue = document.getElementById("last_name").value;
    const userNameValue = document.getElementById("username").value;
    const emailValue = document.getElementById("email").value;
    const passwordValue = document.getElementById("password").value;

    let response;
    try {
        response = await window.authRequest('/signup', {
            first_name: firstNameValue, last_name: lastNameValue,
            username: userNameValue, email: emailValue, password: passwordValue
        });
    } catch (error) {
        document.getElementById('message').textContent = error.message || 'Unable to sign up. Please try again.';
        return;
    }

    const data = await response.json();
    const messageBox = document.getElementById("message");

    messageBox.innerText = data.message;

    if(response.ok){
        messageBox.classList.remove("error");

        goToLoadingPage("index.html", "Creating your account");
    }
    else{
        messageBox.classList.add("error");
    }
});
