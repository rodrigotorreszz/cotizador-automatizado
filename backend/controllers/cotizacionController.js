const Cotizacion = require("../models/Cotizacion");
const Cliente = require("../models/Cliente");
const Proyecto = require("../models/Proyecto");
const generateId = require("../utils/generateId");

// ==========================================
// UTILIDADES
// ==========================================

const redondear = (numero) =>
  Math.round((Number(numero || 0) + Number.EPSILON) * 100) / 100;

const limpiarCondicion = (valor) => {
  if (valor === undefined || valor === null) return "";
  return String(valor).trim();
};

const estadosPermitidos = [
  "Borrador",
  "Enviada",
  "Aceptada",
  "Rechazada",
];

// Campos necesarios para el documento PDF.
const CAMPOS_CLIENTE =
  "idCliente nombre empresa telefono correo direccion subdireccion registroFiscal nit atencionA";

const CAMPOS_PROYECTO =
  "idProyecto proyecto nombre ubicacion estado";

const validarFecha = (fecha) => {
  if (!fecha) return null;

  // Las fechas YYYY-MM-DD se interpretan de forma local
  // para evitar desplazamientos de día por zona horaria.
  if (typeof fecha === "string") {
    const coincidencia = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (coincidencia) {
      const [, anio, mes, dia] = coincidencia;

      const fechaLocal = new Date(
        Number(anio),
        Number(mes) - 1,
        Number(dia),
        12,
        0,
        0
      );

      if (
        fechaLocal.getFullYear() !== Number(anio) ||
        fechaLocal.getMonth() !== Number(mes) - 1 ||
        fechaLocal.getDate() !== Number(dia)
      ) {
        return null;
      }

      return fechaLocal;
    }
  }

  const fechaValidada = new Date(fecha);

  return Number.isNaN(fechaValidada.getTime())
    ? null
    : fechaValidada;
};

// ==========================================
// CALCULAR CONCEPTOS
// ==========================================

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

// ==========================================
// CALCULAR TOTALES
// ==========================================

const calcularTotales = (conceptos, porcentajeIVA = 13) => {
  const subtotal = redondear(
    conceptos.reduce(
      (acumulado, concepto) => acumulado + concepto.total,
      0
    )
  );

  const porcentaje = Number(porcentajeIVA);

  if (!Number.isFinite(porcentaje) || porcentaje < 0) {
    throw new Error("El porcentaje de IVA no es válido.");
  }

  const iva = redondear(
    subtotal * (porcentaje / 100)
  );

  const totalGeneral = redondear(subtotal + iva);

  return {
    subtotal,
    porcentajeIVA: porcentaje,
    iva,
    totalGeneral,
  };
};

// ==========================================
// OBTENER CLIENTE
// ==========================================

const buscarCliente = async (idCliente) => {
  if (!idCliente) return null;

  return Cliente.findOne({
    idCliente: String(idCliente).trim().toUpperCase(),
  });
};

// ==========================================
// OBTENER PROYECTO PERTENECIENTE A CLIENTE
// ==========================================

const buscarProyectoCliente = async (idProyecto, idCliente) => {
  if (!idProyecto || !idCliente) return null;

  return Proyecto.findOne({
    idProyecto: String(idProyecto).trim().toUpperCase(),
    idCliente,
  });
};

// ==========================================
// ACTUALIZAR MONTO CONTRATADO DEL PROYECTO
// ==========================================

const actualizarMontoProyecto = async (idProyecto) => {
  if (!idProyecto) return null;

  const proyecto = await Proyecto.findById(idProyecto);

  if (!proyecto) return null;

  const cotizacionAceptada = await Cotizacion.findOne({
    idProyecto: proyecto._id,
    estado: "Aceptada",
  }).sort({
    fecha: -1,
    createdAt: -1,
    _id: -1,
  });

  proyecto.montoContratado = cotizacionAceptada
    ? redondear(cotizacionAceptada.totalGeneral)
    : 0;

  await proyecto.save();

  return proyecto;
};

// ==========================================
// VALIDAR ESTADO
// ==========================================

const validarEstado = (estado) => {
  return estadosPermitidos.includes(estado);
};

// ==========================================
// POPULATE COMPLETO PARA DOCUMENTOS
// ==========================================

