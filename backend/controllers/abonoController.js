const Abono = require("../models/Abono");
const Proyecto = require("../models/Proyecto");
const Cotizacion = require("../models/Cotizacion");
const generateId = require("../utils/generateId");

// ==========================================
// UTILIDADES
// ==========================================

const redondear = (numero) =>
  Math.round((Number(numero || 0) + Number.EPSILON) * 100) / 100;

const validarTipoPago = (tipoPago) =>
  ["Anticipo", "Abono"].includes(tipoPago);

const validarMonto = (monto) => {
  const numero = Number(monto);

  return Number.isFinite(numero) && numero > 0
    ? redondear(numero)
    : null;
};

const validarFecha = (fecha) => {
  if (!fecha) return null;

  const fechaValidada = new Date(fecha);

  return Number.isNaN(fechaValidada.getTime())
    ? null
    : fechaValidada;
};

// Buscar proyecto mediante su código
const buscarProyecto = async (idProyecto) => {
  return Proyecto.findOne({
    idProyecto: String(idProyecto).trim().toUpperCase(),
  }).populate("idCliente", "idCliente nombre empresa");
};

// Obtener proyecto mediante su ID de MongoDB
const obtenerProyectoPorId = async (id) => {
  return Proyecto.findById(id).populate(
    "idCliente",
    "idCliente nombre empresa"
  );
};

// Obtener monto contratado de referencia
const obtenerMontoReferencia = async (proyecto) => {
  const cotizacionAceptada = await Cotizacion.findOne({
    idProyecto: proyecto._id,
    estado: "Aceptada",
  }).sort({
    fecha: -1,
    createdAt: -1,
  });

  // Si existe una cotización aceptada, esa es la referencia.
  if (cotizacionAceptada) {
    return {
      montoContratado: redondear(cotizacionAceptada.totalGeneral),
      cotizacionReferencia: cotizacionAceptada.idCotizacion,
      origenMonto: "Cotización aceptada",
    };
  }

  return {
    montoContratado: redondear(proyecto.montoContratado),
    cotizacionReferencia: null,
    origenMonto: "Monto registrado en proyecto",
  };
};

// ==========================================
// CALCULAR RESUMEN DE UN PROYECTO
// ==========================================

const calcularResumenProyecto = async (proyecto) => {
  if (!proyecto) return null;

  const [abonos, referencia] = await Promise.all([
    Abono.find({
      idProyecto: proyecto._id,
    }),

    obtenerMontoReferencia(proyecto),
  ]);

  const anticipos = abonos.filter(
    (abono) => abono.tipoPago === "Anticipo"
  );

  // Los registros antiguos sin tipoPago se consideran abonos.
  const pagosAbonos = abonos.filter(
    (abono) => abono.tipoPago !== "Anticipo"
  );

  const totalAnticipos = redondear(
    anticipos.reduce(
      (total, item) => total + Number(item.monto || 0),
      0
    )
  );

  const totalAbonos = redondear(
    pagosAbonos.reduce(
      (total, item) => total + Number(item.monto || 0),
      0
    )
  );

  const totalRecibido = redondear(
    totalAnticipos + totalAbonos
  );

  const montoContratado = referencia.montoContratado;

  const saldoPendiente = redondear(
    Math.max(montoContratado - totalRecibido, 0)
  );

  const excedente = redondear(
    Math.max(totalRecibido - montoContratado, 0)
  );

  const porcentajePagado =
    montoContratado > 0
      ? redondear(
          (totalRecibido / montoContratado) * 100
        )
      : 0;

  return {
    idProyecto: proyecto.idProyecto,
    proyecto: proyecto.proyecto,

    idCliente: proyecto.idCliente?.idCliente || "",
    cliente: proyecto.idCliente?.nombre || "",

    montoContratado,
    cotizacionReferencia: referencia.cotizacionReferencia,
    origenMonto: referencia.origenMonto,

    totalAnticipos,
    totalAbonos,
    totalRecibido,

    // Compatibilidad con otros módulos.
    totalAbonado: totalRecibido,

    saldoPendiente,
    excedente,
    porcentajePagado,

    cantidadAnticipos: anticipos.length,
    cantidadAbonos: pagosAbonos.length,
    cantidadPagos: abonos.length,
  };
};

