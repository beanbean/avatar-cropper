# --- Build Stage ---
FROM node:20-slim as builder

WORKDIR /app
COPY package*.json ./
# Cài đặt full dependencies để build TS
RUN npm ci

COPY . .
RUN npm run build

# --- Production Stage ---
FROM node:20-slim

WORKDIR /app

# Cài đặt dependencies production only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy kết quả build từ stage trước
COPY --from=builder /app/dist ./dist

# Biến môi trường mặc định
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/server.js"]