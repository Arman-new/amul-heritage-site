function loadLanguage(lang) {
    fetch(`lang/${lang}.json`)
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const value = key.split('.').reduce((obj, k) => obj && obj[k], data);
                if (value) el.textContent = value;
            });
        });
}

function setLang(lang) {
    loadLanguage(lang);
}

loadLanguage('en');