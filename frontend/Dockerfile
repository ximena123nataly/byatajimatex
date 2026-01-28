FROM node:20-alpine

WORKDIR /app/

# Copiar archivos de dependencia
COPY package.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de la aplicación
COPY . .

ENV NODE_ENV development

EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]