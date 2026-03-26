const express = require('express');
const app = express();
const dotenv = require("dotenv");
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
//const helmet = require('helmet'); // Para seguridad

// Configurar variables de entorno
dotenv.config();
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// HABILITAR Configuración de seguridad con Helmet
/*app.use(helmet({
  contentSecurityPolicy: isProduction,
  crossOriginEmbedderPolicy: isProduction,
}));*/

// Configuración CORS dinámica para desarrollo/producción
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo, permitir localhost y todos (para testing)
    if (!isProduction) {
      callback(null, true);
    } else {
      // En producción, solo dominios específicos
      const allowedOrigins = [
        'https://bordadosjhonny.com',
        'https://tajima.bordadosjhonny.com',
        'https://stockmerch.vercel.app' 
      ];
      
      // Permitir solicitudes sin origin (como mobile apps o curl)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Pre-flight requests

// Middleware para forzar HTTPS en producción
if (isProduction) {
  app.use((req, res, next) => {
    // Verificar si la conexión no es HTTPS (usando header de proxy)
    if (req.headers['x-forwarded-proto'] !== 'https' && 
        req.hostname !== 'localhost') {
      return res.redirect(`https://${req.hostname}${req.url}`);
    }
    next();
  });
}

// Configuración del body parser con límites
app.use(express.json({
  limit: '10mb', // Límite para JSON
  extended: true
}));
app.use(express.urlencoded({
  limit: '10mb', // Límite para URL-encoded
  extended: true,
  parameterLimit: 10000 // Número máximo de parámetros
}));

app.use(cookieParser());

// =============================================
// 1. RUTA RAÍZ - Debe ir PRIMERO
// =============================================
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Byatajimatex Inventarios - Sistema de Gestión',
    version: '1.0.0',
    status: 'online',
    environment: process.env.NODE_ENV || 'development',
    server_time: new Date().toISOString(),
    server_uptime: `${process.uptime().toFixed(2)} seconds`,
    endpoints: {
      auth: '/auth/*',
      products: '/products/*',
      customers: '/customers/*',
      suppliers: '/suppliers/*',
      orders: '/orders/*',
      dashboard: '/dashboard/*',
      proformas: '/proformas/*',
      caja: '/caja/*',
      compras: '/expenses/*',
      health: '/health'
    },
    frontend_url: 'http://localhost:3000',
    backend_url: `http://localhost:${port}`,
    documentation: 'Visita /health para verificar el estado del servidor'
  });
});

// =============================================
// 2. RUTA DE SALUD - Después de la raíz
// =============================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: ' healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mysql: ' connected',
    uptime: `${process.uptime().toFixed(2)} seconds`,
    memory_usage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
    node_version: process.version,
    platform: process.platform
  });
});

// =============================================
// 3. SERVIR ARCHIVOS ESTÁTICOS
// =============================================
app.use(express.static('public', {
  maxAge: isProduction ? '1y' : '0', // Cache en producción
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// En producción, también servir el build del frontend si están juntos
if (isProduction) {
  // Si tienes el frontend build en una carpeta dentro del backend
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  
  // Verificar si existe la carpeta build
  const fs = require('fs');
  if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath, {
      maxAge: '1y',
      index: false // No servir index.html automáticamente
    }));
    
    console.log(' Frontend build encontrado y servido estáticamente');
  }
}

// =============================================
// 4. RUTAS API PRINCIPALES
// =============================================
app.use('/', require('./routes/user.routes.js'));
app.use('/', require('./routes/dashboard.routes.js'));
app.use('/', require('./routes/products.routes.js'));
app.use('/', require('./routes/customers.routes.js'));
app.use('/', require('./routes/suppliers.routes.js'));
app.use('/', require('./routes/orders.routes.js'));
app.use('/', require('./routes/expenses.routes.js'));
app.use("/", require("./routes/proformas.routes.js"));
app.use("/", require("./routes/caja.routes.js"));
app.use('/', require('./routes/purchases.routes.js'));
// =============================================
// 5. MANEJO DE RUTAS NO ENCONTRADAS (404)
// =============================================
// En producción, servir frontend para rutas no encontradas
if (isProduction) {
  app.get('*', (req, res) => {
    const frontendIndex = path.join(__dirname, '../frontend/build/index.html');
    const fs = require('fs');
    
    if (fs.existsSync(frontendIndex)) {
      res.sendFile(frontendIndex);
    } else {
      // Si no hay frontend, mostrar error 404 de API
      res.status(404).json({
        error: 'Endpoint not found',
        message: 'The requested resource does not exist',
        suggestion: 'Check the available endpoints at the root URL /',
        available_endpoints: ['GET /', 'GET /health', 'GET /api/*']
      });
    }
  });
} else {
  // En desarrollo, manejo de errores para rutas no encontradas
  // ESTO DEBE IR DESPUÉS de todas las rutas definidas
  app.use((req, res, next) => {
    res.status(404).json({
      error: 'Endpoint not found',
      message: `Cannot ${req.method} ${req.url}`,
      suggestion: 'Check your API endpoint or HTTP method',
      available_routes: [
        'GET / - API Information',
        'GET /health - Server health check',
        'GET /products - Get products',
        'GET /expenses - Get expenses',
        'GET /api/customers - Get customers',
        'POST /api/auth/login - User login'
      ],
      current_time: new Date().toISOString()
    });
  });
}

// =============================================
// 6. MANEJO GLOBAL DE ERRORES (500)
// =============================================
// ESTO DEBE IR AL FINAL DE TODO
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err.stack);
  
  const statusCode = err.status || 500;
  const errorResponse = {
    error: err.message || 'Internal Server Error',
    status: statusCode
  };
  
  // En desarrollo, agregar stack trace
  if (!isProduction) {
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
});

// =============================================
// 7. INICIAR SERVIDOR EN MODO PRODUCCION
// =============================================
/*
//const host = isProduction ? '0.0.0.0' : 'localhost';
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  console.log(`🚀 Servidor ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'} iniciado`);
  console.log(`📡 Escuchando en: http://${host}:${port}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Hora de inicio: ${new Date().toLocaleString()}`);
*/
// =============================================
// 7. INICIAR SERVIDOR EN MODO DESARROLLO
// =============================================

const host = process.env.HOST || "localhost";
app.listen(port, host, () => {
  console.log(`🚀 Servidor ${isProduction ? 'PRODUCCION' : 'DESARROLLO'} iniciado`);
  console.log(`📡 Escuchando en: http://${host}:${port}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Hora de inicio: ${new Date().toLocaleString()}`);
  

  // Verificar conexión a BD
  require('./db/conn.js'); // Esto ejecutará la conexión
});