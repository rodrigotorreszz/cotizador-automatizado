
const Proyecto = require("../models/Proyecto");
const Cliente = require("../models/Cliente");
const generateId = require("../utils/generateId");

// REGISTRAR PROYECTO
const crearProyecto = async (req, res) => {
  try {
    const { idCliente, proyecto, ubicacion, estado } = req.body;

    // Verificar que el cliente exista
    const cliente = await Cliente.findOne({ idCliente });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "El cliente seleccionado no existe"
      });
    }

    // Generar ID automático
    const nuevoId = await generateId("PRO");

    const nuevoProyecto = new Proyecto({
      idProyecto: nuevoId,
      idCliente: cliente._id,
      proyecto,
      ubicacion,
      estado
    });

    await nuevoProyecto.save();

    res.status(201).json({
      success: true,
      message: "Proyecto registrado correctamente",
      proyecto: nuevoProyecto
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al registrar el proyecto",
      error: error.message
    });
  }
};

// LISTAR TODOS LOS PROYECTOS
const obtenerProyectos = async (req, res) => {
  try {
    const proyectos = await Proyecto.find()
      .populate("idCliente", "idCliente nombre")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: proyectos.length,
      proyectos
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener los proyectos",
      error: error.message
    });
  }
};

// OBTENER PROYECTO POR ID
const obtenerProyecto = async (req, res) => {
  try {
    const proyecto = await Proyecto.findOne({
      idProyecto: req.params.id
    }).populate("idCliente", "idCliente nombre");

    if (!proyecto) {
      return res.status(404).json({
        success: false,
        message: "Proyecto no encontrado"
      });
    }

    res.status(200).json({
      success: true,
      proyecto
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener el proyecto",
      error: error.message
    });
  }
};

// OBTENER PROYECTOS DE UN CLIENTE
const obtenerProyectosPorCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      idCliente: req.params.idCliente
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado"
      });
    }

    const proyectos = await Proyecto.find({
      idCliente: cliente._id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      cliente: {
        idCliente: cliente.idCliente,
        nombre: cliente.nombre
      },
      total: proyectos.length,
      proyectos
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener los proyectos del cliente",
      error: error.message
    });
  }
};

// ACTUALIZAR PROYECTO
const actualizarProyecto = async (req, res) => {
  try {
    const camposPermitidos = [
      "proyecto",
      "ubicacion",
      "estado"
    ];

    const datosActualizar = {};

    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        datosActualizar[campo] = req.body[campo];
      }
    });

    const proyecto = await Proyecto.findOneAndUpdate(
      { idProyecto: req.params.id },
      datosActualizar,
      {
        new: true,
        runValidators: true
      }
    ).populate("idCliente", "idCliente nombre");

    if (!proyecto) {
      return res.status(404).json({
        success: false,
        message: "Proyecto no encontrado"
      });
    }

    res.status(200).json({
      success: true,
      message: "Proyecto actualizado correctamente",
      proyecto
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar el proyecto",
      error: error.message
    });
  }
};

// ELIMINAR PROYECTO
const eliminarProyecto = async (req, res) => {
  try {
    const proyecto = await Proyecto.findOneAndDelete({
      idProyecto: req.params.id
    });

    if (!proyecto) {
      return res.status(404).json({
        success: false,
        message: "Proyecto no encontrado"
      });
    }

    res.status(200).json({
      success: true,
      message: "Proyecto eliminado correctamente"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar el proyecto",
      error: error.message
    });
  }
};

module.exports = {
  crearProyecto,
  obtenerProyectos,
  obtenerProyecto,
  obtenerProyectosPorCliente,
  actualizarProyecto,
  eliminarProyecto
};
