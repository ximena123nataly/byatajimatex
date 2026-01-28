FROM node:20-alpine

WORKDIR /app/

# Copiar archivos de dependencia
COPY package.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de la aplicación
COPY . .

ENV NODE_ENV development

EXPOSE 5000


#INICIO PARA VERIFICAR LA CONEXION A LA DB
#COPY wait-for-mysql.sh /wait-for-mysql.sh
#RUN chmod +x /wait-for-mysql.sh
#ENTRYPOINT ["sh", "/wait-for-mysql.sh"]
#FIN PARA VERIFICAR LA CONEXION A LA DB

# Comando para iniciar la aplicación
#CMD ["npm", "start"]
CMD ["npm", "start"]

