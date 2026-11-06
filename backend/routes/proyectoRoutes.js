
const express = require("express");
const router = express.Router();

const {
  crearProyecto,
  obtenerProyectos,
  obtenerProyecto,
  obtenerProyectosPorCliente,
  actualizarProyecto,
  eliminarProyecto
} = require("../controllers/proyectoController");

// POST: Registrar proyecto
router.post("/", crearProyecto);

// GET: Listar todos los proyectos
router.get("/", obtenerProyectos);

// GET: Listar proyectos de un cliente
router.get("/cliente/:idCliente", obtenerProyectosPorCliente);

// GET: Consultar un proyecto por ID
router.get("/:id", obtenerProyecto);

// PUT: Actualizar proyecto
router.put("/:id", actualizarProyecto);

// DELETE: Eliminar proyecto
router.delete("/:id", eliminarProyecto);

module.exports = router;
