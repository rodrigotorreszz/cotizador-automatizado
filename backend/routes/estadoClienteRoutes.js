const express = require("express");
const router = express.Router();

const {
  obtenerEstadoClientes
} = require("../controllers/estadoClienteController");

router.get("/", obtenerEstadoClientes);

module.exports = router;