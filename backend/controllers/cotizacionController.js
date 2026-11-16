
const Cotizacion = require("../models/Cotizacion");
const Cliente = require("../models/Cliente");
const Proyecto = require("../models/Proyecto");
const generateId = require("../utils/generateId");

// ==========================================
// CONFIGURACIÓN Y UTILIDADES
// ==========================================

const estadosPermitidos = [
  "Borrador",
  "Enviada",
  "Aceptada",
  "Rechazada",
];

const CAMPOS_CLIENTE =
  "idCliente nombre empresa telefono correo direccion subdireccion registroFiscal nit atencionA";

const CAMPOS_PROYECTO =
  "idProyecto proyecto nombre ubicacion estado";

const redondear = (numero) =>
  Math.round((Number(numero || 0) + Number.EPSILON) * 100) / 100;

const capitalizarPalabras = (texto = "") =>
  String(texto).replace(
    /(^|[\s])(\p{L})/gu,
    (coincidencia, espacio, letra) =>
      espacio + letra.toLocaleUpperCase("es-SV")
  );

const limpiarTexto = (valor = "") =>
  String(valor)
    .replace(/[^\p{L}\p{N}\s.,&'()/%#-]/gu, "")
    .trim();

const limpiarCondicion = (valor, maximo) => {
  if (valor === undefined || valor === null) return "";

  const texto = String(valor).trim();

  if (texto.length > maximo) {
    throw new Error(`El texto no puede superar ${maximo} caracteres.`);
  }

  return capitalizarPalabras(texto);
};

const validarEstado = (estado) =>
  estadosPermitidos.includes(estado);

const validarFecha = (fecha) => {
  if (!fecha) return null;

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

const esErrorValidacion = (error) =>
  error.name === "ValidationError" ||
  error.name === "CastError" ||
  error.name === "MongoServerError" && error.code === 11000 ||
  error.code === 11000;

// ==========================================
// CALCULAR CONCEPTOS
// ==========================================

const calcularConceptos = (conceptos) => {
  if (!Array.isArray(conceptos) || conceptos.length === 0) {
    throw new Error("Agrega al menos un concepto a la cotización.");
  }

  if (conceptos.length > 100) {
    throw new Error("Una cotización no puede tener más de 100 conceptos.");
  }

  return conceptos.map((concepto, indice) => {
    const descripcionOriginal = limpiarTexto(
      concepto.descripcion || ""
    );

    const descripcion = capitalizarPalabras(descripcionOriginal);
    const cantidad = Number(concepto.cantidad);
    const precioUnitario = Number(concepto.precioUnitario);

    if (descripcion.length < 3 || descripcion.length > 200) {
      throw new Error(
        `La descripción del concepto ${indice + 1} debe tener entre 3 y 200 caracteres.`
      );
    }

    if (
      !Number.isFinite(cantidad) ||
      cantidad <= 0 ||
      cantidad > 1000000
    ) {
      throw new Error(
        `La cantidad del concepto ${indice + 1} debe ser mayor que cero.`
      );
    }

    if (
      !Number.isFinite(precioUnitario) ||
      precioUnitario < 0 ||
      precioUnitario > 100000000
    ) {
      throw new Error(
        `El precio del concepto ${indice + 1} no es válido.`
      );
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
  const porcentaje = Number(porcentajeIVA);

  if (
    !Number.isFinite(porcentaje) ||
    porcentaje < 0 ||
    porcentaje > 100
  ) {
    throw new Error(
      "El porcentaje de IVA debe estar entre 0 y 100."
    );
  }

  const subtotal = redondear(
    conceptos.reduce(
      (acumulado, concepto) => acumulado + concepto.total,
      0
    )
  );

  const iva = redondear(subtotal * (porcentaje / 100));
  const totalGeneral = redondear(subtotal + iva);

  return {
    subtotal,
    porcentajeIVA: porcentaje,
    iva,
    totalGeneral,
  };
};

// ==========================================
// BUSCAR CLIENTE POR ID O CÓDIGO
// ==========================================

const buscarCliente = async (idCliente) => {
  if (!idCliente) return null;

  const identificador = String(idCliente).trim();

  // Primero intenta buscar por ObjectId de MongoDB.
  if (/^[a-fA-F0-9]{24}$/.test(identificador)) {
    const clientePorId = await Cliente.findById(identificador);

    if (clientePorId) {
      return clientePorId;
    }
  }

  // Si no es ObjectId o no existe, busca por código.
  return Cliente.findOne({
    idCliente: identificador.toUpperCase(),
  });
};

// ==========================================
// BUSCAR PROYECTO POR ID O CÓDIGO
// VALIDANDO QUE PERTENEZCA AL CLIENTE
// ==========================================

const buscarProyectoCliente = async (idProyecto, idCliente) => {
  if (!idProyecto || !idCliente) return null;

  const identificador = String(idProyecto).trim();

  // Buscar por ObjectId de MongoDB.
  if (/^[a-fA-F0-9]{24}$/.test(identificador)) {
    const proyectoPorId = await Proyecto.findOne({
      _id: identificador,
      idCliente,
    });

    if (proyectoPorId) {
      return proyectoPorId;
    }
  }

  // Buscar por código personalizado del proyecto.
  return Proyecto.findOne({
    idProyecto: identificador.toUpperCase(),
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
// POPULAR DATOS PARA RESPUESTAS
// ==========================================

const popularDatosCotizacion = (consulta) =>
  consulta
    .populate("idCliente", CAMPOS_CLIENTE)
    .populate("idProyecto", CAMPOS_PROYECTO);

// ==========================================
// CREAR COTIZACIÓN O COPIA
// ==========================================

const crearCotizacion = async (req, res) => {
  try {
    const {
      idCliente,
      idProyecto,
      conceptos,
      porcentajeIVA = 13,
      fecha,
      anticipo = "",
      entrega = "",
      validez = "",
      cotizacionOrigen,
    } = req.body;

    if (!idCliente) {
      return res.status(400).json({
        success: false,
        message: "Debes seleccionar un cliente.",
      });
    }

    // Identificar si es una copia.
    let esCopia = false;
    let codigoCotizacionOrigen = null;

    if (cotizacionOrigen) {
      const codigo = String(cotizacionOrigen).trim();

      const cotizacionFuente = await Cotizacion.findOne({
        idCotizacion: codigo,
      });

      if (!cotizacionFuente) {
        return res.status(404).json({
          success: false,
          message: "No se encontró la cotización que deseas copiar.",
        });
      }

      esCopia = true;
      codigoCotizacionOrigen = cotizacionFuente.idCotizacion;
    }

    // Las copias siempre empiezan como borrador.
    const estado = "Borrador";

    // Buscar cliente por MongoDB ID o código.
    const cliente = await buscarCliente(idCliente);

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "El cliente seleccionado no existe.",
      });
    }

    // Validar proyecto.
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

    // Validar fecha.
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

    // Calcular conceptos y totales en el servidor.
    const conceptosCalculados = calcularConceptos(conceptos);

    const totales = calcularTotales(
      conceptosCalculados,
      porcentajeIVA
    );

    // Crear cotización.
    const nuevaCotizacion = new Cotizacion({
      idCotizacion: await generateId("COT"),

      esCopia,
      cotizacionOrigen: codigoCotizacionOrigen,

      idCliente: cliente._id,
      idProyecto: proyecto ? proyecto._id : null,

      conceptos: conceptosCalculados,

      anticipo: limpiarCondicion(anticipo, 500),
      entrega: limpiarCondicion(entrega, 200),
      validez: limpiarCondicion(validez, 100),

      estado,
      ...totales,

      ...(fechaValidada && { fecha: fechaValidada }),
    });

    await nuevaCotizacion.save();

    // Actualizar monto contratado si corresponde.
    if (estado === "Aceptada" && proyecto) {
      await actualizarMontoProyecto(proyecto._id);
    }

    // Obtener cotización con cliente y proyecto.
    const cotizacionGuardada = await popularDatosCotizacion(
      Cotizacion.findById(nuevaCotizacion._id)
    );

    return res.status(201).json({
      success: true,
      message: esCopia
        ? "Copia de cotización creada correctamente."
        : "Cotización creada correctamente.",
      cotizacion: cotizacionGuardada,
    });
  } catch (error) {
    console.error("Error al crear cotización:", error);

    return res.status(
      esErrorValidacion(error) ? 400 : 500
    ).json({
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
    ).sort({ createdAt: -1 });

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
    ).sort({ createdAt: -1 });

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

    // Actualizar cliente.
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

    // Actualizar proyecto.
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
          message: "Selecciona un proyecto que pertenezca al nuevo cliente.",
        });
      }
    }

    // Validar estado.
    const nuevoEstado =
      estado !== undefined ? estado : cotizacion.estado;

    if (!validarEstado(nuevoEstado)) {
      return res.status(400).json({
        success: false,
        message: "El estado de la cotización no es válido.",
      });
    }

    // Validar fecha.
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

    // Calcular conceptos.
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

    // Aplicar cambios.
    cotizacion.idCliente = clienteId;
    cotizacion.idProyecto = proyectoId;
    cotizacion.conceptos = conceptosCalculados;
    cotizacion.estado = nuevoEstado;

    Object.assign(cotizacion, totales);

    if (fecha !== undefined) {
      cotizacion.fecha = fechaValidada;
    }

    if (anticipo !== undefined) {
      cotizacion.anticipo = limpiarCondicion(anticipo, 500);
    }

    if (entrega !== undefined) {
      cotizacion.entrega = limpiarCondicion(entrega, 200);
    }

    if (validez !== undefined) {
      cotizacion.validez = limpiarCondicion(validez, 100);
    }

    // Se conserva la identificación de la copia.
    await cotizacion.save();

    const proyectoNuevoId = proyectoId
      ? proyectoId.toString()
      : null;

    // Actualizar proyecto anterior si cambió.
    if (
      proyectoAnterior &&
      proyectoAnterior !== proyectoNuevoId
    ) {
      await actualizarMontoProyecto(proyectoAnterior);
    }

    // Actualizar proyecto actual.
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

    return res.status(
      esErrorValidacion(error) ? 400 : 500
    ).json({
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
