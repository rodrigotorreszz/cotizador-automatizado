const Cliente = require("../models/Cliente");
const Proyecto = require("../models/Proyecto");
const Cotizacion = require("../models/Cotizacion");
const Abono = require("../models/Abono");

// ========================================
// FUNCIONES AUXILIARES
// ========================================

const redondear = (numero) =>
  Math.round((Number(numero || 0) + Number.EPSILON) * 100) / 100;

const obtenerId = (referencia) => {
  if (!referencia) return null;

  return String(referencia._id || referencia);
};

const calcularPagos = (pagos) => {
  const anticipos = pagos
    .filter((pago) => pago.tipoPago === "Anticipo")
    .reduce((total, pago) => total + Number(pago.monto || 0), 0);

  const abonos = pagos
    .filter((pago) => pago.tipoPago !== "Anticipo")
    .reduce((total, pago) => total + Number(pago.monto || 0), 0);

  return {
    anticipos: redondear(anticipos),
    abonos: redondear(abonos),
    totalRecibido: redondear(anticipos + abonos),
  };
};

// ========================================
// ESTADO ACTUAL POR CLIENTE
// ========================================

const obtenerEstadoClientes = async (req, res) => {
  try {
    const [clientes, proyectos, cotizaciones, abonos] =
      await Promise.all([
        Cliente.find().sort({ nombre: 1 }),

        Proyecto.find().populate(
          "idCliente",
          "idCliente nombre"
        ),

        Cotizacion.find({ estado: "Aceptada" })
          .populate("idCliente", "idCliente nombre")
          .populate("idProyecto", "idProyecto proyecto"),

        Abono.find()
          .populate("idProyecto", "idProyecto proyecto")
          .populate("idCliente", "idCliente nombre")
          .sort({ fecha: -1, createdAt: -1 }),
      ]);

    // ========================================
    // COTIZACIONES ACEPTADAS POR PROYECTO
    // ========================================

    const cotizacionPorProyecto = new Map();

    const cotizacionesConProyecto = cotizaciones
      .filter((cotizacion) => cotizacion.idProyecto)
      .sort((a, b) => {
        const fechaA = new Date(
          a.fecha || a.createdAt || 0
        ).getTime();

        const fechaB = new Date(
          b.fecha || b.createdAt || 0
        ).getTime();

        return fechaB - fechaA;
      });

    cotizacionesConProyecto.forEach((cotizacion) => {
      const idProyecto = obtenerId(cotizacion.idProyecto);

      if (
        idProyecto &&
        !cotizacionPorProyecto.has(idProyecto)
      ) {
        cotizacionPorProyecto.set(idProyecto, cotizacion);
      }
    });

    // Cotizaciones aceptadas sin proyecto asociado.
    const cotizacionesSinProyecto = cotizaciones.filter(
      (cotizacion) => !cotizacion.idProyecto
    );

    // ========================================
    // PROCESAR CLIENTES
    // ========================================

    const resultado = clientes.map((cliente) => {
      const idClienteActual = String(cliente._id);

      const proyectosCliente = proyectos.filter(
        (proyecto) =>
          obtenerId(proyecto.idCliente) === idClienteActual
      );

      const abonosCliente = abonos.filter(
        (abono) =>
          obtenerId(abono.idCliente) === idClienteActual
      );

      const cotizacionesIndependientes =
        cotizacionesSinProyecto.filter(
          (cotizacion) =>
            obtenerId(cotizacion.idCliente) === idClienteActual
        );

      let totalContratado = 0;

      // ========================================
      // PROCESAR PROYECTOS DEL CLIENTE
      // ========================================

      const detalleProyectos = proyectosCliente.map(
        (proyecto) => {
          const idProyectoActual = String(proyecto._id);

          const cotizacionAceptada =
            cotizacionPorProyecto.get(idProyectoActual);

          const montoCotizacion = Number(
            cotizacionAceptada?.totalGeneral || 0
          );

          const montoProyecto = Number(
            proyecto.montoContratado || 0
          );

          // Priorizar cotización aceptada.
          // Si no existe, utilizar montoContratado del proyecto.
          const montoContratado =
            montoCotizacion > 0
              ? montoCotizacion
              : montoProyecto;

          const origenMonto =
            montoCotizacion > 0
              ? "Cotización aceptada"
              : montoProyecto > 0
                ? "Monto registrado en proyecto"
                : "Sin monto contratado de referencia";

          totalContratado += montoContratado;

          // Obtener todos los pagos del proyecto.
          const pagosProyecto = abonos.filter(
            (abono) =>
              obtenerId(abono.idProyecto) === idProyectoActual
          );

          const resumenPagos = calcularPagos(pagosProyecto);

          const totalRecibido = resumenPagos.totalRecibido;

          // Saldo y excedente.
          const saldoPendiente = Math.max(
            montoContratado - totalRecibido,
            0
          );

          const excedente = Math.max(
            totalRecibido - montoContratado,
            0
          );

          // Porcentaje de avance.
          const porcentajePagado =
            montoContratado > 0
              ? redondear(
                  (totalRecibido / montoContratado) * 100
                )
              : 0;

          // Historial de pagos individuales.
          const pagos = pagosProyecto.map((pago) => ({
            _id: pago._id,
            idAbono: pago.idAbono,
            fecha: pago.fecha,
            monto: redondear(pago.monto),
            tipoPago: pago.tipoPago || "Abono",
            formaPago: pago.formaPago,
            referencia: pago.referencia || "",
          }));

          return {
            _id: proyecto._id,
            idProyecto: proyecto.idProyecto,
            proyecto: proyecto.proyecto,
            ubicacion: proyecto.ubicacion,
            estado: proyecto.estado,

            montoContratado: redondear(montoContratado),

            origenMonto,

            cotizacionReferencia:
              cotizacionAceptada?.idCotizacion || null,

            anticipos: resumenPagos.anticipos,
            abonos: resumenPagos.abonos,
            totalRecibido,

            saldoPendiente: redondear(saldoPendiente),
            excedente: redondear(excedente),
            porcentajePagado,

            cantidadPagos: pagos.length,
            pagos,
          };
        }
      );

      // ========================================
      // COTIZACIONES SIN PROYECTO
      // ========================================

      const totalCotizacionesSinProyecto =
        cotizacionesIndependientes.reduce(
          (total, cotizacion) =>
            total + Number(cotizacion.totalGeneral || 0),
          0
        );

      totalContratado += totalCotizacionesSinProyecto;

      // ========================================
      // RESUMEN GENERAL DEL CLIENTE
      // ========================================

      const resumenCliente = calcularPagos(abonosCliente);

      const totalRecibido = resumenCliente.totalRecibido;

      const saldoPendiente = Math.max(
        totalContratado - totalRecibido,
        0
      );

      const excedente = Math.max(
        totalRecibido - totalContratado,
        0
      );

      const porcentajePagado =
        totalContratado > 0
          ? redondear(
              (totalRecibido / totalContratado) * 100
            )
          : 0;

      // Último pago registrado.
      const fechasPagos = abonosCliente
        .map((pago) => pago.fecha)
        .filter(Boolean)
        .sort(
          (a, b) => new Date(b) - new Date(a)
        );

      // Proyectos pendientes.
      const proyectosPendientes = proyectosCliente.filter(
        (proyecto) =>
          ["Pendiente", "En proceso"].includes(proyecto.estado)
      ).length;

      // ========================================
      // INFORMACIÓN DEL CLIENTE
      // ========================================

      return {
        _id: cliente._id,
        idCliente: cliente.idCliente,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        correo: cliente.correo,

        // FECHAS DE REGISTRO Y ACTUALIZACIÓN
        createdAt: cliente.createdAt || null,
        updatedAt: cliente.updatedAt || null,

        // INFORMACIÓN FINANCIERA
        totalContratado: redondear(totalContratado),

        anticipos: resumenCliente.anticipos,
        abonos: resumenCliente.abonos,
        totalRecibido,

        saldoPendiente: redondear(saldoPendiente),
        excedente: redondear(excedente),
        porcentajePagado,

        // PROYECTOS
        proyectosPendientes,
        totalProyectos: proyectosCliente.length,

        // ÚLTIMO PAGO
        ultimoAbono: fechasPagos[0] || null,

        // COTIZACIONES SIN PROYECTO
        cotizacionesSinProyecto:
          cotizacionesIndependientes.map((cotizacion) => ({
            idCotizacion: cotizacion.idCotizacion,
            fecha: cotizacion.fecha,
            totalGeneral: redondear(
              cotizacion.totalGeneral
            ),
          })),

        // DETALLE DE PROYECTOS
        proyectos: detalleProyectos,
      };
    });

    // ========================================
    // RESUMEN GENERAL DEL SISTEMA
    // ========================================

    const resumen = {
      totalContratado: redondear(
        resultado.reduce(
          (suma, cliente) =>
            suma + cliente.totalContratado,
          0
        )
      ),

      totalAnticipos: redondear(
        resultado.reduce(
          (suma, cliente) => suma + cliente.anticipos,
          0
        )
      ),

      totalAbonos: redondear(
        resultado.reduce(
          (suma, cliente) => suma + cliente.abonos,
          0
        )
      ),

      totalRecibido: redondear(
        resultado.reduce(
          (suma, cliente) => suma + cliente.totalRecibido,
          0
        )
      ),

      saldoPendiente: redondear(
        resultado.reduce(
          (suma, cliente) => suma + cliente.saldoPendiente,
          0
        )
      ),

      excedente: redondear(
        resultado.reduce(
          (suma, cliente) => suma + cliente.excedente,
          0
        )
      ),
    };

    return res.status(200).json({
      success: true,
      total: resultado.length,
      resumen,
      clientes: resultado,
    });

  } catch (error) {
    console.error(
      "Error al obtener el estado de los clientes:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Error al generar el estado actual de los clientes",
      error: error.message,
    });
  }
};

module.exports = {
  obtenerEstadoClientes,
};
