const express = require("express");
const router = express.Router();

const {
  crearAbono,
  obtenerAbonos,
  obtenerAbono,
  obtenerAbonosPorProyecto,
  obtenerResumenAbonos,
  actualizarAbono,
  eliminarAbono,
} = require("../controllers/abonoController");

// Registrar abono
router.post("/", crearAbono);

// Resumen general de pagos
router.get("/resumen", obtenerResumenAbonos);

// Abonos de un proyecto específico
router.get("/proyecto/:idProyecto", obtenerAbonosPorProyecto);

// Listar todos los abonos (admite ?idProyecto=PRO-001)
router.get("/", obtenerAbonos);

// Consultar un abono
router.get("/:id", obtenerAbono);

// Actualizar abono
router.put("/:id", actualizarAbono);

// Eliminar abono
router.delete("/:id", eliminarAbono);

module.exports = router;