// ==========================================
// PREPARAR RESPUESTA DE UN ABONO
// ==========================================

const obtenerAbonoCompleto = async (id) => {
  return Abono.findById(id)
    .populate(
      "idProyecto",
      "idProyecto proyecto ubicacion montoContratado"
    )
    .populate(
      "idCliente",
      "idCliente nombre empresa"
    );
};

// ==========================================
// REGISTRAR ABONO O ANTICIPO
// ==========================================

const crearAbono = async (req, res) => {
  try {
    const {
      idProyecto,
      fecha,
      monto,
      tipoPago = "Abono",
      formaPago,
      referencia,
    } = req.body;

    if (!idProyecto || !fecha || !formaPago || monto === undefined) {
      return res.status(400).json({
        success: false,
        message: "Completa todos los campos obligatorios.",
      });
    }

    if (!validarTipoPago(tipoPago)) {
      return res.status(400).json({
        success: false,
        message: "El tipo de pago debe ser Anticipo o Abono.",
      });
    }

    const montoValidado = validarMonto(monto);

    if (montoValidado === null) {
      return res.status(400).json({
        success: false,
        message: "El monto debe ser mayor que cero.",
      });
    }

    const fechaValidada = validarFecha(fecha);

    if (!fechaValidada) {
      return res.status(400).json({
        success: false,
        message: "La fecha del pago no es válida.",
      });
    }

    if (!String(formaPago).trim()) {
      return res.status(400).json({
        success: false,
        message: "La forma de pago es obligatoria.",
      });
    }

    const proyecto = await buscarProyecto(idProyecto);

    if (!proyecto) {
      return res.status(404).json({
        success: false,
        message: "El proyecto seleccionado no existe.",
      });
    }

    if (!proyecto.idCliente) {
      return res.status(400).json({
        success: false,
        message: "El proyecto no tiene un cliente asociado.",
      });
    }

    const nuevoAbono = new Abono({
      idAbono: await generateId("ABO"),
      idProyecto: proyecto._id,
      idCliente: proyecto.idCliente._id,
      fecha: fechaValidada,
      monto: montoValidado,
      tipoPago,
      formaPago: String(formaPago).trim(),
      referencia: String(referencia || "").trim(),
    });

    await nuevoAbono.save();

    const abonoGuardado = await obtenerAbonoCompleto(
      nuevoAbono._id
    );

    const resumen = await calcularResumenProyecto(proyecto);

    return res.status(201).json({
      success: true,
      message: `${tipoPago} registrado correctamente.`,
      abono: abonoGuardado,
      resumen,
    });
  } catch (error) {
    console.error("Error al registrar pago:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible registrar el pago.",
      error: error.message,
    });
  }
};

// ==========================================
// LISTAR TODOS LOS ABONOS
// ==========================================

const obtenerAbonos = async (req, res) => {
  try {
    const { idProyecto } = req.query;

    const filtro = {};

    if (idProyecto) {
      const proyecto = await buscarProyecto(idProyecto);

      if (!proyecto) {
        return res.status(404).json({
          success: false,
          message: "Proyecto no encontrado.",
        });
      }

      filtro.idProyecto = proyecto._id;
    }

    const abonos = await Abono.find(filtro)
      .populate(
        "idProyecto",
        "idProyecto proyecto ubicacion montoContratado"
      )
      .populate(
        "idCliente",
        "idCliente nombre empresa"
      )
      .sort({
        fecha: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      total: abonos.length,
      abonos,
    });
  } catch (error) {
    console.error("Error al obtener pagos:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible obtener los pagos.",
      error: error.message,
    });
  }
};

// ==========================================
// OBTENER UN ABONO
// ==========================================

