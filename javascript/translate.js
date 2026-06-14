function googleTranslateElementInit() {
    new google.translate.TranslateElement(
        { pageLanguage: "en" },
        "google_translate_element"
    );
}

window.googleTranslateElementInit = googleTranslateElementInit;

function hideGoogleTranslateChrome() {
    if (document.getElementById("googleTranslateChromeStyles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "googleTranslateChromeStyles";
    style.textContent = `
        .goog-te-banner-frame,
        .goog-te-banner-frame.skiptranslate,
        .goog-te-balloon-frame,
        iframe.goog-te-banner-frame,
        body > .skiptranslate,
        #goog-gt-tt,
        .goog-tooltip,
        .goog-tooltip:hover {
            display: none !important;
            visibility: hidden !important;
        }

        html,
        body {
            top: 0 !important;
            margin-top: 0 !important;
        }

        .goog-text-highlight {
            background: transparent !important;
            box-shadow: none !important;
        }
    `;
    document.head.appendChild(style);
}

function removeGoogleTranslateOffset() {
    document.documentElement.style.top = "0";
    document.body.style.top = "0";
}

function loadGoogleTranslateScript() {
    if (document.getElementById("googleTranslateScript")) {
        return;
    }

    const script = document.createElement("script");
    script.id = "googleTranslateScript";
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);
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
    hideGoogleTranslateChrome();

    if (lang !== "en") {
        document.addEventListener("DOMContentLoaded", loadGoogleTranslateScript);
    }
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
    hideGoogleTranslateChrome();
    removeGoogleTranslateOffset();

    const observer = new MutationObserver(removeGoogleTranslateOffset);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["style", "class"]
    });
    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["style", "class"]
    });

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
