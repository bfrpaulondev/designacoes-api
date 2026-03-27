# Designações API

Backend para o sistema de designações de congregação.

## Rotas Disponíveis

### Ausências (`/api/ausencias`)
- `GET /` - Listar todas as ausências
- `GET /publicador/:id` - Ausências por publicador
- `GET /:id` - Obter ausência específica
- `POST /` - Criar nova ausência
- `POST /verificar` - Verificar ausências ativas para uma data
- `PUT /:id` - Atualizar ausência
- `DELETE /:id` - Excluir ausência

### Designações (`/api/designacoes`)
- `GET /` - Listar com filtros opcionais (categoria, publicadorId, dataInicio, dataFim, status)
- `GET /semana/:id` - Designações por semana
- `GET /publicador/:id` - Designações por publicador
- `GET /:id` - Obter designação específica
- `POST /` - Criar nova designação
- `POST /sugestoes` - Gerar sugestões de publicadores (considera ausências)
- `PUT /:id` - Atualizar designação
- `POST /:id/confirmar` - Confirmar designação
- `POST /:id/substituir` - Substituir publicador
- `DELETE /:id` - Excluir designação

### Configurações de Programação (`/api/config-programacao`)
- `GET /` - Obter todas as configurações
- `GET /secao/:secao` - Obter seção específica (fimSemana, meioSemana, etc.)
- `POST /` - Salvar configurações completas
- `PUT /secao/:secao` - Atualizar seção específica
- `POST /reset` - Resetar para configurações padrão

### Outras Rotas
- `GET /api/health` - Health check
- `/api/auth` - Autenticação
- `/api/publicadores` - CRUD de publicadores
- `/api/etiquetas` - CRUD de etiquetas
- `/api/semanas` - CRUD de semanas
- `/api/config` - Configurações gerais

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `MONGODB_URI` | URI de conexão do MongoDB | Sim |
| `JWT_SECRET` | Chave secreta para JWT | Sim |
| `PORT` | Porta do servidor | Não (padrão: 3001) |
| `CORS_ORIGINS` | Origens permitidas (separadas por vírgula) | Não |

## Deploy no Render

1. Crie um novo Web Service no Render
2. Conecte este repositório
3. Configure as variáveis de ambiente:
   - `MONGODB_URI` - String de conexão do MongoDB Atlas
   - `JWT_SECRET` - Uma string aleatória segura
   - `CORS_ORIGINS` - `https://designacoes-app.vercel.app,http://localhost:5173`
4. Deploy!

## Integração com o Frontend

O frontend (designacoes-app) deve ter a variável `VITE_API_URL` configurada apontando para este backend.

Em produção:
```
VITE_API_URL=https://seu-backend.onrender.com/api
```

Em desenvolvimento:
```
VITE_API_URL=  # Vazio, usa proxy do Vite
```
