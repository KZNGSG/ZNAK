# -*- coding: utf-8 -*-
"""
Парсер RTF файла ТН ВЭД ЕАЭС
Извлекает коды и названия товаров
"""

import re
import os
from typing import List, Dict, Tuple

# Коды обязательной маркировки
# Коды обязательной маркировки (временно очищено для обновления данных)
MANDATORY_MARKING_PREFIXES = []

# Экспериментальные группы
# Экспериментальные группы (временно очищено для обновления данных)
EXPERIMENTAL_PREFIXES = []


def decode_rtf_unicode(text: str) -> str:
    """Декодировать Unicode из RTF формата"""
    def replace_unicode(match):
        code = int(match.group(1))
        return chr(code)

    # Заменяем \uXXXX на символы (один backslash в исходном тексте)
    result = re.sub(r'\\u(\d+)\s?', replace_unicode, text)
    # Убираем \uc0 и другие RTF команды
    result = re.sub(r'\\uc\d+\s?', '', result)
    result = re.sub(r'\\[a-z]+\d*\s?', '', result)
    # Убираем лишние пробелы
    result = re.sub(r'\s+', ' ', result).strip()
    return result


def parse_rtf_tnved(filepath: str) -> List[Dict]:
    """Парсинг RTF файла ТН ВЭД"""
    print(f"Reading file: {filepath}")

    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    print(f"File size: {len(content)} bytes")

    # Ищем паттерн: код\cell название\cell
    # Код ТН ВЭД: 4-10 цифр с возможными пробелами
    pattern = r'\\cf0\s*(\d{4}(?:\s*\d{2})?(?:\s*\d{3})?(?:\s*\d)?)\s*\\cell\s*\n?\\pard[^}]*\\cf0\s*([^\\]*(?:\\u\d+\s*[^\\]*)*?)\\cell'

    results = []
    seen_codes = set()

    # Альтернативный более простой подход - построчный парсинг
    lines = content.split('\n')
    current_code = None

    for i, line in enumerate(lines):
        # Ищем код в строке
        code_match = re.search(r'\\cf0\s*(\d{4}(?:\s*\d{2})?(?:\s*\d{3})?(?:\s*\d)?)\s*\\cell', line)
        if code_match:
            code = code_match.group(1).replace(' ', '')
            # Проверяем что это валидный код (4-10 цифр)
            if len(code) >= 4 and len(code) <= 10:
                current_code = code

                # Ищем название в следующих строках
                for j in range(i+1, min(i+5, len(lines))):
                    name_line = lines[j]
                    if '\\cell' in name_line and ('\\u' in name_line or re.search(r'[а-яА-ЯёЁa-zA-Z]', decode_rtf_unicode(name_line))):
                        # Извлекаем текст до \cell
                        name_match = re.search(r'\\cf0\s*([^}]+?)\\cell', name_line)
                        if name_match:
                            raw_name = name_match.group(1)
                            name = decode_rtf_unicode(raw_name)

                            # Убираем служебные символы и очищаем
                            name = name.strip(' -')

                            if name and len(name) > 1 and current_code not in seen_codes:
                                seen_codes.add(current_code)
                                results.append({
                                    'code': current_code,
                                    'name': name
                                })
                        break

    print(f"Found {len(results)} TNVED codes")
    return results


def get_marking_status(code: str) -> str:
    """Определить статус маркировки"""
    code_clean = code.replace(' ', '')[:4]

    for prefix in MANDATORY_MARKING_PREFIXES:
        if code_clean.startswith(prefix[:4]):
            return "mandatory"

    for prefix in EXPERIMENTAL_PREFIXES:
        if code_clean.startswith(prefix[:4]):
            return "experimental"

    return "not_required"


