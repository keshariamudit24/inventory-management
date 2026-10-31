FROM node:22-alpine

# Prisma needs OpenSSL on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY public ./public

ENV NODE_ENV=production
EXPOSE 3000

# Sync the schema to Neon, then start the API
CMD ["sh", "-c", "npx prisma db push && node src/app.js"]
