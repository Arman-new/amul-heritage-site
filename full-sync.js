// code provide adding and removing keys in langjs files with translation using MyMemory API (free, no key required)
const fs = require('fs');
const https = require('https');

const languages = ['ru', 'cn', 'tm'];

const langMap = {
    'ru': 'ru',
    'cn': 'zh-CN',
    'tm': 'tk'
};

// Function to read JSON file with BOM handling
function readJSON(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const cleanContent = content.replace(/^\uFEFF/, '');
        return JSON.parse(cleanContent);
    } catch(e) {
        return null;
    }
}

// Function to get all keys in a nested object with dot notation
function getAllKeys(obj, prefix = '') {
    let keys = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(fullKey);
        if (typeof value === 'object' && value !== null) {
            keys = keys.concat(getAllKeys(value, fullKey));
        }
    }
    return keys;
}

// Function to delete a key from an object
function deleteKey(obj, keyPath) {
    const parts = keyPath.split('.');
    const lastKey = parts.pop();
    let current = obj;
    
    for (const part of parts) {
        if (!current[part]) return false;
        current = current[part];
    }
    
    if (current[lastKey] !== undefined) {
        delete current[lastKey];
        return true;
    }
    return false;
}

// Function to clean empty objects
function cleanEmptyObjects(obj) {
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
            cleanEmptyObjects(value);
            if (Object.keys(value).length === 0) {
                delete obj[key];
            }
        }
    }
}

// Function to translate text using MyMemory API (Free, no key required)
async function translateText(text, targetLang) {
    return new Promise((resolve) => {
        const toLang = langMap[targetLang];
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${toLang}`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const translated = parsed.responseData.translatedText;
                    
                    // MyMemory returns text with "@@@####" if no translation is available, remove it
                    const cleanTranslated = translated.replace(/@@@[^|]*\|/g, '');
                    resolve(cleanTranslated);
                } catch(e) {
                    console.log(`   ⚠️ Ошибка перевода, оставляем оригинал`);
                    resolve(text);
                }
            });
        }).on('error', () => {
            console.log(`  Error fetching translation, leaving original text`);
            resolve(text);
        });
    });
}

// Function to merge enObj into targetObj, translating new keys
async function mergeAndTranslate(enObj, targetObj, targetLang, path = '') {
    const result = { ...targetObj };
    
    for (const [key, value] of Object.entries(enObj)) {
        if (typeof value === 'object' && value !== null) {
            if (!result[key]) result[key] = {};
            result[key] = await mergeAndTranslate(value, result[key] || {}, targetLang, path ? `${path}.${key}` : key);
        } else {
            if (!result[key] || result[key] === '') {
                console.log(`   🆕 Добавляем и переводим: ${path ? `${path}.${key}` : key}`);
                result[key] = await translateText(value, targetLang);
                await new Promise(resolve => setTimeout(resolve, 500)); // Пауза 500 мс
            }
        }
    }
    return result;
}

// Main function
async function fullSync() {
    console.log('\n🔍 FULL SYNC WITH MyMemory');
    console.log('═'.repeat(50));
    
    // Read en.json
    const enData = readJSON('langjs/en.json');
    if (!enData) {
        console.log('❌ Error: cannot read langjs/en.json');
        console.log('   Please check that the file exists and has the correct JSON format');
        return;
    }
    
    const enKeys = getAllKeys(enData);
    console.log(`\n📄 en.json: ${enKeys.length} keys\n`);
    
    for (const lang of languages) {
        console.log(`\n📝 Processing ${lang.toUpperCase()}.json...`);
        console.log('─'.repeat(30));
        
        const filePath = `langjs/${lang}.json`;
        let langData = readJSON(filePath);
        
        if (!langData) {
            console.log(`   ⚠️ File not found, creating new one`);
            langData = {};
        }
        
        const langKeys = getAllKeys(langData);
        
        // 1.Delete keys that are not in en.json
        const keysToDelete = langKeys.filter(key => !enKeys.includes(key));
        
        if (keysToDelete.length > 0) {
            console.log(`   🗑️ Deleting ${keysToDelete.length} unnecessary keys...`);
            for (const key of keysToDelete) {
                deleteKey(langData, key);
                console.log(`      - ${key}`);
            }
            cleanEmptyObjects(langData);
        } else {
            console.log(`   ✅ No unnecessary keys`);
        }
        
        // 2. Add new keys with translation
        const merged = await mergeAndTranslate(enData, langData, lang);
        
        // 3. Save the file
        fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
        console.log(`   💾 Saved: langjs/${lang}.json`);
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log('🎉 FULL SYNC COMPLETED!');
    console.log('   • Unnecessary keys removed');
    console.log('   • New keys added with translation (MyMemory)');
}

// Run the full sync
fullSync().catch(console.error);