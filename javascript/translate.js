(function () {
    const supportedLanguages = ['en', 'zh-CN', 'es', 'fr'];

    function savedLanguage() {
        const language = localStorage.getItem('language');
        return supportedLanguages.includes(language) ? language : 'en';
    }

    function clearOldGoogleCookie() {
        document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = `googtrans=; path=/; domain=${location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }

    clearOldGoogleCookie();
    window.gtranslateSettings = {
        default_language: 'en',
        languages: supportedLanguages,
        wrapper_selector: '#google_translate_element',
        url_structure: 'none',
        detect_browser_language: false
    };

    function loadTranslator() {
        if (document.getElementById('gtranslateScript')) return;
        const script = document.createElement('script');
        script.id = 'gtranslateScript';
        script.src = 'https://cdn.gtranslate.net/widgets/latest/dropdown.js';
        document.body.appendChild(script);
    }

    function saveLanguage() {
        const select = document.getElementById('languageSelect');
        const language = select?.value;
        if (!supportedLanguages.includes(language)) return;

        localStorage.setItem('language', language);
        const modal = document.getElementById('languageModal');
        if (modal) modal.classList.add('hidden');

        if (typeof window.doGTranslate === 'function') {
            window.doGTranslate(`en|${language}`);
        } else {
            location.reload();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadTranslator();
        const select = document.getElementById('languageSelect');
        if (select) select.value = savedLanguage();

        const modal = document.getElementById('languageModal');
        const backdrop = document.querySelector('.modal-backdrop');
        const closeButton = document.getElementById('closeLanguageModal');
        if (backdrop && modal) backdrop.addEventListener('click', () => modal.classList.add('hidden'));
        if (closeButton && modal) closeButton.addEventListener('click', () => modal.classList.add('hidden'));
    });

    window.saveLanguage = saveLanguage;
}());
