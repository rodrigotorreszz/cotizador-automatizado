const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/database");

// ========================================
// IMPORTAR RUTAS
// ========================================

const clienteRoutes = require("./routes/clienteRoutes");
const proyectoRoutes = require("./routes/proyectoRoutes");
const cotizacionRoutes = require("./routes/cotizacionRoutes");
const abonoRoutes = require("./routes/abonoRoutes");
const estadoClienteRoutes = require("./routes/estadoClienteRoutes");

const app = express();

// ========================================
// CONFIGURACIÓN DEL SERVIDOR
// ========================================

const PORT = process.env.PORT || 4000;

const origenesPermitidos = [
  "http://localhost:5173",
  "http://localhost:5174",
];

// ========================================
// MIDDLEWARES
// ========================================

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || origenesPermitidos.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`Origen no permitido por CORS: ${origin}`)
      );
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// RUTA PRINCIPAL
// ========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bienvenido a la API de A&S Aluminio y Vidrio",
    puerto: PORT,
    estado: "Servidor funcionando correctamente",
  });
});

// ========================================
// RUTAS DE LA API
// ========================================

app.use("/api/clientes", clienteRoutes);
app.use("/api/proyectos", proyectoRoutes);
app.use("/api/cotizaciones", cotizacionRoutes);
app.use("/api/abonos", abonoRoutes);
app.use("/api/estado-cliente", estadoClienteRoutes);

// ========================================
// RUTAS NO ENCONTRADAS
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ========================================
// MANEJO DE ERRORES
// ========================================

app.use((err, req, res, next) => {
  console.error("Error del servidor:", err.message);

  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : undefined,
  });
});

// ========================================
// CONEXIÓN E INICIO DEL SERVIDOR
// ========================================

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("------------------------------------");
      console.log("A&S ALUMINIO Y VIDRIO");
      console.log("------------------------------------");
      console.log(`Servidor activo: http://localhost:${PORT}`);
      console.log("------------------------------------");
    });
  } catch (error) {
    console.error(
      "No se pudo iniciar el servidor:",
      error.message
    );

    process.exit(1);
  }
};

startServer();
