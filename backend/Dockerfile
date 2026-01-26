FROM node:19-alpine

WORKDIR /app/

# Copiar archivos de dependencia
COPY package.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de la aplicación
COPY . .

ENV NODE_ENV development

EXPOSE 5000

# Comando para iniciar la aplicación
#CMD ["npm", "start"]

COPY wait-for-mysql.sh /wait-for-mysql.sh
RUN chmod +x /wait-for-mysql.sh

ENTRYPOINT ["sh", "/wait-for-mysql.sh"]
CMD ["npm", "start"]

