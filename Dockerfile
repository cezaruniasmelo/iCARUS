# ============================================
# Stage 1: Build (front-end + dependências)
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Copiar apenas arquivos de dependência primeiro (cache de layers)
COPY package.json package-lock.json ./

# Instalar todas as dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código-fonte
COPY . .

# Build do front-end (Vite gera a pasta dist/)
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Copiar apenas o necessário para produção
COPY package.json package-lock.json ./

# Instalar apenas dependências de produção + tsx (runtime TypeScript)
RUN npm ci --omit=dev && npm install tsx

# Copiar o front-end buildado
COPY --from=build /app/dist ./dist

# Copiar o servidor
COPY server.ts ./

# Porta padrão (Easypanel pode sobrescrever via variável PORT)
EXPOSE 3000

# Definir ambiente de produção
ENV NODE_ENV=production

# Iniciar o servidor
CMD ["npx", "tsx", "server.ts"]
