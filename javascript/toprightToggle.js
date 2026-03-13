const accountToggle = document.getElementById("account-wrapper");
const accountDropdown = document.getElementById("accountDropdown");

const languageModal = document.getElementById("languageModal");

const openLanguageModal = document.getElementById("openLanguageModal");
const closeLanguageModal = document.getElementById("closeLanguageModal");
const cancelLanguageModal = document.getElementById("cancelLanguageModal");

const saveLanguageSettings = document.getElementById("saveLanguageSettings");

const logoutBtn = document.getElementById("logout");


// Toggle account dropdown
accountToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    accountDropdown.classList.toggle("hidden");
});

// Close dropdown if clicking outside
document.addEventListener("click", function (e) {
    if (!accountToggle.contains(e.target) && !accountDropdown.contains(e.target)) {
        accountDropdown.classList.add("hidden");
    }
});


// Open language modal
openLanguageModal.addEventListener("click", function () {
    languageModal.classList.remove("hidden");
    accountDropdown.classList.add("hidden");
});

// Close modal
closeLanguageModal.addEventListener("click", () => {
    languageModal.classList.add("hidden");
});



// Logout
logoutBtn.addEventListener("click", function () {

    localStorage.removeItem("token");

    window.location.href = "index.html";

});