
const express = require("express");
const router = express.Router();

const {
  crearCliente,
  obtenerClientes,
  obtenerCliente,
  actualizarCliente,
  eliminarCliente
} = require("../controllers/clienteController");

// POST: Registrar cliente
router.post("/", crearCliente);

// GET: Obtener todos los clientes
router.get("/", obtenerClientes);

// GET: Obtener un cliente por ID
router.get("/:id", obtenerCliente);

// PUT: Actualizar cliente
router.put("/:id", actualizarCliente);

// DELETE: Eliminar cliente
router.delete("/:id", eliminarCliente);

module.exports = router;