const obtenerAbono = async (req, res) => {
  try {
    const abono = await Abono.findOne({
      idAbono: req.params.id,
    })
      .populate(
        "idProyecto",
        "idProyecto proyecto ubicacion montoContratado"
      )
      .populate(
        "idCliente",
        "idCliente nombre empresa"
      );

    if (!abono) {
      return res.status(404).json({
        success: false,
        message: "Pago no encontrado.",
      });
    }

    return res.status(200).json({
      success: true,
      abono,
    });
  } catch (error) {
    console.error("Error al obtener pago:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible obtener el pago.",
      error: error.message,
    });
  }
};

// ==========================================
// OBTENER ABONOS POR PROYECTO
// ==========================================

const obtenerAbonosPorProyecto = async (req, res) => {
  try {
    const proyecto = await buscarProyecto(
      req.params.idProyecto
    );

    if (!proyecto) {
      return res.status(404).json({
        success: false,
        message: "Proyecto no encontrado.",
      });
    }

    const [abonos, resumen] = await Promise.all([
      Abono.find({
        idProyecto: proyecto._id,
      })
        .populate(
          "idProyecto",
          "idProyecto proyecto ubicacion montoContratado"
        )
        .populate(
          "idCliente",
          "idCliente nombre empresa"
        )
        .sort({
          fecha: -1,
          createdAt: -1,
        }),

      calcularResumenProyecto(proyecto),
    ]);

    return res.status(200).json({
      success: true,
      total: abonos.length,
      abonos,
      resumen,
    });
  } catch (error) {
    console.error(
      "Error al obtener pagos del proyecto:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "No fue posible obtener los pagos del proyecto.",
      error: error.message,
    });
  }
};

// ==========================================
// RESUMEN GENERAL DE TODOS LOS PROYECTOS
// ==========================================

const obtenerResumenAbonos = async (req, res) => {
  try {
    const proyectos = await Proyecto.find()
      .populate(
        "idCliente",
        "idCliente nombre empresa"
      )
      .sort({
        createdAt: -1,
      });

    const resumenes = await Promise.all(
      proyectos.map((proyecto) =>
        calcularResumenProyecto(proyecto)
      )
    );

    const totalContratado = redondear(
      resumenes.reduce(
        (total, item) => total + item.montoContratado,
        0
      )
    );

    const totalAnticipos = redondear(
      resumenes.reduce(
        (total, item) => total + item.totalAnticipos,
        0
      )
    );

    const totalAbonos = redondear(
      resumenes.reduce(
        (total, item) => total + item.totalAbonos,
        0
      )
    );

    const totalRecibido = redondear(
      totalAnticipos + totalAbonos
    );

    const totalPendiente = redondear(
      resumenes.reduce(
        (total, item) => total + item.saldoPendiente,
        0
      )
    );

    const totalExcedente = redondear(
      resumenes.reduce(
        (total, item) => total + item.excedente,
        0
      )
    );

    return res.status(200).json({
      success: true,

      resumenGeneral: {
        totalContratado,
        totalAnticipos,
        totalAbonos,
        totalRecibido,

        // Compatibilidad con el frontend.
        totalAbonado: totalRecibido,

        totalPendiente,
        totalExcedente,
        cantidadProyectos: proyectos.length,
      },

      proyectos: resumenes,
    });
  } catch (error) {
    console.error(
      "Error al obtener resumen de pagos:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "No fue posible obtener el resumen de pagos.",
      error: error.message,
    });
  }
};

// ==========================================
// ACTUALIZAR ABONO O ANTICIPO
// ==========================================

