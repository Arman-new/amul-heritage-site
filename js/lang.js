// Define supported language codes matching your exact JSON file names
const supportedLangs = ['en', 'cn', 'tm', 'ru'];

// Variable to keep track of fetch requests to prevent race conditions
let currentFetchController = null;

// Load language pack function
function loadLanguage(lang) {
    // Fallback to English if unsupported
    if (!supportedLangs.includes(lang)) {
        lang = 'en';
    }

    // Cancel the previous fetch request if the user clicks rapidly
    if (currentFetchController) {
        currentFetchController.abort();
    }
    currentFetchController = new AbortController();

    fetch(`lang/${lang}.json`, { signal: currentFetchController.signal })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 1. Update standard text content (safe from XSS)
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const value = key.split('.').reduce((obj, k) => obj && obj[k], data);
                if (value) el.textContent = value;
            });

            // 2. Update HTML attributes (placeholders, titles, alts)
            document.querySelectorAll('[data-i18n-attr]').forEach(el => {
                const attrMap = el.getAttribute('data-i18n-attr');
                // Example format: data-i18n-attr="placeholder:login.email, title:login.email_hint"
                attrMap.split(',').forEach(pair => {
                    const [attr, key] = pair.split(':').map(s => s.trim());
                    const value = key.split('.').reduce((obj, k) => obj && obj[k], data);
                    if (value) el.setAttribute(attr, value);
                });
            });

            // 3. Sync HTML root tag lang attribute for Accessibility/SEO
            document.documentElement.lang = lang;
        })
        .catch(error => {
            // Ignore errors caused by us aborting the request
            if (error.name === 'AbortError') return; 
            
            console.error("Could not load language file:", error);
            // Fallback logic on error
            if (lang !== 'en') loadLanguage('en'); 
        });
}

// Switch language and save user preference
function setLang(lang) {
    // Validate before saving to LocalStorage
    if (!supportedLangs.includes(lang)) {
        lang = 'en';
    }
    loadLanguage(lang);
    localStorage.setItem('preferred-lang', lang);
}

// Page load initialization logic
window.onload = () => {
    let userLang = 'en'; // Default language

    // 1. Highest priority: LocalStorage
    const savedLang = localStorage.getItem('preferred-lang');
    if (savedLang && supportedLangs.includes(savedLang)) {
        userLang = savedLang;
    } 
    // 2. Second priority: Browser language detection
    else {
        const browserLang = navigator.language || navigator.userLanguage;
        const primaryLang = browserLang.split('-')[0]; 
        
        // Map browser codes to your specific JSON file names
        if (primaryLang === 'zh') {
            userLang = 'cn'; // Maps 'zh-CN' or 'zh-TW' to cn.json
        } else if (primaryLang === 'tk') {
            userLang = 'tm'; // Maps 'tk-TM' to tm.json
        } else if (supportedLangs.includes(primaryLang)) {
            userLang = primaryLang; // Works directly for 'en' and 'ru'
        }
    }

    // Load the final determined language
    loadLanguage(userLang);

    // Sync dropdown selected state if it exists
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
        langSelector.value = userLang;
    }
};
