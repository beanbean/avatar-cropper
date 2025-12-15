# --- Build Stage ---
FROM node:20-slim as builder

WORKDIR /app

# Copy file dependency definition
COPY package*.json ./

# Cài đặt full dependencies để build TypeScript
RUN npm ci

# Copy toàn bộ source code
COPY . .

# Build TypeScript sang JavaScript (vào thư mục dist)
RUN npm run build

# --- Production Stage ---
FROM node:20-slim

WORKDIR /app

# Chỉ copy file package để cài dependency production
COPY package*.json ./

# Cài đặt dependencies tối thiểu (bỏ qua devDependencies)
RUN npm ci --omit=dev

# Copy code đã build từ stage builder
COPY --from=builder /app/dist ./dist

# Thiết lập biến môi trường
ENV PORT=3000
ENV NODE_ENV=production

# Mở port container
EXPOSE 3000

# LỆNH QUAN TRỌNG: Chạy đúng file server.js
CMD ["node", "dist/server.js"]
