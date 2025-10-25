FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY src ./src
COPY openapi.yaml ./openapi.yaml
EXPOSE 3002
CMD ["npm", "run", "dev"]