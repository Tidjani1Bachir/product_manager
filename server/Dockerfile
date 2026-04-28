FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Remove vercel.json — not needed in Docker
RUN rm -f vercel.json

EXPOSE 5000

CMD ["node", "server.js"]