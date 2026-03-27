#!/usr/bin/env python3
import json
import requests

# Read contacts
with open('/home/z/my-project/upload/contacts.json', 'r') as f:
    contacts = json.load(f)

API_URL = "https://designacoes-api.onrender.com/api/publicadores"

created = 0
failed = 0

for i in range(0, len(contacts)):
    contact = contacts[i]
    
    # Skip if no valid name
    nome = contact.get('nomePrimeiro', '') + ' ' + contact.get('nomeUltimo', '')
    nome = nome.strip()
    if not nome:
        continue
    
    data = {
        "nomePrimeiro": contact.get('nomePrimeiro', ''),
        "nomeUltimo": contact.get('nomeUltimo', ''),
        "email": contact.get('email', ''),
        "telemovel": contact.get('telemovel', ''),
        "morada": contact.get('morada', ''),
        "status": "ativo",
        "tipoPublicador": "publicador_batizado",
        "privilegioServico": "nenhum"
    }
    
    try:
        response = requests.post(API_URL, json=data)
        if response.status_code == 201:
            created += 1
            print(f"[{created}] {contact.get('nomeCompleto', '')}")
        else:
            failed += 1
            print(f"FAILED [{response.status_code}]: {contact.get('nomeCompleto', '')}")
    except Exception as e:
        failed += 1
        print(f"ERROR: {contact.get('nomeCompleto', '')} - {e}")

print(f"\nTotal: {len(contacts)} contacts")
print(f"Created: {created}")
print(f"Failed: {failed}")
