function googleTranslateElementInit() {
    new google.translate.TranslateElement(
        { pageLanguage: "en" },
        "google_translate_element"
    );
}

/* ---------- cookie helpers ---------- */

function setGoogleTranslateCookie(lang) {
    // en 表示恢复原文
    if (lang === "en") {
        document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "googtrans=; path=/; domain=" + location.hostname + "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        return;
    }

    const value = `/en/${lang}`;

    // 当前域
    document.cookie = `googtrans=${value}; path=/`;

    // 尝试加 domain，某些情况下更稳
    document.cookie = `googtrans=${value}; path=/; domain=${location.hostname}`;
}

function getSavedLanguage() {
    return localStorage.getItem("language") || "en";
}

/* ---------- 页面一加载就先写 cookie ---------- */
/* 这样 Google script 初始化时就能读到语言 */

(function applySavedLanguageBeforeGoogleLoads() {
    const lang = getSavedLanguage();
    setGoogleTranslateCookie(lang);
})();

/* ---------- Save 按钮 ---------- */

function saveLanguage() {
    const lang = document.getElementById("languageSelect").value;

    console.log("SAVE CLICKED:", lang);

    localStorage.setItem("language", lang);
    setGoogleTranslateCookie(lang);

    // 关 modal
    const modal = document.getElementById("languageModal");
    if (modal) {
        modal.classList.add("hidden");
    }

    // 直接刷新，让 Google 按 cookie 翻译
    location.reload();
}

/* ---------- modal close ---------- */

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("languageModal");
    const backdrop = document.querySelector(".modal-backdrop");
    const closeBtn = document.getElementById("closeLanguageModal");
    const select = document.getElementById("languageSelect");

    // 打开 modal 时，默认选中当前语言
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