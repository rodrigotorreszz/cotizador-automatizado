
import { useEffect, useState } from "react";
import {
  FileText,
  CalendarDays,
  UserRound,
  FolderKanban,
  X,
  Eye,
  RefreshCw,
  ClipboardList,
  FileSearch,
  ChevronDown,
} from "lucide-react";

import api from "../services/api";
import notificaciones from "../utils/notificaciones";
import "../styles/historial.css";

const formatoDinero = (cantidad) => {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(Number(cantidad) || 0);
};

const formatoFecha = (fecha) => {
  if (!fecha) return "—";

  return new Date(fecha).toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

function Historial() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cotizacionesDisponibles, setCotizacionesDisponibles] = useState([]);

  const [idCliente, setIdCliente] = useState("");
  const [codigoAbrir, setCodigoAbrir] = useState("");

  const [cargando, setCargando] = useState(true);
  const [cargandoOpciones, setCargandoOpciones] = useState(true);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // CARGAR CLIENTES Y COTIZACIONES PARA LOS DESPLEGABLES
  const cargarOpciones = async () => {
    try {
      setCargandoOpciones(true);

      const [resClientes, resCotizaciones] = await Promise.all([
        api.get("/clientes"),
        api.get("/cotizaciones/historial"),
      ]);

      setClientes(resClientes.data.clientes || []);

      setCotizacionesDisponibles(
        resCotizaciones.data.cotizaciones || []
      );
    } catch (error) {
      console.error("Error al cargar opciones:", error);

      notificaciones.error(
        "No fue posible cargar los clientes y cotizaciones."
      );
    } finally {
      setCargandoOpciones(false);
    }
  };

  // CARGAR HISTORIAL
  const cargarHistorial = async (cliente = "") => {
    try {
      setCargando(true);

      const respuesta = await api.get("/cotizaciones/historial", {
        params: cliente
          ? { cliente }
          : {},
      });

      setCotizaciones(respuesta.data.cotizaciones || []);
      setBusquedaRealizada(true);
    } catch (error) {
      console.error("Error al cargar historial:", error);

      setCotizaciones([]);

      notificaciones.error(
        error.response?.data?.message ||
          "No fue posible cargar el historial."
      );
    } finally {
      setCargando(false);
    }
  };

  // CARGA INICIAL
  useEffect(() => {
    cargarHistorial();
    cargarOpciones();
  }, []);

  // SELECCIONAR CLIENTE Y FILTRAR AUTOMÁTICAMENTE
  const buscarHistorial = (cliente) => {
    setIdCliente(cliente);
    cargarHistorial(cliente);
  };

  // MOSTRAR TODAS LAS COTIZACIONES
  const limpiarFiltro = () => {
    setIdCliente("");
    cargarHistorial("");
  };

  // ABRIR COTIZACIÓN AUTOMÁTICAMENTE AL SELECCIONARLA
  const abrirCotizacion = async (codigo) => {
    setCodigoAbrir(codigo);

    if (!codigo) {
      setCotizacionSeleccionada(null);
      return;
    }

    try {
      setCargandoDetalle(true);

      const respuesta = await api.get(
        `/cotizaciones/${encodeURIComponent(codigo)}`
      );

      setCotizacionSeleccionada(respuesta.data.cotizacion);
    } catch (error) {
      console.error("Error al abrir cotización:", error);

      notificaciones.error(
        error.response?.data?.message ||
          "No fue posible abrir la cotización."
      );

      setCotizacionSeleccionada(null);
    } finally {
      setCargandoDetalle(false);
    }
  };

  // ABRIR COTIZACIÓN DESDE LA TABLA
  const abrirDesdeTabla = async (codigo) => {
    await abrirCotizacion(codigo);
  };

  // CLASES DE ESTADOS
  const obtenerClaseEstado = (estado) => {
    const clases = {
      Borrador: "historial-estado-borrador",
      Enviada: "historial-estado-enviada",
      Aceptada: "historial-estado-aceptada",
      Rechazada: "historial-estado-rechazada",
    };

    return clases[estado] || "historial-estado-borrador";
  };

  const cliente = cotizacionSeleccionada?.idCliente;
  const proyecto = cotizacionSeleccionada?.idProyecto;

  return (
    <div className="historial-page">

      {/* ENCABEZADO */}
      <header className="historial-header">
        <div className="historial-titulo-icono">
          <div className="historial-icono-principal">
            <ClipboardList size={25} />
          </div>

          <div>
            <h1>Historial de Cotizaciones</h1>
            <p>
              Consultá y abrí las cotizaciones registradas en A&S.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="historial-btn-actualizar"
          onClick={() => {
            cargarHistorial(idCliente);
            cargarOpciones();
          }}
          disabled={cargando || cargandoOpciones}
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </header>

      {/* PANEL DE FILTROS */}
      <section className="historial-panel">

        <div className="historial-panel-titulo">
          <FileSearch size={20} />
          <h3>Consulta de cotizaciones</h3>
        </div>

        <div className="historial-filtros">

          {/* DESPLEGABLE DE CLIENTES */}
          <div className="historial-filtro-cliente">
            <label htmlFor="historial-cliente">
              ID CLIENTE
            </label>

            <div className="historial-input-contenedor">
              <div className="historial-select-wrapper">
                <select
                  id="historial-cliente"
                  value={idCliente}
                  onChange={(e) => buscarHistorial(e.target.value)}
                  disabled={cargandoOpciones || cargando}
                >
                  <option value="">
                    {cargandoOpciones
                      ? "Cargando clientes..."
                      : "Mostrar todas las cotizaciones"}
                  </option>

                  {clientes.map((cliente) => (
                    <option
                      key={cliente._id}
                      value={cliente.idCliente}
                    >
                      {cliente.idCliente} - {cliente.nombre}
                    </option>
                  ))}
                </select>

                <ChevronDown size={17} />
              </div>
            </div>

            <small>
              Seleccioná un cliente para filtrar automáticamente el historial.
            </small>
          </div>

          <div className="historial-separador" />

          {/* DESPLEGABLE DE COTIZACIONES */}
          <div className="historial-filtro-abrir">
            <label htmlFor="historial-cotizacion">
              COTIZACIÓN PARA ABRIR
            </label>

            <div className="historial-input-contenedor">
              <div className="historial-select-wrapper">
                <select
                  id="historial-cotizacion"
                  value={codigoAbrir}
                  onChange={(e) => abrirCotizacion(e.target.value)}
                  disabled={cargandoOpciones || cargandoDetalle}
                >
                  <option value="">
                    {cargandoOpciones
                      ? "Cargando cotizaciones..."
                      : "Seleccionar cotización"}
                  </option>

                  {cotizacionesDisponibles.map((cotizacion) => (
                    <option
                      key={cotizacion._id}
                      value={cotizacion.idCotizacion}
                    >
                      {cotizacion.idCotizacion} -{" "}
                      {cotizacion.idCliente?.nombre ||
                        cotizacion.idCliente?.empresa ||
                        cotizacion.idCliente?.idCliente ||
                        "Sin cliente"}
                    </option>
                  ))}
                </select>

                <ChevronDown size={17} />
              </div>
            </div>

            <small>
              Seleccioná una cotización para abrir automáticamente sus detalles.
            </small>
          </div>
        </div>
      </section>

      {/* RESUMEN */}
      <section className="historial-resumen">
        <div className="historial-resumen-icono">
          <FileText size={22} />
        </div>

        <div>
          <span>Cotizaciones encontradas</span>
          <strong>{cotizaciones.length}</strong>
        </div>

        <div className="historial-resumen-texto">
          {idCliente
            ? `Resultados para ${idCliente}`
            : "Mostrando todas las cotizaciones"}
        </div>
      </section>

      {/* TABLA */}
      <section className="historial-tabla-panel">

        <div className="historial-tabla-encabezado">
          <div>
            <h3>Registro de cotizaciones</h3>
            <p>
              Listado de cotizaciones almacenadas en el sistema.
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="historial-cargando">
            <div className="historial-spinner" />
            <p>Cargando historial...</p>
          </div>
        ) : cotizaciones.length === 0 ? (
          <div className="historial-vacio">
            <div>
              <FileText size={35} />
            </div>

            <h3>No hay cotizaciones para mostrar</h3>

            <p>
              {busquedaRealizada
                ? "No se encontraron cotizaciones con el filtro indicado."
                : "Todavía no hay cotizaciones registradas."}
            </p>
          </div>
        ) : (
          <div className="historial-tabla-scroll">
            <table className="historial-tabla">
              <thead>
                <tr>
                  <th>COTIZACIÓN Nº</th>
                  <th>FECHA</th>
                  <th>ID CLIENTE</th>
                  <th>EMPRESA</th>
                  <th>ID PROYECTO</th>
                  <th>PROYECTO</th>
                  <th>SUBTOTAL</th>
                  <th>IVA</th>
                  <th>TOTAL GENERAL</th>
                  <th>ESTADO</th>
                  <th>ACCIÓN</th>
                </tr>
              </thead>

              <tbody>
                {cotizaciones.map((cotizacion) => {
                  const nombreEmpresa =
                    cotizacion.idCliente?.empresa ||
                    cotizacion.idCliente?.nombre ||
                    "—";

                  return (
                    <tr key={cotizacion._id}>
                      <td>
                        <strong className="historial-codigo">
                          {cotizacion.idCotizacion}
                        </strong>
                      </td>

                      <td>{formatoFecha(cotizacion.fecha)}</td>

                      <td>
                        {cotizacion.idCliente?.idCliente || "—"}
                      </td>

                      <td>{nombreEmpresa}</td>

                      <td>
                        {cotizacion.idProyecto?.idProyecto || "—"}
                      </td>

                      <td>
                        {cotizacion.idProyecto?.proyecto ||
                          cotizacion.idProyecto?.nombre ||
                          "—"}
                      </td>

                      <td>{formatoDinero(cotizacion.subtotal)}</td>

                      <td>{formatoDinero(cotizacion.iva)}</td>

                      <td>
                        <strong className="historial-total">
                          {formatoDinero(cotizacion.totalGeneral)}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`historial-estado ${obtenerClaseEstado(
                            cotizacion.estado
                          )}`}
                        >
                          {cotizacion.estado}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="historial-btn-ver"
                          title="Abrir cotización"
                          onClick={() =>
                            abrirDesdeTabla(cotizacion.idCotizacion)
                          }
                          disabled={cargandoDetalle}
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL DE DETALLE */}
      {cotizacionSeleccionada && (
        <div
          className="historial-modal-overlay"
          onClick={() => setCotizacionSeleccionada(null)}
        >
          <div
            className="historial-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="historial-modal-header">
              <div>
                <span>DETALLE DE COTIZACIÓN</span>
                <h2>
                  {cotizacionSeleccionada.idCotizacion}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setCotizacionSeleccionada(null)}
                aria-label="Cerrar"
              >
                <X size={21} />
              </button>
            </div>

            <div className="historial-modal-contenido">

              <div className="historial-detalle-grid">

                <div className="historial-detalle-item">
                  <UserRound size={18} />
                  <div>
                    <small>Cliente</small>
                    <strong>
                      {cliente?.nombre ||
                        cliente?.empresa ||
                        "—"}
                    </strong>
                    <span>
                      {cliente?.idCliente || "—"}
                    </span>
                  </div>
                </div>

                <div className="historial-detalle-item">
                  <FolderKanban size={18} />
                  <div>
                    <small>Proyecto</small>
                    <strong>
                      {proyecto?.proyecto ||
                        proyecto?.nombre ||
                        "Sin proyecto"}
                    </strong>
                    <span>
                      {proyecto?.idProyecto || "—"}
                    </span>
                  </div>
                </div>

                <div className="historial-detalle-item">
                  <CalendarDays size={18} />
                  <div>
                    <small>Fecha</small>
                    <strong>
                      {formatoFecha(cotizacionSeleccionada.fecha)}
                    </strong>
                  </div>
                </div>

                <div className="historial-detalle-item">
                  <FileText size={18} />
                  <div>
                    <small>Estado</small>
                    <strong>
                      {cotizacionSeleccionada.estado}
                    </strong>
                  </div>
                </div>
              </div>

              <h3 className="historial-conceptos-titulo">
                Conceptos de la cotización
              </h3>

              <div className="historial-conceptos-scroll">
                <table className="historial-conceptos-tabla">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>Cantidad</th>
                      <th>Precio unitario</th>
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cotizacionSeleccionada.conceptos?.map(
                      (concepto, index) => (
                        <tr key={concepto._id || index}>
                          <td>{concepto.descripcion}</td>
                          <td>{concepto.cantidad}</td>
                          <td>
                            {formatoDinero(concepto.precioUnitario)}
                          </td>
                          <td>
                            {formatoDinero(concepto.total)}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="historial-totales">
                <div>
                  <span>Subtotal</span>
                  <strong>
                    {formatoDinero(cotizacionSeleccionada.subtotal)}
                  </strong>
                </div>

                <div>
                  <span>
                    IVA ({cotizacionSeleccionada.porcentajeIVA ?? 13}%)
                  </span>
                  <strong>
                    {formatoDinero(cotizacionSeleccionada.iva)}
                  </strong>
                </div>

                <div className="historial-total-final">
                  <span>Total general</span>
                  <strong>
                    {formatoDinero(cotizacionSeleccionada.totalGeneral)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="historial-modal-footer">
              <button
                type="button"
                onClick={() => setCotizacionSeleccionada(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Historial;
