FROM node:18-alpine
WORKDIR /app
# Copy dependency files first for better caching
COPY package*.json ./
RUN npm install --production
# Copy the rest of the backend code
COPY . .
EXPOSE 5000 
CMD ["node", "server.js"]