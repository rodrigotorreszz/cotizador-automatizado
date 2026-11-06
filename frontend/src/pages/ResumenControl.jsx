
import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Wallet,
  Clock,
  FolderOpen,
  RefreshCw,
  Search,
  CalendarDays,
  Users,
  TrendingUp,
  AlertCircle
} from "lucide-react";

import api from "../services/api";
import notificaciones from "../utils/notificaciones";

import "../styles/resumenControl.css";

const dinero = (valor) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(valor) || 0);

const obtenerId = (valor) => {
  if (!valor) return "";
  return typeof valor === "object" ? valor._id : valor;
};

const obtenerLista = (respuesta, propiedad) => {
  if (Array.isArray(respuesta.data)) return respuesta.data;
  return respuesta.data?.[propiedad] || [];
};

function ResumenControl() {
  const [clientes, setClientes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [abonos, setAbonos] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [actualizado, setActualizado] = useState(new Date());

  const cargarResumen = async () => {
    try {
      setCargando(true);

      const [
        resClientes,
        resProyectos,
        resCotizaciones,
        resAbonos
      ] = await Promise.all([
        api.get("/clientes"),
        api.get("/proyectos"),
        api.get("/cotizaciones"),
        api.get("/abonos").catch(() => ({ data: { abonos: [] } }))
      ]);

      setClientes(obtenerLista(resClientes, "clientes"));
      setProyectos(obtenerLista(resProyectos, "proyectos"));
      setCotizaciones(obtenerLista(resCotizaciones, "cotizaciones"));
      setAbonos(obtenerLista(resAbonos, "abonos"));

      setActualizado(new Date());
    } catch (error) {
      console.error("Error al cargar el resumen:", error);

      notificaciones.error(
        "No fue posible cargar el resumen de cuentas por cobrar."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarResumen();
  }, []);

  const resumen = useMemo(() => {
    // Obtener la cotización aceptada más reciente de cada proyecto.
    const cotizacionesAceptadas = cotizaciones
      .filter((cotizacion) => cotizacion.estado === "Aceptada")
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.fecha || 0) -
          new Date(a.updatedAt || a.fecha || 0)
      );

    const cotizacionPorProyecto = new Map();

    cotizacionesAceptadas.forEach((cotizacion) => {
      const idProyecto = obtenerId(cotizacion.idProyecto);

      if (idProyecto && !cotizacionPorProyecto.has(idProyecto)) {
        cotizacionPorProyecto.set(idProyecto, cotizacion);
      }
    });

    // Agrupar proyectos y pagos por cliente.
    const filas = clientes.map((cliente) => {
      const proyectosCliente = proyectos.filter(
        (proyecto) =>
          obtenerId(proyecto.idCliente) === cliente._id
      );

      let contratado = 0;

      proyectosCliente.forEach((proyecto) => {
        const cotizacion = cotizacionPorProyecto.get(proyecto._id);

        const montoCotizacion = Number(
          cotizacion?.totalGeneral
        );

        const montoManual = Number(
          proyecto.montoContratado
        );

        // Prioridad: cotización aceptada; si no existe, monto manual.
        contratado += cotizacion
          ? (Number.isFinite(montoCotizacion) ? montoCotizacion : 0)
          : (Number.isFinite(montoManual) ? montoManual : 0);
      });

      const proyectosIds = new Set(
        proyectosCliente.map((proyecto) => proyecto._id)
      );

      const pagosCliente = abonos.filter((abono) => {
        const idProyecto = obtenerId(abono.idProyecto);
        const idCliente = obtenerId(abono.idCliente);

        return (
          (idProyecto && proyectosIds.has(idProyecto)) ||
          idCliente === cliente._id
        );
      });

      const anticipos = pagosCliente
        .filter((pago) =>
          String(pago.tipo || "").toLowerCase().includes("anticipo")
        )
        .reduce(
          (total, pago) =>
            total + Number(pago.monto || pago.cantidad || 0),
          0
        );

      const abonosTotal = pagosCliente
        .filter(
          (pago) =>
            !String(pago.tipo || "").toLowerCase().includes("anticipo")
        )
        .reduce(
          (total, pago) =>
            total + Number(pago.monto || pago.cantidad || 0),
          0
        );

      const recibido = anticipos + abonosTotal;

      const pendientes = proyectosCliente.filter(
        (proyecto) =>
          !["Finalizado", "Cancelado"].includes(proyecto.estado)
      ).length;

      const fechasPagos = pagosCliente
        .map((pago) => new Date(pago.fecha || pago.createdAt))
        .filter((fecha) => !Number.isNaN(fecha.getTime()));

      const ultimoAbono = fechasPagos.length
        ? new Date(Math.max(...fechasPagos.map((fecha) => fecha.getTime())))
        : null;

      return {
        idCliente: cliente.idCliente,
        nombre: cliente.nombre,
        contratado,
        anticipos,
        abonos: abonosTotal,
        recibido,
        saldo: contratado - recibido,
        pendientes,
        ultimoAbono,
        cantidadProyectos: proyectosCliente.length
      };
    });

    const totalContratado = filas.reduce(
      (total, fila) => total + fila.contratado,
      0
    );

    const totalAnticipos = filas.reduce(
      (total, fila) => total + fila.anticipos,
      0
    );

    const totalAbonos = filas.reduce(
      (total, fila) => total + fila.abonos,
      0
    );

    const totalRecibido = totalAnticipos + totalAbonos;

    const proyectosPendientes = proyectos.filter(
      (proyecto) =>
        !["Finalizado", "Cancelado"].includes(proyecto.estado)
    ).length;

    return {
      filas,
      totalContratado,
      totalAnticipos,
      totalAbonos,
      totalRecibido,
      saldoTotal: totalContratado - totalRecibido,
      proyectosPendientes
    };
  }, [clientes, proyectos, cotizaciones, abonos]);

  const filasFiltradas = resumen.filas.filter((fila) => {
    const texto = busqueda.toLowerCase();

    return (
      fila.nombre.toLowerCase().includes(texto) ||
      fila.idCliente.toLowerCase().includes(texto)
    );
  });

  return (
    <div className="resumen-control-page">

      <header className="resumen-control-header">
        <div>
          <div className="resumen-control-titulo">
            <div className="resumen-control-icono">
              <TrendingUp size={25} />
            </div>

            <div>
              <h1>Resumen general de cuentas por cobrar</h1>
              <p>
                Control financiero y seguimiento de clientes
              </p>
            </div>
          </div>

          <div className="resumen-actualizado">
            <CalendarDays size={15} />
            <span>
              Actualizado al{" "}
              {actualizado.toLocaleDateString("es-SV")}
              {" · "}
              {actualizado.toLocaleTimeString("es-SV", {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </div>
        </div>

        <button
          className="resumen-btn-actualizar"
          onClick={cargarResumen}
          disabled={cargando}
        >
          <RefreshCw
            size={17}
            className={cargando ? "resumen-girando" : ""}
          />
          Actualizar
        </button>
      </header>

      <section className="resumen-indicadores">

        <div className="resumen-card">
          <div className="resumen-card-icono azul">
            <FileText size={22} />
          </div>

          <div>
            <span>Total contratado</span>
            <h2>{dinero(resumen.totalContratado)}</h2>
            <small>Contratos y cotizaciones aceptadas</small>
          </div>
        </div>

        <div className="resumen-card">
          <div className="resumen-card-icono verde">
            <Wallet size={22} />
          </div>

          <div>
            <span>Total recibido</span>
            <h2>{dinero(resumen.totalRecibido)}</h2>
            <small>
              Anticipos: {dinero(resumen.totalAnticipos)}
            </small>
          </div>
        </div>

        <div className="resumen-card">
          <div className="resumen-card-icono naranja">
            <Clock size={22} />
          </div>

          <div>
            <span>Cuentas por cobrar</span>
            <h2>{dinero(resumen.saldoTotal)}</h2>
            <small>Saldo pendiente de recibir</small>
          </div>
        </div>

        <div className="resumen-card">
          <div className="resumen-card-icono morado">
            <FolderOpen size={22} />
          </div>

          <div>
            <span>Proyectos pendientes</span>
            <h2>{resumen.proyectosPendientes}</h2>
            <small>En espera o en proceso</small>
          </div>
        </div>

      </section>

      <section className="resumen-tabla-panel">

        <div className="resumen-tabla-header">
          <div>
            <h2>Detalle por cliente</h2>
            <p>
              Información financiera de los clientes registrados
            </p>
          </div>

          <div className="resumen-busqueda">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar cliente o ID..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {cargando ? (
          <div className="resumen-estado">
            <RefreshCw className="resumen-girando" size={28} />
            <p>Cargando información financiera...</p>
          </div>
        ) : filasFiltradas.length === 0 ? (
          <div className="resumen-estado">
            <AlertCircle size={30} />
            <p>
              {busqueda
                ? "No se encontraron clientes."
                : "Todavía no hay clientes registrados."}
            </p>
          </div>
        ) : (
          <div className="resumen-tabla-scroll">
            <table className="resumen-tabla">
              <thead>
                <tr>
                  <th>ID Cliente</th>
                  <th>Cliente</th>
                  <th>Contratado</th>
                  <th>Anticipos</th>
                  <th>Abonos</th>
                  <th>Total recibido</th>
                  <th>Saldo por cobrar</th>
                  <th>Proyectos pendientes</th>
                  <th>Último abono</th>
                </tr>
              </thead>

              <tbody>
                {filasFiltradas.map((fila) => (
                  <tr key={fila.idCliente}>
                    <td>
                      <span className="resumen-id">
                        {fila.idCliente}
                      </span>
                    </td>

                    <td className="resumen-cliente">
                      {fila.nombre}
                    </td>

                    <td>{dinero(fila.contratado)}</td>

                    <td className="resumen-positivo">
                      {dinero(fila.anticipos)}
                    </td>

                    <td className="resumen-positivo">
                      {dinero(fila.abonos)}
                    </td>

                    <td className="resumen-positivo">
                      {dinero(fila.recibido)}
                    </td>

                    <td
                      className={
                        fila.saldo > 0
                          ? "resumen-negativo"
                          : "resumen-positivo"
                      }
                    >
                      {dinero(fila.saldo)}
                    </td>

                    <td>
                      <span className="resumen-proyectos-badge">
                        {fila.pendientes}
                      </span>
                    </td>

                    <td>
                      {fila.ultimoAbono
                        ? fila.ultimoAbono.toLocaleDateString("es-SV")
                        : "Sin abonos"}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan="2">TOTAL GENERAL</td>
                  <td>{dinero(resumen.totalContratado)}</td>
                  <td>{dinero(resumen.totalAnticipos)}</td>
                  <td>{dinero(resumen.totalAbonos)}</td>
                  <td>{dinero(resumen.totalRecibido)}</td>
                  <td>{dinero(resumen.saldoTotal)}</td>
                  <td>{resumen.proyectosPendientes}</td>
                  <td>—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="resumen-tabla-footer">
          <span>
            <Users size={16} />
            {filasFiltradas.length} clientes
          </span>
          <span>
            {proyectos.length} proyectos registrados
          </span>
        </div>

      </section>
    </div>
  );
}

export default ResumenControl;
