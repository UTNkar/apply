FROM node:26 AS base

WORKDIR /app

# Install dependencies
COPY frontend/apply/package.json frontend/apply/package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY ./frontend/apply .

EXPOSE 3000

CMD ["npm", "run", "dev"]