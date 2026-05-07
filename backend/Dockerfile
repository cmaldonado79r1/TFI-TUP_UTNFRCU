FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema para pdfkit/canvas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorio de uploads
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

EXPOSE 3000

CMD ["node", "server.js"]
