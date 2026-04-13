function loadLanguage(lang){
    fetch('./lang/${lang}.json')
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('[data-i18n]').forEach(el =>{
                const key = el.getAttribute('data-i18n');
                if(data[key]){
                    el.textContent = data[key];
                }
            });
        })
        .catch(error => console.error('Error Loading Language:', error));

}
loadLanguage('en');