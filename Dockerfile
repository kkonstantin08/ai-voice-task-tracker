FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

RUN npm run prisma:generate
RUN npm run build
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