def load_to_mongodb(data: List[Dict]):
    """Загрузка в MongoDB"""
    from pymongo import MongoClient
    from dotenv import load_dotenv

    load_dotenv()

    MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    DB_NAME = os.getenv('MONGODB_DB', 'promarkirui')

    print(f"Connecting to MongoDB: {MONGO_URI}")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # Удаляем старую коллекцию
    if 'tnved_full' in db.list_collection_names():
        print("Dropping existing tnved_full collection...")
        db.tnved_full.drop()

    collection = db.tnved_full

    # Подготовка документов
    documents = []
    for item in data:
        status = get_marking_status(item['code'])
        doc = {
            'code': item['code'],
            'code_formatted': format_code(item['code']),
            'name': item['name'],
            'marking_status': status,
            'requires_marking': status == 'mandatory',
            'is_experimental': status == 'experimental',
        }
        documents.append(doc)

    # Вставка
    print(f"Inserting {len(documents)} documents...")
    if documents:
        collection.insert_many(documents)

    # Индексы
    print("Creating indexes...")
    collection.create_index('code')
    collection.create_index([('name', 'text')])
    collection.create_index('marking_status')

    # Статистика
    stats = {
        'total': collection.count_documents({}),
        'mandatory': collection.count_documents({'marking_status': 'mandatory'}),
        'experimental': collection.count_documents({'marking_status': 'experimental'}),
        'not_required': collection.count_documents({'marking_status': 'not_required'})
    }

    print(f"\n=== Loaded to MongoDB ===")
    print(f"Total: {stats['total']}")
    print(f"Mandatory marking: {stats['mandatory']}")
    print(f"Experimental: {stats['experimental']}")
    print(f"Not required: {stats['not_required']}")

    client.close()
    return stats


def format_code(code: str) -> str:
    """Форматирование кода ТН ВЭД с пробелами"""
    code = code.replace(' ', '')
    if len(code) <= 4:
        return code
    elif len(code) <= 6:
        return f"{code[:4]} {code[4:]}"
    elif len(code) <= 9:
        return f"{code[:4]} {code[4:6]} {code[6:]}"
    else:
        return f"{code[:4]} {code[4:6]} {code[6:9]} {code[9:]}"


def save_to_json(data: List[Dict], filepath: str):
    """Сохранение в JSON файл"""
    import json

    documents = []
    for item in data:
        status = get_marking_status(item['code'])
        doc = {
            'code': item['code'],
            'code_formatted': format_code(item['code']),
            'name': item['name'],
            'marking_status': status,
            'requires_marking': status == 'mandatory',
            'is_experimental': status == 'experimental',
        }
        documents.append(doc)

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(documents, f, ensure_ascii=False, indent=2)

    # Статистика
    mandatory = len([d for d in documents if d['marking_status'] == 'mandatory'])
    experimental = len([d for d in documents if d['marking_status'] == 'experimental'])

    print(f"Saved to {filepath}")
    print(f"Total: {len(documents)}")
    print(f"Mandatory: {mandatory}")
    print(f"Experimental: {experimental}")

    return documents


if __name__ == '__main__':
    import sys

    rtf_path = sys.argv[1] if len(sys.argv) > 1 else 'backend/data/tnved.rtf'

    if not os.path.exists(rtf_path):
        rtf_path = os.path.join(os.path.dirname(__file__), 'data', 'tnved.rtf')

    if not os.path.exists(rtf_path):
        print(f"File not found: {rtf_path}")
        sys.exit(1)

    # Парсинг
    data = parse_rtf_tnved(rtf_path)

    if data:
        print("\nExamples:")
        for item in data[:10]:
            status = get_marking_status(item['code'])
            marker = "✅" if status == 'mandatory' else ("⚠️" if status == 'experimental' else "❌")
            print(f"  {marker} {format_code(item['code'])}: {item['name'][:60]}")

        # Сохраняем в JSON
        json_path = os.path.join(os.path.dirname(__file__), 'data', 'tnved.json')
        print(f"\nSaving to JSON...")
        save_to_json(data, json_path)

        # Пробуем MongoDB
        try:
            print("\nTrying MongoDB...")
            load_to_mongodb(data)
        except Exception as e:
            print(f"MongoDB not available: {e}")
            print("Data saved to JSON file. Run on server with MongoDB to load.")
    else:
        print("No data parsed!")