const actualizarAbono = async (req, res) => {
  try {
    const abono = await Abono.findOne({
      idAbono: req.params.id,
    });

    if (!abono) {
      return res.status(404).json({
        success: false,
        message: "Pago no encontrado.",
      });
    }

    const {
      idProyecto,
      fecha,
      monto,
      tipoPago,
      formaPago,
      referencia,
    } = req.body;

    // Guardamos el proyecto anterior antes de modificar el abono.
    const idProyectoAnterior = String(abono.idProyecto);

    const proyectoAnterior = await obtenerProyectoPorId(
      idProyectoAnterior
    );

    if (!proyectoAnterior) {
      return res.status(404).json({
        success: false,
        message: "El proyecto original del pago no existe.",
      });
    }

    let proyectoNuevo = proyectoAnterior;

    // Si se seleccionó otro proyecto, actualizamos su relación.
    if (
      idProyecto !== undefined &&
      idProyecto !== proyectoAnterior.idProyecto
    ) {
      proyectoNuevo = await buscarProyecto(idProyecto);

      if (!proyectoNuevo) {
        return res.status(404).json({
          success: false,
          message: "El proyecto seleccionado no existe.",
        });
      }

      if (!proyectoNuevo.idCliente) {
        return res.status(400).json({
          success: false,
          message: "El proyecto no tiene un cliente asociado.",
        });
      }

      abono.idProyecto = proyectoNuevo._id;
      abono.idCliente = proyectoNuevo.idCliente._id;
    }

    if (tipoPago !== undefined) {
      if (!validarTipoPago(tipoPago)) {
        return res.status(400).json({
          success: false,
          message: "El tipo de pago debe ser Anticipo o Abono.",
        });
      }

      abono.tipoPago = tipoPago;
    }

    if (fecha !== undefined) {
      const fechaValidada = validarFecha(fecha);

      if (!fechaValidada) {
        return res.status(400).json({
          success: false,
          message: "La fecha no es válida.",
        });
      }

      abono.fecha = fechaValidada;
    }

    if (monto !== undefined) {
      const montoValidado = validarMonto(monto);

      if (montoValidado === null) {
        return res.status(400).json({
          success: false,
          message: "El monto debe ser mayor que cero.",
        });
      }

      abono.monto = montoValidado;
    }

    if (formaPago !== undefined) {
      if (!String(formaPago).trim()) {
        return res.status(400).json({
          success: false,
          message: "La forma de pago es obligatoria.",
        });
      }

      abono.formaPago = String(formaPago).trim();
    }

    if (referencia !== undefined) {
      abono.referencia = String(referencia || "").trim();
    }

    await abono.save();

    const abonoActualizado = await obtenerAbonoCompleto(
      abono._id
    );

    // Recalcular el proyecto anterior y el nuevo.
    const resumenAnterior = await calcularResumenProyecto(
      proyectoAnterior
    );

    const cambioProyecto =
      idProyectoAnterior !== String(proyectoNuevo._id);

    const resumenNuevo = cambioProyecto
      ? await calcularResumenProyecto(proyectoNuevo)
      : resumenAnterior;

    return res.status(200).json({
      success: true,
      message: "Pago actualizado correctamente.",
      abono: abonoActualizado,

      // Resumen del proyecto al que pertenece actualmente.
      resumen: resumenNuevo,

      // Permite actualizar también el proyecto anterior.
      resumenAnterior: cambioProyecto
        ? resumenAnterior
        : null,

      resumenes: cambioProyecto
        ? [resumenAnterior, resumenNuevo]
        : [resumenNuevo],
    });
  } catch (error) {
    console.error("Error al actualizar pago:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible actualizar el pago.",
      error: error.message,
    });
  }
};

// ==========================================
// ELIMINAR ABONO O ANTICIPO
// ==========================================

const eliminarAbono = async (req, res) => {
  try {
    const abono = await Abono.findOne({
      idAbono: req.params.id,
    });

    if (!abono) {
      return res.status(404).json({
        success: false,
        message: "Pago no encontrado.",
      });
    }

    const proyecto = await obtenerProyectoPorId(
      abono.idProyecto
    );

    await abono.deleteOne();

    const resumen = proyecto
      ? await calcularResumenProyecto(proyecto)
      : null;

    return res.status(200).json({
      success: true,
      message: "Pago eliminado correctamente.",
      resumen,
    });
  } catch (error) {
    console.error("Error al eliminar pago:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible eliminar el pago.",
      error: error.message,
    });
  }
};

// ==========================================
// EXPORTACIONES
// ==========================================

module.exports = {
  crearAbono,
  obtenerAbonos,
  obtenerAbono,
  obtenerAbonosPorProyecto,
  obtenerResumenAbonos,
  actualizarAbono,
  eliminarAbono,
};