const popularDatosCotizacion = (consulta) => {
  return consulta
    .populate("idCliente", CAMPOS_CLIENTE)
    .populate("idProyecto", CAMPOS_PROYECTO);
};

// ==========================================
// CREAR COTIZACIÓN
// ==========================================

const crearCotizacion = async (req, res) => {
  try {
    const {
      idCliente,
      idProyecto,
      conceptos,
      porcentajeIVA = 13,
      fecha,
      estado = "Borrador",
      anticipo = "",
      entrega = "",
      validez = "",
    } = req.body;

    if (!idCliente) {
      return res.status(400).json({
        success: false,
        message: "Debés seleccionar un cliente.",
      });
    }

    if (!validarEstado(estado)) {
      return res.status(400).json({
        success: false,
        message: "El estado de la cotización no es válido.",
      });
    }

    const cliente = await buscarCliente(idCliente);

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "El cliente seleccionado no existe.",
      });
    }

    let proyecto = null;

    if (idProyecto) {
      proyecto = await buscarProyectoCliente(
        idProyecto,
        cliente._id
      );

      if (!proyecto) {
        return res.status(404).json({
          success: false,
          message: "El proyecto no existe o no pertenece a este cliente.",
        });
      }
    }

    let fechaValidada;

    if (fecha !== undefined) {
      fechaValidada = validarFecha(fecha);

      if (!fechaValidada) {
        return res.status(400).json({
          success: false,
          message: "La fecha de la cotización no es válida.",
        });
      }
    }

    const conceptosCalculados = calcularConceptos(conceptos);

    const totales = calcularTotales(
      conceptosCalculados,
      porcentajeIVA
    );

    const nuevaCotizacion = new Cotizacion({
      idCotizacion: await generateId("COT"),
      idCliente: cliente._id,
      idProyecto: proyecto ? proyecto._id : null,
      conceptos: conceptosCalculados,
      anticipo: limpiarCondicion(anticipo),
      entrega: limpiarCondicion(entrega),
      validez: limpiarCondicion(validez),
      estado,
      ...totales,
      ...(fechaValidada && { fecha: fechaValidada }),
    });

    await nuevaCotizacion.save();

    if (estado === "Aceptada" && proyecto) {
      await actualizarMontoProyecto(proyecto._id);
    }

    const cotizacionGuardada = await popularDatosCotizacion(
      Cotizacion.findById(nuevaCotizacion._id)
    );

    return res.status(201).json({
      success: true,
      message: "Cotización creada correctamente.",
      cotizacion: cotizacionGuardada,
    });
  } catch (error) {
    console.error("Error al crear cotización:", error);

    return res.status(400).json({
      success: false,
      message:
        error.message || "No fue posible crear la cotización.",
    });
  }
};

// ==========================================
// OBTENER TODAS LAS COTIZACIONES
// ==========================================

const obtenerCotizaciones = async (req, res) => {
  try {
    const cotizaciones = await popularDatosCotizacion(
      Cotizacion.find()
    ).sort({
      createdAt: -1,
    });

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

// ==========================================
// OBTENER UNA COTIZACIÓN
// ==========================================

const obtenerCotizacion = async (req, res) => {
  try {
    const cotizacion = await popularDatosCotizacion(
      Cotizacion.findOne({
        idCotizacion: req.params.id,
      })
    );

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

// ==========================================
// OBTENER COTIZACIONES POR CLIENTE
// ==========================================

const obtenerCotizacionesPorCliente = async (req, res) => {
  try {
    const cliente = await buscarCliente(req.params.idCliente);

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado.",
      });
    }

    const cotizaciones = await popularDatosCotizacion(
      Cotizacion.find({
        idCliente: cliente._id,
      })
    ).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      total: cotizaciones.length,
      cotizaciones,
    });
  } catch (error) {
    console.error(
      "Error al consultar cotizaciones del cliente:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "No fue posible consultar las cotizaciones del cliente.",
    });
  }
};

// ==========================================
// HISTORIAL DE COTIZACIONES
// ==========================================

