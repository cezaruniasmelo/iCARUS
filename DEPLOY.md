# 🚀 Deploy iCARUS — Hostinger + Easypanel

## Pré-requisitos

- Servidor VPS na Hostinger com Easypanel instalado
- Repositório Git configurado (GitHub/GitLab)
- Domínio configurado apontando para o servidor

---

## 1. Variáveis de Ambiente (Easypanel)

Configure estas variáveis no painel do Easypanel em **App → Environment Variables**:

### Obrigatórias

```env
NODE_ENV=production
PORT=3000
GEMINI_API_KEY=sua-chave-api-gemini
APP_URL=https://seu-dominio.com
```

### Opcionais (Google Calendar)

```env
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-seu-client-secret
SPECIALIST_REFRESH_TOKEN=1//seu-refresh-token
```

---

## 2. Como Obter Cada Variável

### `GEMINI_API_KEY`
1. Acesse [Google AI Studio](https://aistudio.google.com/apikey)
2. Clique em **Create API Key**
3. Copie a chave gerada

### `APP_URL`
URL pública da aplicação (**sem** barra final). Exemplos:
- `https://icarus.seudominio.com`
- `https://app.icarussolucoes.com.br`

### `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
1. Acesse [Google Cloud Console → Credenciais](https://console.cloud.google.com/apis/credentials)
2. Crie um projeto (ou use existente)
3. Vá em **+ Criar Credenciais → ID do cliente OAuth**
4. Tipo: **Aplicativo Web**
5. Em **URIs de redirecionamento autorizados**, adicione:
   ```
   https://seu-dominio.com/auth/google/callback
   ```
6. Copie o **Client ID** e **Client Secret**

### `SPECIALIST_REFRESH_TOKEN`
1. Após o deploy, acesse `https://seu-dominio.com/api/auth/google/url`
2. Faça login com a conta Google do especialista
3. Copie o refresh token exibido e adicione às variáveis no Easypanel

---

## 3. Configuração no Easypanel

1. **Criar App** → Tipo: **Docker** (ou GitHub com Dockerfile)
2. **Source**: Apontar para o repositório Git
3. **Build**: Easypanel detecta o `Dockerfile` automaticamente
4. **Port**: `3000`
5. **Domain**: Configurar o domínio e habilitar SSL (Let's Encrypt)
6. **Environment**: Adicionar todas as variáveis da seção 1

---

## 4. Deploy Manual (alternativo)

```bash
# Build da imagem
docker build -t icarus .

# Rodar com variáveis de ambiente
docker run -d \
  --name icarus \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e GEMINI_API_KEY=sua-chave \
  -e APP_URL=https://seu-dominio.com \
  icarus
```

---

## Estrutura de Produção

```
Container
├── dist/            ← Front-end buildado (Vite)
├── server.ts        ← Servidor Express
├── package.json
├── node_modules/    ← Apenas dependências de produção
└── (variáveis de ambiente via Easypanel)
```
