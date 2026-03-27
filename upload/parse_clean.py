#!/usr/bin/env python3
import re
import json

# Read the text
with open('/home/z/my-project/upload/contatos.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all newlines with spaces
content = content.replace('\n', ' ')

# Find all blocks starting with a name pattern (Surname, Firstname)
pattern = r'([A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç\.]+)*\s*,\s*[A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç\.]+)*)'

# Find all potential names
matches = list(re.finditer(pattern, content))

contacts = []
for i in range(0, len(matches)):
    match = matches[i]
    name_str = match.group(1).strip()
    
    # Skip if looks like address or contains field names
    skip_words = ['rua', 'av.', 'praceta', 'travessa', 'estrada', '@', 'setúbal', 'n°', 'nº', 'largo', 'beco', 'morada', 'telemóvel', 'email', 'grupo']
    if any(x in name_str.lower() for x in skip_words):
        continue
    
    # Get text after name until next name
    start = match.end()
    end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
    block = content[start:end]
    
    # Parse name - clean up any field names
    parts = name_str.split(',')
    surname = parts[0].strip()
    firstname = parts[1].strip() if len(parts) > 1 else ''
    
    # Remove any field names from name parts
    for field_name in ['MORADA', 'TELEMÓVEL', 'EMAIL', 'GRUPO']:
        surname = surname.replace(field_name, '').strip()
        firstname = firstname.replace(field_name, '').strip()
    
    # Extract phone (9XXXXXXXX)
    phones = re.findall(r'9\d{8}', block.replace(' ', ''))
    telemovel = phones[0] if phones else ''
    
    # Extract email
    emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', block)
    email = emails[0].lower() if emails else ''
    
    # Extract address
    morada_match = re.search(r'MORADA:\s*([^.]+?)(?=TELEMÓVEL|EMAIL|TELEFONE|GRUPO|$)', block)
    morada = morada_match.group(1).strip() if morada_match else ''
    morada = re.sub(r'\s+', ' ', morada).strip()
    
    # Extract group
    grupo_match = re.search(r'G-\d+\s*-\s*[^|]+\|?\s*Grupo Limpeza [A-G]', block)
    grupo = grupo_match.group(0).strip() if grupo_match else ''
    
    # Clean up names
    nome_completo = f"{firstname} {surname}".strip()
    
    contact = {
        'nomePrimeiro': firstname,
        'nomeUltimo': surname,
        'nomeCompleto': nome_completo,
        'morada': morada[:200] if morada else '',
        'email': email,
        'telemovel': telemovel,
        'grupo': grupo
    }
    
    # Only add if we have a valid name
    if len(firstname) > 2 and len(surname) > 6:
        contacts.append(contact)

# Deduplicate
seen = set()
unique_contacts = []
for c in contacts:
    key = c['nomeCompleto'].lower()
    if key not in seen:
        seen.add(key)
        unique_contacts.append(c)

# Stats
with_phone = len([c for c in unique_contacts if c['telemovel']])
with_email = len([c for c in unique_contacts if c['email']])

print(f"Total contacts: {len(unique_contacts)}")
print(f"With phone: {with_phone}")
print(f"With email: {with_email}")

# Save
with open('/home/z/my-project/upload/contacts_clean.json', 'w', encoding='utf-8') as f:
    json.dump(unique_contacts, f, ensure_ascii=False, indent=2)

print(f"Saved to contacts_clean.json")

# Show sample
for c in unique_contacts[:5]:
    print(f"\n{c['nomeCompleto']}")
    print(f"  Tel: {c['telemovel']}")
    print(f"  Email: {c['email']}")
