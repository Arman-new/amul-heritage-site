// update-translations.js
const fs = require('fs');
const https = require('https');

const languages = ['ru', 'cn', 'tm'];

const langMap = {
    'ru': 'ru',
    'cn': 'zh-CN',
    'tm': 'tk'
};

// ПУТЬ К ВАШЕЙ ПАПКЕ langjs (НЕ меняйте!)
const enData = JSON.parse(fs.readFileSync('langjs/en.json', 'utf8'));

async function translateText(text, targetLang) {
    console.log(`   ⏳ Перевод: "${text.substring(0, 30)}..." -> ${targetLang}`);
    
    return new Promise((resolve) => {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const translated = parsed[0][0][0];
                    console.log(`   ✅ Переведено: "${translated.substring(0, 30)}..."`);
                    resolve(translated);
                } catch(e) {
                    console.log(`   ❌ Ошибка парсинга, оставляем оригинал`);
                    resolve(text);
                }
            });
        });
        
        req.on('error', (e) => {
            console.log(`   ❌ Ошибка сети: ${e.message}`);
            resolve(text); // Возвращаем оригинал (английский)
        });
        
        req.setTimeout(10000, () => {
            console.log(`   ⏰ Таймаут, оставляем оригинал`);
            req.destroy();
            resolve(text);
        });
    });
}
async function mergeAndTranslate(enObj, targetObj, targetLang, path = '') {
    const result = { ...targetObj };
    
    for (const [key, value] of Object.entries(enObj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
            if (!result[key]) result[key] = {};
            result[key] = await mergeAndTranslate(value, result[key] || {}, targetLang, currentPath);
        } else {
            if (!result[key] || result[key] === '') {
                console.log(`🆕 Добавляем: ${currentPath} -> ${targetLang}`);
                result[key] = await translateText(value, targetLang);
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    }
    return result;
}

async function updateAll() {
    console.log('🔍 Поиск новых ключей в en.json...\n');
    
    for (const lang of languages) {
        console.log(`\n📝 Обновление ${lang.toUpperCase()}...`);
        
        let targetData = {};
        try {
            targetData = JSON.parse(fs.readFileSync(`langjs/${lang}.json`, 'utf8'));
            console.log(`✓ Загружен langjs/${lang}.json`);
        } catch(e) {
            console.log(`⚠️ Создаю новый файл langjs/${lang}.json`);
        }
        
        const merged = await mergeAndTranslate(enData, targetData, langMap[lang]);
        fs.writeFileSync(`langjs/${lang}.json`, JSON.stringify(merged, null, 2));
        console.log(`✅ Сохранено: langjs/${lang}.json`);
    }
    
    console.log('\n🎉 Готово! Новые ключи добавлены во все файлы.');
    console.log('📌 Старые переводы не затронуты.');
}

updateAll().catch(console.error);