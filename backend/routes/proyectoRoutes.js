
const express = require("express");
const router = express.Router();

const {
  crearProyecto,
  obtenerProyectos,
  obtenerProyecto,
  obtenerProyectosPorCliente,
  actualizarProyecto,
  eliminarProyecto,
} = require("../controllers/proyectoController");

// Registrar proyecto
router.post("/", crearProyecto);

// Listar todos los proyectos
router.get("/", obtenerProyectos);

// Listar proyectos de un cliente
router.get("/cliente/:idCliente", obtenerProyectosPorCliente);

// Consultar proyecto por código
router.get("/:id", obtenerProyecto);

// Actualizar proyecto
router.put("/:id", actualizarProyecto);

// Eliminar proyecto
router.delete("/:id", eliminarProyecto);

module.exports = router;
