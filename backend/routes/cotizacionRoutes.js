const express = require("express");
const router = express.Router();

const {
  crearCotizacion,
  obtenerCotizaciones,
  obtenerCotizacion,
  obtenerCotizacionesPorCliente,
  obtenerHistorialCotizaciones,
  actualizarCotizacion,
  eliminarCotizacion,
} = require("../controllers/cotizacionController");

router.post("/", crearCotizacion);
router.get("/", obtenerCotizaciones);

// Historial: debe ir antes de /:id
router.get("/historial", obtenerHistorialCotizaciones);

router.get("/cliente/:idCliente", obtenerCotizacionesPorCliente);

router.get("/:id", obtenerCotizacion);
router.put("/:id", actualizarCotizacion);
router.delete("/:id", eliminarCotizacion);

module.exports = router;