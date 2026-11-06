
const Cliente = require("../models/Cliente");
const generateId = require("../utils/generateId");

// REGISTRAR CLIENTE
const crearCliente = async (req, res) => {
  try {
    const {
      nombre,
      direccion,
      subdireccion,
      registroFiscal,
      nit,
      telefono,
      correo,
      atencionA
    } = req.body;

    const idCliente = await generateId("CLI");

    const nuevoCliente = new Cliente({
      idCliente,
      nombre,
      direccion,
      subdireccion,
      registroFiscal,
      nit,
      telefono,
      correo,
      atencionA
    });

    await nuevoCliente.save();

    res.status(201).json({
      success: true,
      message: "Cliente registrado correctamente",
      cliente: nuevoCliente
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al registrar el cliente",
      error: error.message
    });
  }
};

// LISTAR CLIENTES
const obtenerClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: clientes.length,
      clientes
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener los clientes",
      error: error.message
    });
  }
};

// OBTENER UN CLIENTE
const obtenerCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      idCliente: req.params.id
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado"
      });
    }

    res.status(200).json({
      success: true,
      cliente
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener el cliente",
      error: error.message
    });
  }
};

// ACTUALIZAR CLIENTE
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
      "atencionA"
    ];

    const datosActualizar = {};

    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        datosActualizar[campo] = req.body[campo];
      }
    });

    const cliente = await Cliente.findOneAndUpdate(
      { idCliente: req.params.id },
      datosActualizar,
      {
        new: true,
        runValidators: true
      }
    );

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado"
      });
    }

    res.status(200).json({
      success: true,
      message: "Cliente actualizado correctamente",
      cliente
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar el cliente",
      error: error.message
    });
  }
};

// ELIMINAR CLIENTE
const eliminarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOneAndDelete({
      idCliente: req.params.id
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado"
      });
    }

    res.status(200).json({
      success: true,
      message: "Cliente eliminado correctamente"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar el cliente",
      error: error.message
    });
  }
};

module.exports = {
  crearCliente,
  obtenerClientes,
  obtenerCliente,
  actualizarCliente,
  eliminarCliente
};
