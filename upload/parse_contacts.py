#!/usr/bin/env python3
import re
import json
import requests

# Read the extracted text
with open('/home/z/my-project/upload/contatos.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Parse contacts
contacts = []
lines = content.split('\n')

i = 0
while i < len(lines):
    line = lines[i].strip()
    
    # Skip empty lines and headers
    if not line or 'MORADA:' in line or 'EMAIL:' in line or 'TELEMÓVEL:' in line or 'TELEFONE' in line or 'GRUPO:' in line or 'CONTACTOS DE' in line or 'Setúbal Bonfim' in line or 'Lista de contactos' in line:
        i += 1
        continue
    
    # Check if line looks like a name (contains comma or is capitalized name)
    if ',' in line or (re.match(r'^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+', line) and len(line) > 3 and 'Rua' not in line and 'Av.' not in line and 'Praceta' not in line):
        # This might be a name
        name_line = line
        
        # Skip if it looks like an address or other data
        if any(x in name_line for x in ['Rua', 'Av.', 'Praceta', 'Travessa', 'Estrada', '@', 'Setúbal', 'GRUPO', 'CONTACTOS']):
            i += 1
            continue
        
        # Check next lines for address, email, phone
        morada = ''
        email = ''
        telemovel = ''
        telefone_casa = ''
        grupo = ''
        
        j = i + 1
        while j < len(lines) and j < i + 15:  # Look ahead up to 15 lines
            next_line = lines[j].strip()
            
            if 'MORADA:' in next_line:
                # Get address from following lines
                k = j + 1
                addr_parts = []
                while k < len(lines) and k < j + 3:
                    addr_line = lines[k].strip()
                    if addr_line and 'TELEMÓVEL' not in addr_line and 'EMAIL' not in addr_line and 'TELEFONE' not in addr_line and 'GRUPO' not in addr_line:
                        if 'Rua' in addr_line or 'Av.' in addr_line or 'Praceta' in addr_line or 'Travessa' in addr_line or 'Estrada' in addr_line or 'Largo' in addr_line or 'Beco' in addr_line or 'Avenida' in addr_line:
                            addr_parts.append(addr_line)
                        elif addr_parts:  # Continuation of address
                            addr_parts.append(addr_line)
                    else:
                        break
                    k += 1
                morada = ' '.join(addr_parts)
            
            if 'EMAIL:' in next_line:
                # Get email from following line
                if j + 1 < len(lines):
                    email = lines[j + 1].strip()
                    if '@' not in email:
                        email = ''
            
            if 'TELEMÓVEL:' in next_line:
                # Get phone from following line
                if j + 1 < len(lines):
                    phone_line = lines[j + 1].strip()
                    # Extract phone number (9 digits starting with 9)
                    phones = re.findall(r'9\d{8}', phone_line.replace(' ', ''))
                    if phones:
                        telemovel = phones[0]
            
            if 'TELEFONE DE CASA:' in next_line:
                # Get home phone from following line
                if j + 1 < len(lines):
                    phone_line = lines[j + 1].strip()
                    phones = re.findall(r'2\d{8}', phone_line.replace(' ', ''))
                    if phones:
                        telefone_casa = phones[0]
            
            if 'GRUPO:' in next_line and j + 1 < len(lines):
                grupo_line = lines[j + 1].strip() if j + 1 < len(lines) else ''
                if 'G-' in grupo_line:
                    grupo = grupo_line
            
            j += 1
        
        # Parse name
        if ',' in name_line:
            parts = name_line.split(',')
            nome_ultimo = parts[0].strip()
            nome_primeiro = parts[1].strip() if len(parts) > 1 else ''
        else:
            nome_primeiro = name_line.split()[0] if name_line.split() else name_line
            nome_ultimo = ' '.join(name_line.split()[1:]) if len(name_line.split()) > 1 else ''
        
        # Only add if we have at least a name
        if nome_primeiro or nome_ultimo:
            contacts.append({
                'nomePrimeiro': nome_primeiro,
                'nomeUltimo': nome_ultimo,
                'nomeCompleto': f"{nome_primeiro} {nome_ultimo}".strip(),
                'morada': morada,
                'email': email,
                'telemovel': telemovel,
                'telefone_casa': telefone_casa,
                'grupo': grupo
            })
        
        i = j
    else:
        i += 1

# Remove duplicates based on name
seen_names = set()
unique_contacts = []
for c in contacts:
    name_key = c['nomeCompleto'].lower()
    if name_key not in seen_names and len(c['nomePrimeiro']) > 1:
        seen_names.add(name_key)
        unique_contacts.append(c)

print(f"Total unique contacts found: {len(unique_contacts)}")
print("\nFirst 10 contacts:")
for c in unique_contacts[:10]:
    print(f"  - {c['nomeCompleto']} | {c['telemovel']} | {c['email']}")

# Save to JSON for later use
with open('/home/z/my-project/upload/contacts.json', 'w', encoding='utf-8') as f:
    json.dump(unique_contacts, f, ensure_ascii=False, indent=2)

print(f"\nSaved {len(unique_contacts)} contacts to contacts.json")
