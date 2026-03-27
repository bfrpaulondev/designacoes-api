#!/usr/bin/env python3
import re
import json

# Read the text
with open('/home/z/my-project/upload/contatos.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all newlines with spaces, then split by name patterns
content = content.replace('\n', ' ')

# Find all blocks starting with a name pattern (Surname, Firstname)
# Name pattern: Word(s), Word(s) followed by MORADA or TELEMÓVEL
pattern = r'([A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç\.]+)*\s*,\s*[A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç\.]+)*)'

# Find all potential names
matches = list(re.finditer(pattern, content))

contacts = []
for i, match in enumerate(matches):
    name_str = match.group(1).strip()
    
    # Skip if looks like address
    if any(x in name_str.lower() for x in ['rua', 'av.', 'praceta', 'travessa', 'estrada', 'setúbal']):
        continue
    
    # Get text after name until next name
    start = match.end()
    end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
    block = content[start:end]
    
    # Parse name
    parts = name_str.split(',')
    surname = parts[0].strip()
    firstname = parts[1].strip() if len(parts) > 1 else ''
    
    # Extract phone (9XXXXXXXX)
    phones = re.findall(r'9\d{8}', block.replace(' ', ''))
    telemovel = phones[0] if phones else ''
    
    # Extract email
    emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', block)
    email = emails[0].lower() if emails else ''
    
    # Extract address
    morada_match = re.search(r'MORADA:\s*([^.]+?)(?=TELEMÓVEL|EMAIL|TELEFONE|GRUPO|$)', block)
    morada = morada_match.group(1).strip() if morada_match else ''
    # Clean up morada
    morada = re.sub(r'\s+', ' ', morada).strip()
    
    # Extract group
    grupo_match = re.search(r'G-\d+\s*-\s*[^|]+\|?\s*Grupo Limpeza [A-G]', block)
    grupo = grupo_match.group(0).strip() if grupo_match else ''
    
    contact = {
        'nomePrimeiro': firstname,
        'nomeUltimo': surname,
        'nomeCompleto': f"{firstname} {surname}".strip(),
        'morada': morada[:200] if morada else '',
        'email': email,
        'telemovel': telemovel,
        'grupo': grupo
    }
    
    # Only add if we have a valid name
    if len(firstname) > 2 and len(surname) > 2:
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

print("\nSample contacts with details:")
count = 0
for c in unique_contacts:
    if c['telemovel'] or c['email']:
        print(f"\n  {c['nomeCompleto']}")
        print(f"    Tel: {c['telemovel']}")
        print(f"    Email: {c['email']}")
        print(f"    Addr: {c['morada'][:60]}..." if len(c['morada']) > 60 else f"    Addr: {c['morada']}")
        count += 1
        if count >= 15:
            break

# Save
with open('/home/z/my-project/upload/contacts.json', 'w', encoding='utf-8') as f:
    json.dump(unique_contacts, f, ensure_ascii=False, indent=2)

print(f"\n\nSaved {len(unique_contacts)} contacts to contacts.json")
