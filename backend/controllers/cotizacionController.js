
const Cotizacion = require("../models/Cotizacion");
const Cliente = require("../models/Cliente");
const Proyecto = require("../models/Proyecto");
const generateId = require("../utils/generateId");

// Redondear cantidades a dos decimales
const redondear = (numero) =>
  Math.round((numero + Number.EPSILON) * 100) / 100;

// Preparar conceptos y calcular sus totales
const calcularConceptos = (conceptos) => {
  if (!Array.isArray(conceptos) || conceptos.length === 0) {
    throw new Error("Agregá al menos un concepto a la cotización.");
  }

  return conceptos.map((concepto) => {
    const descripcion = String(concepto.descripcion || "").trim();
    const cantidad = Number(concepto.cantidad);
    const precioUnitario = Number(concepto.precioUnitario);

    if (!descripcion) {
      throw new Error("Todos los conceptos deben tener descripción.");
    }

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error("Las cantidades deben ser mayores que cero.");
    }

    if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
      throw new Error("Los precios no pueden ser negativos.");
    }

    return {
      descripcion,
      cantidad,
      precioUnitario,
      total: redondear(cantidad * precioUnitario),
    };
  });
};

// Calcular subtotal, IVA y total general
const calcularTotales = (conceptos, porcentajeIVA = 13) => {
  const subtotal = redondear(
    conceptos.reduce((acumulado, concepto) => acumulado + concepto.total, 0)
  );

  const porcentaje = Number(porcentajeIVA);

  if (!Number.isFinite(porcentaje) || porcentaje < 0) {
    throw new Error("El porcentaje de IVA no es válido.");
  }

  const iva = redondear(subtotal * (porcentaje / 100));
  const totalGeneral = redondear(subtotal + iva);

  return {
    subtotal,
    porcentajeIVA: porcentaje,
    iva,
    totalGeneral,
  };
};

// Crear cotización
const crearCotizacion = async (req, res) => {
  try {
    const {
      idCliente,
      idProyecto,
      conceptos,
      porcentajeIVA = 13,
      fecha,
    } = req.body;

    if (!idCliente) {
      return res.status(400).json({
        success: false,
        message: "Debés seleccionar un cliente.",
      });
    }

    const cliente = await Cliente.findOne({ idCliente });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "El cliente seleccionado no existe.",
      });
    }

    let proyecto = null;

    if (idProyecto) {
      proyecto = await Proyecto.findOne({
        idProyecto,
        idCliente: cliente._id,
      });

      if (!proyecto) {
        return res.status(404).json({
          success: false,
          message: "El proyecto no existe o no pertenece a este cliente.",
        });
      }
    }

    const conceptosCalculados = calcularConceptos(conceptos);
    const totales = calcularTotales(conceptosCalculados, porcentajeIVA);

    const nuevaCotizacion = new Cotizacion({
      idCotizacion: await generateId("COT"),
      idCliente: cliente._id,
      idProyecto: proyecto ? proyecto._id : null,
      conceptos: conceptosCalculados,
      ...totales,
      ...(fecha && { fecha }),
    });

    await nuevaCotizacion.save();

    const cotizacionGuardada = await Cotizacion.findById(
      nuevaCotizacion._id
    ).populate("idCliente", "idCliente nombre");

    return res.status(201).json({
      success: true,
      message: "Cotización creada correctamente.",
      cotizacion: cotizacionGuardada,
    });
  } catch (error) {
    console.error("Error al crear cotización:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "No fue posible crear la cotización.",
    });
  }
};

// Obtener todas las cotizaciones
const obtenerCotizaciones = async (req, res) => {
  try {
    const cotizaciones = await Cotizacion.find()
      .populate("idCliente", "idCliente nombre empresa")
      .populate("idProyecto", "idProyecto proyecto nombre")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: cotizaciones.length,
      cotizaciones,
    });
  } catch (error) {
    console.error("Error al obtener cotizaciones:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible obtener las cotizaciones.",
    });
  }
};

// Obtener una cotización por su código
const obtenerCotizacion = async (req, res) => {
  try {
    const cotizacion = await Cotizacion.findOne({
      idCotizacion: req.params.id,
    })
      .populate("idCliente", "idCliente nombre empresa")
      .populate("idProyecto", "idProyecto proyecto nombre");

    if (!cotizacion) {
      return res.status(404).json({
        success: false,
        message: "Cotización no encontrada.",
      });
    }

    return res.status(200).json({
      success: true,
      cotizacion,
    });
  } catch (error) {
    console.error("Error al obtener cotización:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible obtener la cotización.",
    });
  }
};

