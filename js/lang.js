// js/lang.js
const supportedLangs = ['en', 'cn', 'tm', 'ru'];

function loadLanguage(lang) {
    if (!supportedLangs.includes(lang)) lang = 'en';

    // Fetch from same folder as HTML (no 'lang/' prefix)
    fetch(`${lang}.json`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            // Update text content for data-i18n elements
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const value = key.split('.').reduce((obj, k) => obj && obj[k], data);
                if (value && typeof value === 'string') el.textContent = value;
            });
            
            // Update placeholder attributes
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                const value = key.split('.').reduce((obj, k) => obj && obj[k], data);
                if (value && typeof value === 'string') el.placeholder = value;
            });
            
            document.documentElement.lang = lang === 'cn' ? 'zh' : lang;
            localStorage.setItem('preferred-lang', lang);
        })
        .catch(error => {
            console.error("Could not load language file:", error);
        });
}

function setLang(lang) {
    if (!supportedLangs.includes(lang)) lang = 'en';
    loadLanguage(lang);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    let userLang = 'en';
    const savedLang = localStorage.getItem('preferred-lang');
    if (savedLang && supportedLangs.includes(savedLang)) {
        userLang = savedLang;
    } else {
        const browserLang = navigator.language || navigator.userLanguage;
        const primaryLang = browserLang.split('-')[0];
        if (primaryLang === 'zh') userLang = 'cn';
        else if (primaryLang === 'tk' || primaryLang === 'tm') userLang = 'tm';
        else if (primaryLang === 'ru') userLang = 'ru';
        else if (primaryLang === 'en') userLang = 'en';
    }
    loadLanguage(userLang);
});