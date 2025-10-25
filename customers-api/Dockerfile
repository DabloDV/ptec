FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY src ./src
COPY openapi.yaml ./openapi.yaml
EXPOSE 3001
CMD ["npm", "run", "dev"]