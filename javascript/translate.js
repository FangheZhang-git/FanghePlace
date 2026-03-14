function googleTranslateElementInit() {
    new google.translate.TranslateElement(
        { pageLanguage: "en" },
        "google_translate_element"
    );
}

//Cookie for toggling language

function setGoogleTranslateCookie(lang) {
    // en for original text
    if (lang === "en") {
        document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "googtrans=; path=/; domain=" + location.hostname + "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        return;
    }

    const value = `/en/${lang}`;

    document.cookie = `googtrans=${value}; path=/`;

    document.cookie = `googtrans=${value}; path=/; domain=${location.hostname}`;
}

function getSavedLanguage() {
    return localStorage.getItem("language") || "en";
}

// Write cookie when page start loading
// Language at Initialization

(function applySavedLanguageBeforeGoogleLoads() {
    const lang = getSavedLanguage();
    setGoogleTranslateCookie(lang);
})();

//For save button

function saveLanguage() {
    const lang = document.getElementById("languageSelect").value;

    console.log("SAVE CLICKED:", lang);

    localStorage.setItem("language", lang);
    setGoogleTranslateCookie(lang);

    // turn off modal
    const modal = document.getElementById("languageModal");
    if (modal) {
        modal.classList.add("hidden");
    }

    // reload and let Google translate work
    location.reload();
}


document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("languageModal");
    const backdrop = document.querySelector(".modal-backdrop");
    const closeBtn = document.getElementById("closeLanguageModal");
    const select = document.getElementById("languageSelect");

    // when modal is open, select current language
    if (select) {
        select.value = getSavedLanguage();
    }

    if (backdrop && modal) {
        backdrop.addEventListener("click", () => {
            modal.classList.add("hidden");
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => {
            modal.classList.add("hidden");
        });
    }
});