// full-sync.js - Полная синхронизация с MyMemory API
const fs = require('fs');
const https = require('https');

const languages = ['ru', 'cn', 'tm'];

const langMap = {
    'ru': 'ru',
    'cn': 'zh-CN',
    'tm': 'tk'
};

// Функция для чтения JSON с удалением BOM
function readJSON(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const cleanContent = content.replace(/^\uFEFF/, '');
        return JSON.parse(cleanContent);
    } catch(e) {
        return null;
    }
}

// Функция для получения всех ключей из объекта
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

// Функция для удаления ключа из объекта
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

// Функция для очистки пустых объектов
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

// Функция перевода с помощью MyMemory API (Бесплатно, без ключа)
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
                    
                    // MyMemory возвращает текст с "@@@####" если нет перевода, убираем
                    const cleanTranslated = translated.replace(/@@@[^|]*\|/g, '');
                    resolve(cleanTranslated);
                } catch(e) {
                    console.log(`   ⚠️ Ошибка перевода, оставляем оригинал`);
                    resolve(text);
                }
            });
        }).on('error', () => {
            console.log(`   ⚠️ Ошибка сети, оставляем оригинал`);
            resolve(text);
        });
    });
}

// Функция для добавления и перевода новых ключей
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

// Главная функция
async function fullSync() {
    console.log('\n🔍 ПОЛНАЯ СИНХРОНИЗАЦИЯ С MyMemory');
    console.log('═'.repeat(50));
    
    // Читаем en.json
    const enData = readJSON('langjs/en.json');
    if (!enData) {
        console.log('❌ Ошибка: не могу прочитать langjs/en.json');
        console.log('   Проверьте, что файл существует и имеет правильный формат JSON');
        return;
    }
    
    const enKeys = getAllKeys(enData);
    console.log(`\n📄 en.json: ${enKeys.length} ключей\n`);
    
    for (const lang of languages) {
        console.log(`\n📝 Обработка ${lang.toUpperCase()}.json...`);
        console.log('─'.repeat(30));
        
        const filePath = `langjs/${lang}.json`;
        let langData = readJSON(filePath);
        
        if (!langData) {
            console.log(`   ⚠️ Файл не найден, создаю новый`);
            langData = {};
        }
        
        const langKeys = getAllKeys(langData);
        
        // 1. Удаляем лишние ключи
        const keysToDelete = langKeys.filter(key => !enKeys.includes(key));
        
        if (keysToDelete.length > 0) {
            console.log(`   🗑️ Удаляю ${keysToDelete.length} лишних ключей...`);
            for (const key of keysToDelete) {
                deleteKey(langData, key);
                console.log(`      - ${key}`);
            }
            cleanEmptyObjects(langData);
        } else {
            console.log(`   ✅ Нет лишних ключей`);
        }
        
        // 2. Добавляем новые ключи с переводом
        const merged = await mergeAndTranslate(enData, langData, lang);
        
        // 3. Сохраняем файл
        fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
        console.log(`   💾 Сохранено: langjs/${lang}.json`);
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log('🎉 ПОЛНАЯ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА!');
    console.log('   • Лишние ключи удалены');
    console.log('   • Новые ключи добавлены с переводом (MyMemory)');
}

// Запускаем
fullSync().catch(console.error);