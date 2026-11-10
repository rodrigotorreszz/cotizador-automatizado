
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  TrendingUp,
  Wallet,
  CircleDollarSign,
  Search,
  RefreshCw,
  AlertCircle,
  FileText,
  Users,
  FolderKanban,
} from "lucide-react";

import api from "../services/api";
import "../styles/resumenAnual.css";

// ======================================
// UTILIDADES
// ======================================

const obtenerLista = (data, propiedad) => {
  if (Array.isArray(data)) return data;
  return data?.[propiedad] || [];
};

const obtenerId = (referencia) => {
  if (!referencia) return "";

  if (typeof referencia === "object") {
    return String(
      referencia._id ||
      referencia.id ||
      referencia.idCliente ||
      referencia.idProyecto ||
      ""
    );
  }

  return String(referencia);
};

const obtenerFecha = (fecha) => {
  if (!fecha) return null;

  const resultado = new Date(fecha);

  return Number.isNaN(resultado.getTime())
    ? null
    : resultado;
};

const estaDentroDelAnio = (fecha, anio) => {
  const date = obtenerFecha(fecha);

  return (
    date &&
    date.getFullYear() === Number(anio)
  );
};

const fechaHasta = (fecha, limite) => {
  const date = obtenerFecha(fecha);

  return date && date <= limite;
};

const formatoMoneda = (valor) => {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor || 0));
};

const redondear = (numero) => {
  return Math.round(
    (Number(numero || 0) + Number.EPSILON) * 100
  ) / 100;
};

const obtenerNombreCliente = (cliente) => {
  if (!cliente) return "Cliente sin nombre";

  return (
    cliente.nombre ||
    cliente.nombreCompleto ||
    cliente.razonSocial ||
    cliente.empresa ||
    "Cliente sin nombre"
  );
};

// ======================================
// COMPONENTE PRINCIPAL
// ======================================

