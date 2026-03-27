#!/usr/bin/env python3
import re
import json

# Read the extracted text
with open('/home/z/my-project/upload/contatos.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for name lines (Surname, Firstname format or just name)
name_pattern = re.compile(r'^([A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç]+)\s*,\s*(.+)$|^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+)*$')

# Split content into blocks based on pattern
lines = content.split('\n')

contacts = []
current_contact = None
i = 0

while i < len(lines):
    line = lines[i].strip()
    
    # Skip empty lines
    if not line:
        i += 1
        continue
    
    # Skip headers and metadata
    if any(x in line for x in ['Setúbal Bonfim', 'Lista de contactos', 'CONTACTOS DE', 'EMERGÊNCIA', '27/03/2026', '17:08:31']):
        i += 1
        continue
    
    # Check for name pattern (Last, First or just name - but not address lines)
    is_name = False
    if ',' in line and not any(x in line for x in ['Rua', 'Av.', 'Praceta', 'Travessa', 'Estrada', '@', 'Setúbal', 'n°', 'Nº', 'N°']):
        # This is likely a name in format "Surname, Firstname"
        parts = line.split(',')
        if len(parts) == 2:
            surname = parts[0].strip()
            firstname = parts[1].strip()
            if surname and firstname and len(surname) > 1 and len(firstname) > 1:
                is_name = True
                # Save previous contact
                if current_contact and current_contact.get('nomePrimeiro'):
                    contacts.append(current_contact)
                current_contact = {
                    'nomePrimeiro': firstname,
                    'nomeUltimo': surname,
                    'nomeCompleto': f"{firstname} {surname}".strip(),
                    'morada': '',
                    'email': '',
                    'telemovel': '',
                    'grupo': ''
                }
    
    # Check for known fields
    if current_contact:
        if line == 'MORADA:':
            # Get next lines as address
            addr_parts = []
            j = i + 1
            while j < len(lines) and j < i + 4:
                next_line = lines[j].strip()
                if next_line and not any(x in next_line for x in ['TELEMÓVEL', 'EMAIL', 'TELEFONE', 'GRUPO', 'MORADA:', 'OUTRO']):
                    # Check if it's address-like
                    if any(x in next_line for x in ['Rua', 'Av.', 'Av ', 'Praceta', 'Travessa', 'Estrada', 'Largo', 'Beco', 'Avenida', 'Lote', 'Lt ']):
                        addr_parts.append(next_line)
                    elif addr_parts:  # Continuation
                        addr_parts.append(next_line)
                    j += 1
                else:
                    break
            current_contact['morada'] = ' '.join(addr_parts)
            i = j - 1
            
        elif line == 'EMAIL:':
            # Get next line as email
            if i + 1 < len(lines):
                email_line = lines[i + 1].strip()
                if '@' in email_line:
                    current_contact['email'] = email_line
                    
        elif line == 'TELEMÓVEL:':
            # Get next line as phone
            if i + 1 < len(lines):
                phone_line = lines[i + 1].strip()
                # Extract phone number
                phones = re.findall(r'9\d{8}', phone_line.replace(' ', '').replace('-', ''))
                if phones:
                    current_contact['telemovel'] = phones[0]
                    
        elif 'GRUPO:' in line:
            # Get next line as group
            if i + 1 < len(lines):
                grupo_line = lines[i + 1].strip()
                if 'G-' in grupo_line:
                    # Extract group number and limpeza
                    current_contact['grupo'] = grupo_line
    
    i += 1

# Add last contact
if current_contact and current_contact.get('nomePrimeiro'):
    contacts.append(current_contact)

# Clean up and deduplicate
seen = set()
unique_contacts = []
for c in contacts:
    key = c['nomeCompleto'].lower()
    if key not in seen and len(c['nomePrimeiro']) > 2:
        seen.add(key)
        unique_contacts.append(c)

print(f"Total contacts extracted: {len(unique_contacts)}")
print("\nFirst 15 contacts:")
for c in unique_contacts[:15]:
    print(f"  - {c['nomeCompleto']} | Tel: {c['telemovel']} | Email: {c['email']}")

# Save to JSON
with open('/home/z/my-project/upload/contacts.json', 'w', encoding='utf-8') as f:
    json.dump(unique_contacts, f, ensure_ascii=False, indent=2)

print(f"\nSaved {len(unique_contacts)} contacts to contacts.json")
