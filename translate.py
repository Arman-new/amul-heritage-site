import json
import os
from googletrans import Translator

# Создаём переводчика
translator = Translator()

# Путь к папке с JSON файлами
lang_folder = 'langjs'

def translate_text(text, target_lang):
    """Переводит один текст с английского на целевой язык"""
    if not text or not isinstance(text, str):
        return text
    try:
        result = translator.translate(text, src='en', dest=target_lang)
        return result.text
    except Exception as e:
        print(f"Ошибка перевода: {e}")
        return text

def translate_nested(obj, target_lang):
    """Рекурсивно переводит все строки в JSON объекте"""
    if isinstance(obj, dict):
        return {k: translate_nested(v, target_lang) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [translate_nested(item, target_lang) for item in obj]
    elif isinstance(obj, str):
        return translate_text(obj, target_lang)
    else:
        return obj

def main():
    print("=" * 50)
    print("🔄 Автоматический перевод JSON файлов")
    print("=" * 50)
    
    # Загружаем английский файл
    en_path = os.path.join(lang_folder, 'en.json')
    if not os.path.exists(en_path):
        print(f"❌ Файл {en_path} не найден!")
        print("Убедитесь, что папка 'langjs' существует и в ней есть en.json")
        return
    
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    
    print(f"✅ Загружен en.json")
    
    # Список языков для перевода
    languages = [
        ('ru', 'ru.json', '🇷🇺 Русский'),
        ('cn', 'cn.json', '🇨🇳 中文'),
        ('tm', 'tm.json', '🇹🇲 Türkmençe')
    ]
    
    for lang_code, filename, lang_name in languages:
        print(f"\n🔄 Перевод на {lang_name}...")
        
        # Переводим
        translated_data = translate_nested(en_data, lang_code)
        
        # Сохраняем
        output_path = os.path.join(lang_folder, filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(translated_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Сохранено: {filename}")
    
    print("\n" + "=" * 50)
    print("🎉 ГОТОВО! Все JSON файлы переведены.")
    print("=" * 50)

if __name__ == "__main__":
    main()