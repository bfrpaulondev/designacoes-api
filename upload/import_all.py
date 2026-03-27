#!/usr/bin/env python3
import re
import json
import requests

# Read the text
with open('/home/z/my-project/upload/contatos.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

contacts = []
current_contact = None
i = 0

while i < len(lines):
    line = lines[i].strip()
    
    # Skip empty
    if not line:
        i += 1
        continue
    
    # Check for name pattern: "Surname, Firstname" (standalone line)
    if re.match(r'^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç]+)*\s*,\s*[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]', line):
        # Check it's not an address line
        if not any(x in line.lower() for x in ['rua', 'av.', 'praceta', 'travessa', 'estrada', '@', 'n°', 'nº', 'largo', 'beco', 'lote', 'lt ']):
            # Save previous contact
            if current_contact:
                contacts.append(current_contact)
            
            # Parse name
            parts = line.split(',')
            surname = parts[0].strip()
            firstname = parts[1].strip() if len(parts) > 1 else ''
            
            current_contact = {
                'nomePrimeiro': firstname,
                'nomeUltimo': surname,
                'nomeCompleto': f"{firstname} {surname}".strip(),
                'morada': '',
                'email': '',
                'telemovel': '',
                'grupoLimpeza': ''
            }
    
    elif current_contact:
        # Check for MORADA:
        if line == 'MORADA:':
            # Get next lines as address
            addr_parts = []
            j = i + 1
            while j < len(lines) and j < i + 5:
                next_line = lines[j].strip()
                if next_line and not any(x in next_line for x in ['TELEMÓVEL', 'EMAIL', 'TELEFONE', 'GRUPO', 'MORADA:', 'OUTRO']):
                    addr_parts.append(next_line)
                    j += 1
                else:
                    break
            current_contact['morada'] = ' '.join(addr_parts)
            i = j - 1
        
        # Check for EMAIL:
        elif line == 'EMAIL:':
            if i + 1 < len(lines):
                email_line = lines[i + 1].strip()
                if '@' in email_line:
                    current_contact['email'] = email_line.lower()
        
        # Check for TELEMÓVEL:
        elif line == 'TELEMÓVEL:':
            if i + 1 < len(lines):
                phone_line = lines[i + 1].strip()
                phones = re.findall(r'9\d{8}', phone_line.replace(' ', '').replace('-', ''))
                if phones:
                    current_contact['telemovel'] = phones[0]
        
        # Check for GRUPO:
        elif line == 'GRUPO:':
            if i + 1 < len(lines):
                grupo_line = lines[i + 1].strip()
                # Parse "G-X - Nome | Grupo Limpeza Y"
                grupo_match = re.search(r'Grupo Limpeza ([A-G])', grupo_line)
                if grupo_match:
                    current_contact['grupoLimpeza'] = grupo_match.group(1)
    
    i += 1

# Save last contact
if current_contact:
    contacts.append(current_contact)

# Deduplicate
seen = set()
unique_contacts = []
for c in contacts:
    key = c['nomeCompleto'].lower()
    if key not in seen and len(c['nomePrimeiro']) > 2 and len(c['nomeUltimo']) > 3:
        seen.add(key)
        unique_contacts.append(c)

# Stats
with_phone = len([c for c in unique_contacts if c['telemovel']])
with_email = len([c for c in unique_contacts if c['email']])
with_grupo = len([c for c in unique_contacts if c['grupoLimpeza']])

print(f"Total contacts: {len(unique_contacts)}")
print(f"With phone: {with_phone}")
print(f"With email: {with_email}")
print(f"With grupo limpeza: {with_grupo}")

# Create via API
API_URL = "https://designacoes-api.onrender.com/api/publicadores"
created = 0
failed = 0

for contact in unique_contacts:
    data = {
        "nomePrimeiro": contact['nomePrimeiro'],
        "nomeUltimo": contact['nomeUltimo'],
        "email": contact['email'],
        "telemovel": contact['telemovel'],
        "morada": contact['morada'],
        "status": "ativo",
        "tipoPublicador": "publicador_batizado",
        "privilegioServico": "nenhum",
        "grupoLimpeza": contact.get('grupoLimpeza', '')
    }
    
    try:
        response = requests.post(API_URL, json=data)
        if response.status_code == 201:
            created += 1
            print(f"[{created}] {contact['nomeCompleto']}")
        else:
            failed += 1
            print(f"FAILED [{response.status_code}]: {contact['nomeCompleto']}")
    except Exception as e:
        failed += 1
        print(f"ERROR: {contact['nomeCompleto']} - {e}")

print(f"\nTotal processed: {len(unique_contacts)}")
print(f"Created: {created}")
print(f"Failed: {failed}")
