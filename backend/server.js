
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/database");
const clienteRoutes = require("./routes/clienteRoutes");
const proyectoRoutes = require("./routes/proyectoRoutes");
const cotizacionRoutes = require("./routes/cotizacionRoutes");

const app = express();

// Middlewares
app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json());

// Ruta principal
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bienvenido a la API de A&S Aluminio y Vidrio"
  });
});

// Rutas de clientes
app.use("/api/clientes", clienteRoutes);

// Rutas de proyectos
app.use("/api/proyectos", proyectoRoutes);

// Rutas de cotizaciones
app.use("/api/cotizaciones", cotizacionRoutes);

// Puerto del servidor
const PORT = process.env.PORT || 4000;

// Conexión e inicio del servidor
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
  });
};

startServer();