// Obtener cotizaciones de un cliente
const obtenerCotizacionesPorCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      idCliente: req.params.idCliente,
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado.",
      });
    }

    const cotizaciones = await Cotizacion.find({
      idCliente: cliente._id,
    })
      .populate("idCliente", "idCliente nombre empresa")
      .populate("idProyecto", "idProyecto proyecto nombre")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: cotizaciones.length,
      cotizaciones,
    });
  } catch (error) {
    console.error("Error al consultar cotizaciones del cliente:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible consultar las cotizaciones del cliente.",
    });
  }
};

// ============================================
// HISTORIAL DE COTIZACIONES
// Filtro opcional por ID de cliente
// ============================================

const obtenerHistorialCotizaciones = async (req, res) => {
  try {
    const { cliente } = req.query;

    let filtro = {};

    // Si se proporciona un ID de cliente, buscarlo
    if (cliente && cliente.trim() !== "") {
      const clienteEncontrado = await Cliente.findOne({
        idCliente: cliente.trim().toUpperCase(),
      });

      if (!clienteEncontrado) {
        return res.status(404).json({
          success: false,
          message: "No se encontró el cliente indicado.",
        });
      }

      filtro.idCliente = clienteEncontrado._id;
    }

    // Consultar cotizaciones
    const cotizaciones = await Cotizacion.find(filtro)
      .populate("idCliente", "idCliente nombre empresa")
      .populate("idProyecto", "idProyecto proyecto nombre")
      .sort({ fecha: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: cotizaciones.length,
      cotizaciones,
    });
  } catch (error) {
    console.error("Error al obtener el historial:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible obtener el historial de cotizaciones.",
    });
  }
};

// Actualizar cotización
const actualizarCotizacion = async (req, res) => {
  try {
    const cotizacion = await Cotizacion.findOne({
      idCotizacion: req.params.id,
    });

    if (!cotizacion) {
      return res.status(404).json({
        success: false,
        message: "Cotización no encontrada.",
      });
    }

    const {
      idCliente,
      idProyecto,
      conceptos,
      porcentajeIVA,
      fecha,
      estado,
    } = req.body;

    let clienteId = cotizacion.idCliente;
    let proyectoId = cotizacion.idProyecto;

    if (idCliente) {
      const cliente = await Cliente.findOne({ idCliente });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: "El cliente seleccionado no existe.",
        });
      }

      clienteId = cliente._id;
    }

    if (idProyecto !== undefined) {
      if (!idProyecto) {
        proyectoId = null;
      } else {
        const proyecto = await Proyecto.findOne({
          idProyecto,
          idCliente: clienteId,
        });

        if (!proyecto) {
          return res.status(404).json({
            success: false,
            message: "El proyecto no existe o no pertenece a este cliente.",
          });
        }

        proyectoId = proyecto._id;
      }
    }

    const conceptosCalculados =
      conceptos !== undefined
        ? calcularConceptos(conceptos)
        : calcularConceptos(cotizacion.conceptos);

    const nuevoPorcentaje =
      porcentajeIVA !== undefined
        ? porcentajeIVA
        : cotizacion.porcentajeIVA;

    const totales = calcularTotales(
      conceptosCalculados,
      nuevoPorcentaje
    );

    const estadosPermitidos = [
      "Borrador",
      "Enviada",
      "Aceptada",
      "Rechazada",
    ];

    if (estado !== undefined && !estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: "El estado de la cotización no es válido.",
      });
    }

    cotizacion.idCliente = clienteId;
    cotizacion.idProyecto = proyectoId;
    cotizacion.conceptos = conceptosCalculados;
    Object.assign(cotizacion, totales);

    if (fecha !== undefined) cotizacion.fecha = fecha;
    if (estado !== undefined) cotizacion.estado = estado;

    await cotizacion.save();

    const cotizacionActualizada = await Cotizacion.findById(
      cotizacion._id
    )
      .populate("idCliente", "idCliente nombre empresa")
      .populate("idProyecto", "idProyecto proyecto nombre");

    return res.status(200).json({
      success: true,
      message: "Cotización actualizada correctamente.",
      cotizacion: cotizacionActualizada,
    });
  } catch (error) {
    console.error("Error al actualizar cotización:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "No fue posible actualizar la cotización.",
    });
  }
};

// Eliminar cotización
const eliminarCotizacion = async (req, res) => {
  try {
    const cotizacion = await Cotizacion.findOneAndDelete({
      idCotizacion: req.params.id,
    });

    if (!cotizacion) {
      return res.status(404).json({
        success: false,
        message: "Cotización no encontrada.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cotización eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error al eliminar cotización:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible eliminar la cotización.",
    });
  }
};

module.exports = {
  crearCotizacion,
  obtenerCotizaciones,
  obtenerCotizacion,
  obtenerCotizacionesPorCliente,
  obtenerHistorialCotizaciones,
  actualizarCotizacion,
  eliminarCotizacion,
};