const obtenerHistorialCotizaciones = async (req, res) => {
  try {
    const { cliente } = req.query;

    const filtro = {};

    if (cliente && cliente.trim() !== "") {
      const clienteEncontrado = await buscarCliente(cliente);

      if (!clienteEncontrado) {
        return res.status(404).json({
          success: false,
          message: "No se encontró el cliente indicado.",
        });
      }

      filtro.idCliente = clienteEncontrado._id;
    }

    const cotizaciones = await popularDatosCotizacion(
      Cotizacion.find(filtro)
    ).sort({
      fecha: -1,
      createdAt: -1,
    });

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

// ==========================================
// ACTUALIZAR COTIZACIÓN
// ==========================================

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
      anticipo,
      entrega,
      validez,
    } = req.body;

    const proyectoAnterior = cotizacion.idProyecto
      ? cotizacion.idProyecto.toString()
      : null;

    let clienteId = cotizacion.idCliente;
    let proyectoId = cotizacion.idProyecto;

    if (idCliente !== undefined) {
      const cliente = await buscarCliente(idCliente);

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
        const proyecto = await buscarProyectoCliente(
          idProyecto,
          clienteId
        );

        if (!proyecto) {
          return res.status(404).json({
            success: false,
            message: "El proyecto no existe o no pertenece a este cliente.",
          });
        }

        proyectoId = proyecto._id;
      }
    } else if (
      idCliente !== undefined &&
      clienteId.toString() !== cotizacion.idCliente.toString() &&
      proyectoId
    ) {
      const proyectoActual = await Proyecto.findOne({
        _id: proyectoId,
        idCliente: clienteId,
      });

      if (!proyectoActual) {
        return res.status(400).json({
          success: false,
          message: "Seleccioná un proyecto que pertenezca al nuevo cliente.",
        });
      }
    }

    const nuevoEstado =
      estado !== undefined ? estado : cotizacion.estado;

    if (!validarEstado(nuevoEstado)) {
      return res.status(400).json({
        success: false,
        message: "El estado de la cotización no es válido.",
      });
    }

    let fechaValidada;

    if (fecha !== undefined) {
      fechaValidada = validarFecha(fecha);

      if (!fechaValidada) {
        return res.status(400).json({
          success: false,
          message: "La fecha de la cotización no es válida.",
        });
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

    cotizacion.idCliente = clienteId;
    cotizacion.idProyecto = proyectoId;
    cotizacion.conceptos = conceptosCalculados;
    cotizacion.estado = nuevoEstado;

    Object.assign(cotizacion, totales);

    if (fecha !== undefined) {
      cotizacion.fecha = fechaValidada;
    }

    if (anticipo !== undefined) {
      cotizacion.anticipo = limpiarCondicion(anticipo);
    }

    if (entrega !== undefined) {
      cotizacion.entrega = limpiarCondicion(entrega);
    }

    if (validez !== undefined) {
      cotizacion.validez = limpiarCondicion(validez);
    }

    await cotizacion.save();

    const proyectoNuevoId = proyectoId
      ? proyectoId.toString()
      : null;

    if (
      proyectoAnterior &&
      proyectoAnterior !== proyectoNuevoId
    ) {
      await actualizarMontoProyecto(proyectoAnterior);
    }

    if (proyectoNuevoId) {
      await actualizarMontoProyecto(proyectoNuevoId);
    }

    const cotizacionActualizada = await popularDatosCotizacion(
      Cotizacion.findById(cotizacion._id)
    );

    return res.status(200).json({
      success: true,
      message: "Cotización actualizada correctamente.",
      cotizacion: cotizacionActualizada,
    });
  } catch (error) {
    console.error("Error al actualizar cotización:", error);

    return res.status(400).json({
      success: false,
      message:
        error.message || "No fue posible actualizar la cotización.",
    });
  }
};

// ==========================================
// ELIMINAR COTIZACIÓN
// ==========================================

const eliminarCotizacion = async (req, res) => {
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

    const proyectoId = cotizacion.idProyecto
      ? cotizacion.idProyecto.toString()
      : null;

    await Cotizacion.deleteOne({
      _id: cotizacion._id,
    });

    if (proyectoId) {
      await actualizarMontoProyecto(proyectoId);
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
      error: error.message,
    });
  }
};

// ==========================================
// EXPORTACIONES
// ==========================================

module.exports = {
  crearCotizacion,
  obtenerCotizaciones,
  obtenerCotizacion,
  obtenerCotizacionesPorCliente,
  obtenerHistorialCotizaciones,
  actualizarCotizacion,
  eliminarCotizacion,
};