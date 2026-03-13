function checkTokenExpiration() {

    const token = localStorage.getItem("token");

    if (!token){
        window.location.href = "index.html";
        return;
    } 

    const payload = JSON.parse(atob(token.split(".")[1]));

    const now = Date.now() / 1000;

    if (payload.exp < now) {

        localStorage.removeItem("token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("username");

        window.location.href = "index.html";

    }

}

function startTokenTimer() {

    const token = localStorage.getItem("token");

    if (!token) return;

    const payload = JSON.parse(atob(token.split(".")[1]));

    const expiresIn = payload.exp * 1000 - Date.now();

    if (expiresIn <= 0) {

        localStorage.clear();
        window.location.href = "index.html";
        return;

    }

    setTimeout(() => {

        localStorage.clear();
        window.location.href = "index.html";

    }, expiresIn);

}

document.addEventListener("DOMContentLoaded", () => {
    checkTokenExpiration();
    startTokenTimer();
});