const form = document.getElementById("signupForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstNameValue = document.getElementById("first_name").value;
    const lastNameValue = document.getElementById("last_name").value;
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

        setTimeout(()=>{
            window.location.href = "index.html";
        }, 1000);
    }
    else{
        messageBox.classList.add("error");
    }
    
    document.getElementById("message").innerText = data.message;

    setTimeout(() =>{
        window.location.href = "index.html";
    }, 1000);
});