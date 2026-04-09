const mysql = require("mysql");
require("dotenv").config();

let conn = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 30; // Intentos máximos

function connectToDatabase() {
  conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    timeout: 60000,
    connectTimeout: 30000, // Aumentado a 30 segundos
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: true,
    // Agregar SSL para conexión segura
    ssl: process.env.NODE_ENV === 'production' ? {
    // Dependiendo de tu proveedor de MySQL
    rejectUnauthorized: false
  } : false
  });

   conn.connect((err) => {
    if (err) {
      reconnectAttempts++;
      console.error(` Error conectando a MySQL (intento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}):`, err.message);
      
      // Retry con backoff exponencial
      const delay = Math.min(5000 * Math.pow(1.5, reconnectAttempts - 1), 30000);
      console.log(` Reintentando en ${delay/1000} segundos...`);
      
      setTimeout(connectToDatabase, delay);
      return;
    }

    // Resetear intentos al conectar exitosamente
    reconnectAttempts = 0;
    console.log(" ✅ MySQL conectado correctamente");
    
    // Configurar modo SQL
    let q = "SET sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))";
    conn.query(q, (err) => {
      if (err) console.error("Error configurando SQL mode:", err.message);
    });
  });

  // Manejar errores de conexión
  conn.on('error', (err) => {
    console.error('  Error de conexión MySQL:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      console.log(' 🔄 Reconectando...');

       // IMPORTANTE: Destruir la conexión vieja
      if (conn && conn.destroy) {
        conn.destroy();
      }

      connectToDatabase();
    } else {
      throw err;
    }
  });

  // Ping periódico
  setInterval(() => {
    if (conn && conn.state !== 'disconnected' && conn.state !== 'connecting') {
      conn.ping((err) => {
        if (err) {
          console.log('⚠️ Ping fallido:', err.message);
          // Forzar reconexión en el próximo query
        }
      });
    }
  }, 120000); // 2 minutos
}

// Iniciar conexión
connectToDatabase();

// =============================================
// TRUCO: Interceptar todos los queries para reconectar automáticamente
//  ✅ VERSIÓN CORREGIDA - Sin modificar el prototype
// =============================================

// Guardar referencia a la función query original de esta conexión
let currentQuery = null;

// Sobrescribir el método query de la conexión actual cuando se establece
function setupQueryWrapper() {
  if (conn && conn.query) {
    // Guardar query original
    currentQuery = conn.query;
    
    // Reemplazar con wrapper
    conn.query = function(sql, values, cb) {
      // Si hay callback, es estilo callback
      if (typeof values === 'function') {
        cb = values;
        values = [];
      }
      
      // Verificar estado de conexión
      if (!conn || conn.state === 'disconnected' || conn.state === 'protocol_error') {
        console.log('🔄 Conexión perdida, reconectando antes de query...');
        connectToDatabase();
        
        setTimeout(() => {
          if (conn && conn.state === 'authenticated') {
            currentQuery.call(conn, sql, values, cb);
          } else {
            console.error('❌ No se pudo reconectar');
            if (cb) cb(new Error('Database connection lost'), null);
          }
        }, 1000);
        return;
      }
      
      // Ejecutar query normalmente
      currentQuery.call(conn, sql, values, cb);
    };
  }
}

// Ejecutar después de cada conexión exitosa
const originalConnect = connectToDatabase;
connectToDatabase = function() {
  originalConnect();
  // Esperar a que la conexión esté lista
  setTimeout(setupQueryWrapper, 100);
};

// Iniciar
connectToDatabase();



module.exports = conn;
