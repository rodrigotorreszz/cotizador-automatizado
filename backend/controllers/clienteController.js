
const Cliente = require("../models/Cliente");
const generateId = require("../utils/generateId");

// ==========================================
// REGISTRAR CLIENTE
// ==========================================
const crearCliente = async (req, res) => {
  try {
    console.log("DATOS RECIBIDOS:", req.body);

    const campos = [
      "nombre",
      "direccion",
      "subdireccion",
      "registroFiscal",
      "nit",
      "telefono",
      "correo",
      "atencionA",
    ];

    const datos = {};

    campos.forEach((campo) => {
      datos[campo] = String(req.body[campo] ?? "").trim();
    });

    datos.correo = datos.correo.toLowerCase();

    // Generar código automático
    const idCliente = await generateId("CLI");

    console.log("ID GENERADO:", idCliente);

    const nuevoCliente = new Cliente({
      idCliente,
      ...datos,
    });

    await nuevoCliente.save();

    console.log("CLIENTE REGISTRADO:", nuevoCliente.idCliente);

    return res.status(201).json({
      success: true,
      message: "Cliente registrado correctamente",
      cliente: nuevoCliente,
    });

  } catch (error) {
    console.error("ERROR COMPLETO AL REGISTRAR CLIENTE:", error);

    return res.status(500).json({
      success: false,
      message: "Error al registrar el cliente",
      error: error.message,
      code: error.code || null,
      name: error.name,
      details: error.errors
        ? Object.values(error.errors).map((e) => e.message)
        : null,
    });
  }
};

// ==========================================
// OBTENER TODOS LOS CLIENTES
// ==========================================
const obtenerClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: clientes.length,
      clientes,
    });

  } catch (error) {
    console.error("ERROR AL OBTENER CLIENTES:", error);

    return res.status(500).json({
      success: false,
      message: "Error al obtener los clientes",
      error: error.message,
    });
  }
};

// ==========================================
// OBTENER UN CLIENTE
// ==========================================
const obtenerCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      idCliente: req.params.id,
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    return res.status(200).json({
      success: true,
      cliente,
    });

  } catch (error) {
    console.error("ERROR AL OBTENER CLIENTE:", error);

    return res.status(500).json({
      success: false,
      message: "Error al obtener el cliente",
      error: error.message,
    });
  }
};

// ==========================================
// ACTUALIZAR CLIENTE
// ==========================================
const actualizarCliente = async (req, res) => {
  try {
    const camposPermitidos = [
      "nombre",
      "direccion",
      "subdireccion",
      "registroFiscal",
      "nit",
      "telefono",
      "correo",
      "atencionA",
    ];

    const datosActualizar = {};

    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        datosActualizar[campo] = String(req.body[campo] ?? "").trim();
      }
    });

    if (datosActualizar.correo !== undefined) {
      datosActualizar.correo = datosActualizar.correo.toLowerCase();
    }

    const cliente = await Cliente.findOneAndUpdate(
      { idCliente: req.params.id },
      { $set: datosActualizar },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cliente actualizado correctamente",
      cliente,
    });

  } catch (error) {
    console.error("ERROR AL ACTUALIZAR CLIENTE:", error);

    return res.status(500).json({
      success: false,
      message: "Error al actualizar el cliente",
      error: error.message,
      details: error.errors
        ? Object.values(error.errors).map((e) => e.message)
        : null,
    });
  }
};

// ==========================================
// ELIMINAR CLIENTE
// ==========================================
const eliminarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOneAndDelete({
      idCliente: req.params.id,
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cliente eliminado correctamente",
    });

  } catch (error) {
    console.error("ERROR AL ELIMINAR CLIENTE:", error);

    return res.status(500).json({
      success: false,
      message: "Error al eliminar el cliente",
      error: error.message,
    });
  }
};

// ==========================================
// EXPORTAR CONTROLADORES
// ==========================================
module.exports = {
  crearCliente,
  obtenerClientes,
  obtenerCliente,
  actualizarCliente,
  eliminarCliente,
};