function ResumenAnual() {
  const anioActual = new Date().getFullYear();

  const [anio, setAnio] = useState(String(anioActual));
  const [busqueda, setBusqueda] = useState("");

  const [clientes, setClientes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [abonos, setAbonos] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ======================================
  // CARGAR INFORMACIÓN
  // ======================================

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const [
        resClientes,
        resProyectos,
        resCotizaciones,
        resAbonos,
      ] = await Promise.all([
        api.get("/clientes"),
        api.get("/proyectos"),
        api.get("/cotizaciones"),
        api.get("/abonos"),
      ]);

      setClientes(
        obtenerLista(resClientes.data, "clientes")
      );

      setProyectos(
        obtenerLista(resProyectos.data, "proyectos")
      );

      setCotizaciones(
        obtenerLista(resCotizaciones.data, "cotizaciones")
      );

      setAbonos(
        obtenerLista(resAbonos.data, "abonos")
      );

    } catch (err) {
      console.error(
        "Error al cargar el resumen anual:",
        err
      );

      setError(
        "No fue posible cargar la información anual."
      );

    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ======================================
  // CALCULAR RESUMEN ANUAL
  // ======================================

  const resumen = useMemo(() => {
    const anioSeleccionado = Number(anio);

    const inicioAnio = new Date(
      anioSeleccionado,
      0,
      1,
      0,
      0,
      0,
      0
    );

    const finAnio = new Date(
      anioSeleccionado,
      11,
      31,
      23,
      59,
      59,
      999
    );

    const hoy = new Date();

    // ==================================
    // MAPA DE CLIENTES
    // ==================================

    const mapaClientes = new Map();

    clientes.forEach((cliente) => {
      const id = obtenerId(cliente._id);

      const codigo = obtenerId(
        cliente.idCliente
      );

      if (id) {
        mapaClientes.set(id, cliente);
      }

      if (codigo) {
        mapaClientes.set(codigo, cliente);
      }
    });

    const resolverCliente = (referencia) => {
      const id = obtenerId(referencia);

      if (!id) return null;

      return mapaClientes.get(id) || null;
    };

    const obtenerClaveCliente = (referencia) => {
      const cliente = resolverCliente(referencia);

      if (cliente) {
        return obtenerId(cliente._id);
      }

      return obtenerId(referencia);
    };

    // ==================================
    // MAPA DE PROYECTOS
    // ==================================

    const mapaProyectos = new Map();

    proyectos.forEach((proyecto) => {
      const id = obtenerId(proyecto._id);
      const codigo = obtenerId(proyecto.idProyecto);

      if (id) {
        mapaProyectos.set(id, proyecto);
      }

      if (codigo) {
        mapaProyectos.set(codigo, proyecto);
      }
    });

    // ==================================
    // COTIZACIONES ACEPTADAS
    // ==================================

    const cotizacionesAceptadas = cotizaciones
      .filter(
        (cotizacion) =>
          String(cotizacion.estado || "")
            .trim()
            .toLowerCase() === "aceptada"
      )
      .sort((a, b) => {
        const fechaA =
          obtenerFecha(a.fecha || a.createdAt)?.getTime() || 0;

        const fechaB =
          obtenerFecha(b.fecha || b.createdAt)?.getTime() || 0;

        return fechaB - fechaA;
      });

    // Obtener la cotización aceptada más reciente
    // para cada proyecto.

    const cotizacionPorProyecto = new Map();

    cotizacionesAceptadas.forEach((cotizacion) => {
      const idProyecto = obtenerId(
        cotizacion.idProyecto
      );

      if (!idProyecto) return;

      const proyecto = mapaProyectos.get(idProyecto);

      const claveProyecto = proyecto
        ? obtenerId(proyecto._id)
        : idProyecto;

      if (!cotizacionPorProyecto.has(claveProyecto)) {
        cotizacionPorProyecto.set(
          claveProyecto,
          cotizacion
        );
      }
    });

    // ==================================
    // REGISTROS DE CONTRATOS
    // ==================================

    const contratos = [];

    proyectos.forEach((proyecto) => {
      if (
        String(proyecto.estado || "")
          .trim()
          .toLowerCase() === "cancelado"
      ) {
        return;
      }

      const idProyecto = obtenerId(proyecto._id);

      const cotizacion =
        cotizacionPorProyecto.get(idProyecto);

      const montoCotizacion = Number(
        cotizacion?.totalGeneral || 0
      );

      const montoProyecto = Number(
        proyecto.montoContratado || 0
      );

      const monto =
        montoCotizacion > 0
          ? montoCotizacion
          : montoProyecto;

      const fechaContrato =
        cotizacion?.fecha ||
        cotizacion?.createdAt ||
        proyecto.createdAt;

      const referenciaCliente =
        cotizacion?.idCliente ||
        proyecto.idCliente;

      const claveCliente =
        obtenerClaveCliente(referenciaCliente);

      if (!claveCliente || monto <= 0) return;

      contratos.push({
        clienteKey: claveCliente,
        monto,
        fecha: obtenerFecha(fechaContrato),
        proyectoKey: idProyecto,
      });
    });

    // ==================================
    // COTIZACIONES ACEPTADAS SIN PROYECTO
    // ==================================

    cotizacionesAceptadas.forEach((cotizacion) => {
      const idProyecto = obtenerId(
        cotizacion.idProyecto
      );

      if (idProyecto) return;

      const monto = Number(
        cotizacion.totalGeneral || 0
      );

      const claveCliente = obtenerClaveCliente(
        cotizacion.idCliente
      );

      const fecha = obtenerFecha(
        cotizacion.fecha || cotizacion.createdAt
      );

      if (!claveCliente || monto <= 0) return;

      contratos.push({
        clienteKey: claveCliente,
        monto,
        fecha,
        proyectoKey: null,
      });
    });

    // ==================================
    // REGISTROS DE PAGOS
    // ==================================

    const pagos = abonos.map((abono) => {
      const idProyecto = obtenerId(
        abono.idProyecto
      );

      const proyecto = mapaProyectos.get(
        idProyecto
      );

      const referenciaCliente =
        abono.idCliente ||
        proyecto?.idCliente;

      return {
        clienteKey: obtenerClaveCliente(
          referenciaCliente
        ),

        monto: Number(abono.monto || 0),

        tipoPago: String(
          abono.tipoPago || ""
        ).trim().toLowerCase(),

        fecha: obtenerFecha(abono.fecha),
      };
    }).filter(
      (pago) =>
        pago.clienteKey &&
        pago.fecha &&
        pago.monto > 0
    );

    // ==================================
    // PROYECTOS REGISTRADOS POR CLIENTE
    // ==================================

    const proyectosPorCliente = new Map();

    proyectos.forEach((proyecto) => {
      const claveCliente = obtenerClaveCliente(
        proyecto.idCliente
      );

      if (!claveCliente) return;

      if (!proyectosPorCliente.has(claveCliente)) {
        proyectosPorCliente.set(claveCliente, []);
      }

      proyectosPorCliente.get(claveCliente).push(
        proyecto
      );
    });

    // ==================================
    // CONSTRUIR FILAS POR CLIENTE
    // ==================================

    const filas = clientes.map((cliente) => {
      const clienteKey = obtenerId(cliente._id);

      const contratosCliente = contratos.filter(
        (contrato) =>
          contrato.clienteKey === clienteKey
      );

      const pagosCliente = pagos.filter(
        (pago) =>
          pago.clienteKey === clienteKey
      );

      // Contratado dentro del año seleccionado.

      const contratadoAnio = contratosCliente
        .filter((contrato) =>
          estaDentroDelAnio(
            contrato.fecha,
            anioSeleccionado
          )
        )
        .reduce(
          (total, contrato) =>
            total + contrato.monto,
          0
        );

      // Anticipos realizados durante el año.

      const anticiposAnio = pagosCliente
        .filter(
          (pago) =>
            pago.tipoPago === "anticipo" &&
            estaDentroDelAnio(
              pago.fecha,
              anioSeleccionado
            )
        )
        .reduce(
          (total, pago) =>
            total + pago.monto,
          0
        );

      // Abonos realizados durante el año.

      const abonosAnio = pagosCliente
        .filter(
          (pago) =>
            pago.tipoPago === "abono" &&
            estaDentroDelAnio(
              pago.fecha,
              anioSeleccionado
            )
        )
        .reduce(
          (total, pago) =>
            total + pago.monto,
          0
        );

      const cobradoAnio =
        anticiposAnio + abonosAnio;

      // Saldo acumulado al 31 de diciembre
      // del año seleccionado.

      const contratadoHastaCierre =
        contratosCliente
          .filter((contrato) =>
            fechaHasta(
              contrato.fecha,
              finAnio
            )
          )
          .reduce(
            (total, contrato) =>
              total + contrato.monto,
            0
          );

      const pagadoHastaCierre =
        pagosCliente
          .filter((pago) =>
            fechaHasta(
              pago.fecha,
              finAnio
            )
          )
          .reduce(
            (total, pago) =>
              total + pago.monto,
            0
          );

      const saldoCierre =
        contratadoHastaCierre -
        pagadoHastaCierre;

      // Saldo actual a la fecha de consulta.

      const contratadoActual =
        contratosCliente
          .filter((contrato) =>
            fechaHasta(
              contrato.fecha,
              hoy
            )
          )
          .reduce(
            (total, contrato) =>
              total + contrato.monto,
            0
          );

      const pagadoActual =
        pagosCliente
          .filter((pago) =>
            fechaHasta(
              pago.fecha,
              hoy
            )
          )
          .reduce(
            (total, pago) =>
              total + pago.monto,
            0
          );

      const saldoActual =
        contratadoActual - pagadoActual;

      // Proyectos ingresados durante el año.

      const proyectosAnio =
        (proyectosPorCliente.get(clienteKey) || [])
          .filter((proyecto) =>
            estaDentroDelAnio(
              proyecto.createdAt,
              anioSeleccionado
            )
          ).length;

      return {
        id: cliente.idCliente || clienteKey,
        cliente: obtenerNombreCliente(cliente),

        contratadoAnio: redondear(contratadoAnio),
        anticiposAnio: redondear(anticiposAnio),
        abonosAnio: redondear(abonosAnio),
        cobradoAnio: redondear(cobradoAnio),

        saldoCierre: redondear(saldoCierre),
        proyectosAnio,

        saldoActual: redondear(saldoActual),
      };
    });

    // ==================================
    // TOTALES GENERALES
    // ==================================

    const sumar = (propiedad) =>
      redondear(
        filas.reduce(
          (total, fila) =>
            total + fila[propiedad],
          0
        )
      );

    return {
      filas,

      totalContratado: sumar("contratadoAnio"),
      totalAnticipos: sumar("anticiposAnio"),
      totalAbonos: sumar("abonosAnio"),
      totalCobrado: sumar("cobradoAnio"),
      totalSaldoCierre: sumar("saldoCierre"),
      totalProyectos: sumar("proyectosAnio"),
      totalSaldoActual: sumar("saldoActual"),
    };

  }, [
    anio,
    clientes,
    proyectos,
    cotizaciones,
    abonos,
  ]);

  // ======================================
  // FILTRAR CLIENTES
  // ======================================

  const filasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return resumen.filas;

    return resumen.filas.filter((fila) =>
      String(fila.id).toLowerCase().includes(texto) ||
      fila.cliente.toLowerCase().includes(texto)
    );
  }, [resumen.filas, busqueda]);

  // ======================================
  // AÑOS DISPONIBLES
  // ======================================

  const aniosDisponibles = Array.from(
    { length: 7 },
    (_, index) => anioActual - index
  );

  // ======================================
  // RENDERIZADO
  // ======================================

  return (
    <div className="resumen-anual-page">

      {/* ENCABEZADO */}

      <div className="resumen-anual-header">
        <div>
          <span className="resumen-anual-etiqueta">
            CONTROL FINANCIERO
          </span>

          <h1>Resumen anual</h1>

          <p>
            Consulta el comportamiento financiero
            de tus clientes durante cada año.
          </p>
        </div>

        <button
          className="resumen-anual-refresh"
          onClick={cargarDatos}
          disabled={cargando}
        >
          <RefreshCw
            size={17}
            className={cargando ? "girando" : ""}
          />

          Actualizar
        </button>
      </div>

      {/* SELECTOR DE AÑO */}

      <div className="resumen-anual-selector">
        <div className="resumen-anual-selector-icon">
          <CalendarDays size={22} />
        </div>

        <div className="resumen-anual-selector-text">
          <label htmlFor="anio-consulta">
            Año a consultar
          </label>

          <span>
            Selecciona el período que deseas revisar.
          </span>
        </div>

        <select
          id="anio-consulta"
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
        >
          {aniosDisponibles.map((valor) => (
            <option
              key={valor}
              value={valor}
            >
              {valor}
            </option>
          ))}
        </select>
      </div>

      {/* ERROR */}

      {error && (
        <div className="resumen-anual-error">
          <AlertCircle size={19} />
          {error}
        </div>
      )}

      {/* TARJETAS DE RESUMEN */}

      <div className="resumen-anual-cards">

        <div className="resumen-anual-card">
          <div className="resumen-anual-card-icon azul">
            <FileText size={22} />
          </div>

          <div>
            <span>Contratado en el año</span>

            <h2>
              {formatoMoneda(
                resumen.totalContratado
              )}
            </h2>

            <small>
              Contratos registrados en {anio}
            </small>
          </div>
        </div>

        <div className="resumen-anual-card">
          <div className="resumen-anual-card-icon naranja">
            <Wallet size={22} />
          </div>

          <div>
            <span>Anticipos del año</span>

            <h2>
              {formatoMoneda(
                resumen.totalAnticipos
              )}
            </h2>

            <small>
              Anticipos recibidos en {anio}
            </small>
          </div>
        </div>

        <div className="resumen-anual-card">
          <div className="resumen-anual-card-icon celeste">
            <TrendingUp size={22} />
          </div>

          <div>
            <span>Abonos del año</span>

            <h2>
              {formatoMoneda(
                resumen.totalAbonos
              )}
            </h2>

            <small>
              Abonos recibidos en {anio}
            </small>
          </div>
        </div>

        <div className="resumen-anual-card">
          <div className="resumen-anual-card-icon verde">
            <CircleDollarSign size={22} />
          </div>

          <div>
            <span>Cobrado en el año</span>

            <h2>
              {formatoMoneda(
                resumen.totalCobrado
              )}
            </h2>

            <small>
              Anticipos + abonos
            </small>
          </div>
        </div>

      </div>

      {/* SALDOS GENERALES */}

      <div className="resumen-anual-saldos">

        <div className="resumen-anual-saldo-card">
          <div>
            <span>Saldo al 31/12/{anio}</span>

            <h2>
              {formatoMoneda(
                resumen.totalSaldoCierre
              )}
            </h2>

            <small>
              Saldo acumulado al cierre del año
            </small>
          </div>

          <div className="saldo-icono azul">
            <CalendarDays size={25} />
          </div>
        </div>

        <div className="resumen-anual-saldo-card">
          <div>
            <span>Saldo actual</span>

            <h2>
              {formatoMoneda(
                resumen.totalSaldoActual
              )}
            </h2>

            <small>
              Saldo acumulado a la fecha de consulta
            </small>
          </div>

          <div className="saldo-icono verde">
            <CircleDollarSign size={25} />
          </div>
        </div>

      </div>

      {/* TABLA POR CLIENTE */}

      <div className="resumen-anual-tabla-contenedor">

        <div className="resumen-anual-tabla-header">
          <div>
            <h2>Detalle por cliente</h2>

            <p>
              Movimientos y saldos correspondientes al año {anio}.
            </p>
          </div>

          <div className="resumen-anual-busqueda">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar cliente o ID..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
            />
          </div>
        </div>

        {cargando ? (
          <div className="resumen-anual-vacio">
            <RefreshCw
              size={28}
              className="girando"
            />

            <p>Cargando información anual...</p>
          </div>
        ) : filasFiltradas.length === 0 ? (
          <div className="resumen-anual-vacio">
            <Users size={35} />

            <p>
              No se encontraron clientes para esta búsqueda.
            </p>
          </div>
        ) : (
          <div className="resumen-anual-tabla-scroll">
            <table className="resumen-anual-tabla">

              <thead>
                <tr>
                  <th>ID Cliente</th>
                  <th>Cliente</th>
                  <th>Contratado año</th>
                  <th>Anticipos año</th>
                  <th>Abonos año</th>
                  <th>Cobrado año</th>
                  <th>Saldo al 31/12</th>
                  <th>Proyectos año</th>
                  <th>Saldo actual</th>
                </tr>
              </thead>

              <tbody>
                {filasFiltradas.map((fila, index) => (
                  <tr key={`${fila.id}-${index}`}>
                    <td>
                      <span className="resumen-anual-id">
                        {fila.id}
                      </span>
                    </td>

                    <td className="resumen-anual-nombre">
                      {fila.cliente}
                    </td>

                    <td>
                      {formatoMoneda(
                        fila.contratadoAnio
                      )}
                    </td>

                    <td>
                      {formatoMoneda(
                        fila.anticiposAnio
                      )}
                    </td>

                    <td>
                      {formatoMoneda(
                        fila.abonosAnio
                      )}
                    </td>

                    <td className="resumen-anual-cobrado">
                      {formatoMoneda(
                        fila.cobradoAnio
                      )}
                    </td>

                    <td className={
                      fila.saldoCierre < 0
                        ? "resumen-anual-negativo"
                        : "resumen-anual-positivo"
                    }>
                      {formatoMoneda(
                        fila.saldoCierre
                      )}
                    </td>

                    <td>
                      <span className="resumen-anual-proyectos">
                        <FolderKanban size={15} />
                        {fila.proyectosAnio}
                      </span>
                    </td>

                    <td className={
                      fila.saldoActual < 0
                        ? "resumen-anual-negativo"
                        : "resumen-anual-positivo"
                    }>
                      {formatoMoneda(
                        fila.saldoActual
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan="2">
                    TOTALES GENERALES
                  </td>

                  <td>
                    {formatoMoneda(
                      resumen.totalContratado
                    )}
                  </td>

                  <td>
                    {formatoMoneda(
                      resumen.totalAnticipos
                    )}
                  </td>

                  <td>
                    {formatoMoneda(
                      resumen.totalAbonos
                    )}
                  </td>

                  <td>
                    {formatoMoneda(
                      resumen.totalCobrado
                    )}
                  </td>

                  <td>
                    {formatoMoneda(
                      resumen.totalSaldoCierre
                    )}
                  </td>

                  <td>
                    {resumen.totalProyectos}
                  </td>

                  <td>
                    {formatoMoneda(
                      resumen.totalSaldoActual
                    )}
                  </td>
                </tr>
              </tfoot>

            </table>
          </div>
        )}

        <div className="resumen-anual-tabla-footer">
          <span>
            {filasFiltradas.length} clientes mostrados
          </span>

          <span>
            Año consultado: {anio}
          </span>
        </div>

      </div>

    </div>
  );
}

export default ResumenAnual;
