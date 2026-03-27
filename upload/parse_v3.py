#!/usr/bin/env python3
import re
import json

# Read the extracted text
with open('/home/z/my-project/upload/contatos.txt', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

contacts = []
i = 0

while i < len(lines):
    line = lines[i].strip()
    
    # Skip empty and header lines
    if not line or 'Setúbal Bonfim' in line or 'Lista de contactos' in line or '27/03/2026' in line or 'EMERGÊNCIA' in line:
        i += 1
        continue
    
    # Look for name pattern: "Surname, Firstname" or standalone name
    # Names typically don't contain: Rua, Av., @, Setúbal, n°, numbers
    is_name_line = False
    if ',' in line and not any(x in line.lower() for x in ['rua', 'av.', 'praceta', 'travessa', 'estrada', '@', 'setúbal', 'n°', 'nº', 'largo', 'beco']):
        parts = line.split(',')
        if len(parts) >= 2:
            surname = parts[0].strip()
            firstname = parts[1].strip()
            # Check if both parts look like names (not addresses)
            if len(surname) > 1 and len(firstname) > 1:
                # Check they don't contain numbers (except for house numbers after comma)
                if not re.search(r'\d{3}', surname) and not re.search(r'\d{3}', firstname):
                    is_name_line = True
    
    if is_name_line:
        # Start new contact
        parts = line.split(',')
        surname = parts[0].strip()
        firstname = parts[1].strip()
        
        contact = {
            'nomePrimeiro': firstname,
            'nomeUltimo': surname,
            'nomeCompleto': f"{firstname} {surname}".strip(),
            'morada': '',
            'email': '',
            'telemovel': '',
            'grupo': ''
        }
        
        # Look ahead for details
        j = i + 1
        found_details = 0
        while j < len(lines) and found_details < 8:
            next_line = lines[j].strip()
            
            if 'MORADA:' in next_line:
                # Get address lines
                addr_parts = []
                k = j + 1
                while k < len(lines) and k < j + 4:
                    addr_line = lines[k].strip()
                    if addr_line and not any(x in addr_line for x in ['TELEMÓVEL', 'EMAIL', 'TELEFONE', 'GRUPO', 'MORADA:', 'OUTRO']):
                        addr_parts.append(addr_line)
                        k += 1
                    else:
                        break
                contact['morada'] = ' '.join(addr_parts)
                found_details += 1
                
            elif 'EMAIL:' in next_line:
                # Get email
                if j + 1 < len(lines):
                    email_line = lines[j + 1].strip()
                    if '@' in email_line:
                        contact['email'] = email_line.lower()
                found_details += 1
                
            elif 'TELEMÓVEL:' in next_line:
                # Get phone
                if j + 1 < len(lines):
                    phone_line = lines[j + 1].strip()
                    # Extract Portuguese mobile (9XXXXXXXX)
                    phones = re.findall(r'9\d{8}', phone_line.replace(' ', '').replace('-', ''))
                    if phones:
                        contact['telemovel'] = phones[0]
                found_details += 1
                
            elif 'GRUPO:' in next_line:
                # Get group
                if j + 1 < len(lines):
                    grupo_line = lines[j + 1].strip()
                    if 'G-' in grupo_line:
                        contact['grupo'] = grupo_line
                found_details += 1
                
            elif ',' in next_line and not any(x in next_line.lower() for x in ['rua', 'av.', '@']):
                # Found next contact name, stop looking
                break
                
            j += 1
        
        contacts.append(contact)
        i = j
        
    i += 1

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
with_morada = len([c for c in unique_contacts if c['morada']])

print(f"Total contacts: {len(unique_contacts)}")
print(f"With phone: {with_phone}")
print(f"With email: {with_email}")
print(f"With address: {with_morada}")
print("\nSample contacts:")
for c in unique_contacts[:10]:
    print(f"  {c['nomeCompleto']}")
    print(f"    Tel: {c['telemovel']}")
    print(f"    Email: {c['email']}")
    print(f"    Addr: {c['morada'][:50]}..." if len(c['morada']) > 50 else f"    Addr: {c['morada']}")

# Save
with open('/home/z/my-project/upload/contacts.json', 'w', encoding='utf-8') as f:
    json.dump(unique_contacts, f, ensure_ascii=False, indent=2)

print(f"\nSaved to contacts.json")
