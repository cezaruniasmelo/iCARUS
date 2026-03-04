# ============================================
# Stage 1: Build (front-end + dependências)
# ============================================
FROM node:20-alpine AS build

# Ferramentas de build para módulos nativos (better-sqlite3, etc.)
RUN apk add --no-cache python3 make g++

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

# Ferramentas de build para módulos nativos
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar apenas o necessário para produção
COPY package.json package-lock.json ./

# Instalar dependências de produção + tsx (runtime TypeScript)
RUN npm ci --omit=dev && npm install tsx \
    && apk del python3 make g++ \
    && rm -rf /tmp/* /root/.npm

# Copiar o front-end buildado
COPY --from=build /app/dist ./dist

# Copiar o servidor
COPY server.ts ./

# Porta padrão (Easypanel pode sobrescrever via variável PORT)
EXPOSE 3000

# Definir ambiente de produção
ENV NODE_ENV=production

# Health check para Easypanel
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Iniciar o servidor
CMD ["node", "--import", "tsx", "server.ts"]
