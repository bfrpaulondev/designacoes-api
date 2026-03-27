#!/bin/bash

# Read contacts
with open('/home/z/my-project/upload/contacts.json', 'r') as f:
    contacts = json.load(f)

API_URL="https://designacoes-api.onrender.com/api/publicadores"

created=0
failed=0

for contact in contacts:
    # Skip if no valid name
    if not contact.get('nomePrimeiro') or not contact.get('nomeUltimo'):
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
    
    # Add group if available
    if contact.get('grupo') and 'Grupo Limpeza' in contact['grupo']:
        # Extract grupo limpeza letter
        grupo_match = echo "Grupo Limpeza ([A-G])" | head -1
        if grupo_match:
            data['grupoLimpeza'] = grupo_match.group(1)
    
    curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$data" 2>/dev/null
    
    if response_contains "message"; then
        created=$((created + 1))
    else
        failed=$((failed + 1))
        echo "Failed: ${contact['nomeCompleto']}"

echo "Created: $created publicadores"
echo "Failed: $failed"
