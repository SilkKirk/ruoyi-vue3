# ============================================================
# RuoYi-Vue Frontend Dockerfile
# 多阶段构建：Node 编译 → Nginx 运行
# ============================================================
# ---- 构建阶段 ----
FROM node:22-alpine AS builder

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:prod

# ---- 运行阶段 ----
FROM nginx:1.27-alpine

# 将构建产物复制到 Nginx 静态目录
COPY --from=builder /build/dist /usr/share/nginx/html
# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
