# Build the Node.js application & create container
FROM node:18
WORKDIR /app
COPY ../package*.json ./
RUN npm install
COPY . .
EXPOSE 4200
CMD ["npx", "ng", "serve", "--host", "0.0.0.0"]