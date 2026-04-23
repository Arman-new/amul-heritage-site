// delete-key.js
const fs = require('fs');

const keyToDelete = 'NewText'; // Например: 'oldText'

const languages = ['en', 'ru', 'cn', 'tm'];

for (const lang of languages) {
    const filePath = `langjs/${lang}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    deleteKey(data, keyToDelete);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Удалено из ${lang}.json`);
}

function deleteKey(obj, keyPath) {
    const parts = keyPath.split('.');
    const lastKey = parts.pop();
    let current = obj;
    
    for (const part of parts) {
        if (!current[part]) return;
        current = current[part];
    }
    
    delete current[lastKey];
}