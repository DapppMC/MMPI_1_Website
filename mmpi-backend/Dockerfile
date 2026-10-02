FROM node:20-slim
WORKDIR /app
# Copy dependency files first for better caching
COPY package*.json ./
RUN npm install --production
# Copy the rest of the backend code
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
