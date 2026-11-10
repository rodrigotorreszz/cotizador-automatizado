import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Printer,
  UserRound,
  Phone,
  Mail,
  FolderKanban,
  Wallet,
  TrendingUp,
  Clock,
  MapPin,
  FileText,
  AlertCircle,
} from "lucide-react";

import api from "../services/api";
import "../styles/estadoCuentaCliente.css";

const formatoDinero = (cantidad = 0) => {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(Number(cantidad) || 0);
};

const formatoFecha = (fecha) => {
  if (!fecha) return "Sin registro";

  const fechaValida = new Date(fecha);

  if (Number.isNaN(fechaValida.getTime())) {
    return "Sin registro";
  }

  return fechaValida.toLocaleDateString("es-SV");
};

function EstadoCuentaCliente() {
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const respuesta = await api.get("/estado-cliente");

      if (!respuesta.data?.success) {
        throw new Error(
          respuesta.data?.message || "No se pudo obtener el estado de cuenta."
        );
      }

      setClientes(respuesta.data.clientes || []);
    } catch (err) {
      console.error("Error al cargar estados de cuenta:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Ocurrió un error al cargar los datos."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    if (!termino) return clientes;

    return clientes.filter((cliente) => {
      return (
        cliente.nombre?.toLowerCase().includes(termino) ||
        cliente.idCliente?.toLowerCase().includes(termino) ||
        cliente.telefono?.toLowerCase().includes(termino) ||
        cliente.correo?.toLowerCase().includes(termino)
      );
    });
  }, [clientes, busqueda]);

  const cliente = useMemo(() => {
    return clientes.find(
      (item) => item.idCliente === clienteSeleccionado
    );
  }, [clientes, clienteSeleccionado]);

  const proyectos = cliente?.proyectos || [];
  const cotizacionesSinProyecto = cliente?.cotizacionesSinProyecto || [];

  const obtenerPagos = (proyecto) => {
    return proyecto.pagos || proyecto.historial || [];
  };

  const obtenerSaldo = (item) => {
    if (item.saldoPendiente !== undefined) {
      return Number(item.saldoPendiente) || 0;
    }

    if (item.saldo !== undefined) {
      return Number(item.saldo) || 0;
    }

    return Math.max(
      (Number(item.montoContratado) || 0) -
        (Number(item.totalRecibido) || 0),
      0
    );
  };

  const obtenerExcedente = (item) => {
    if (item.excedente !== undefined) {
      return Number(item.excedente) || 0;
    }

    return Math.max(
      (Number(item.totalRecibido) || 0) -
        (Number(item.montoContratado) || 0),
      0
    );
  };

  const imprimirEstado = () => {
    if (!cliente) return;
    window.print();
  };

  return (
    <main className="estado-cuenta-page">
      <header className="estado-cuenta-header">
        <div>
          <span className="estado-cuenta-eyebrow">
            CONTROL FINANCIERO
          </span>

          <h1>Estado de cuenta por cliente</h1>

          <p>
            Consulta los proyectos, pagos y saldos correspondientes a cada
            cliente.
          </p>
        </div>

        <div className="estado-cuenta-acciones no-print">
          <button
            type="button"
            className="btn-estado-cuenta btn-actualizar"
            onClick={cargarDatos}
            disabled={cargando}
          >
            <RefreshCw size={17} />
            Actualizar
          </button>

          <button
            type="button"
            className="btn-estado-cuenta btn-imprimir"
            onClick={imprimirEstado}
            disabled={!cliente}
          >
            <Printer size={17} />
            Imprimir
          </button>
        </div>
      </header>

      <section className="estado-cuenta-selector no-print">
        <div className="selector-titulo">
          <Search size={19} />
          <h2>Seleccionar cliente</h2>
        </div>

        <div className="selector-campos">
          <div className="campo-busqueda-cliente">
            <label htmlFor="buscarCliente">
              Buscar por nombre, código o contacto
            </label>

            <input
              id="buscarCliente"
              type="text"
              placeholder="Escribe el nombre o código del cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="campo-seleccionar-cliente">
            <label htmlFor="seleccionarCliente">
              Cliente
            </label>

            <select
              id="seleccionarCliente"
              value={clienteSeleccionado}
              onChange={(e) => setClienteSeleccionado(e.target.value)}
            >
              <option value="">Selecciona un cliente</option>

              {clientesFiltrados.map((item) => (
                <option
                  key={item._id || item.idCliente}
                  value={item.idCliente}
                >
                  {item.idCliente} - {item.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="cantidad-clientes">
          {clientesFiltrados.length} cliente(s) encontrado(s)
        </span>
      </section>

      {cargando && (
        <div className="estado-cuenta-mensaje">
          <RefreshCw className="icono-cargando" size={24} />
          <p>Cargando información financiera...</p>
        </div>
      )}

      {!cargando && error && (
        <div className="estado-cuenta-error">
          <AlertCircle size={22} />
          <div>
            <strong>No se pudo cargar la información</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {!cargando && !error && clientes.length === 0 && (
        <div className="estado-cuenta-vacio">
          <UserRound size={35} />
          <h3>No hay clientes registrados</h3>
          <p>Cuando registres clientes, aparecerán en esta sección.</p>
        </div>
      )}

      {!cargando && !error && clientes.length > 0 && !cliente && (
        <div className="estado-cuenta-vacio">
          <FolderKanban size={35} />
          <h3>Selecciona un cliente</h3>
          <p>
            Elige un cliente para consultar su estado de cuenta y sus
            movimientos financieros.
          </p>
        </div>
      )}

      {!cargando && cliente && (
        <div className="estado-cuenta-contenido">
          <section className="estado-cuenta-documento">
            <div className="documento-encabezado">
              <div>
                <span>DOCUMENTO FINANCIERO</span>
                <h2>ESTADO DE CUENTA</h2>
                <p>Detalle individual de operaciones del cliente</p>
              </div>

              <div className="documento-fecha">
                <span>Fecha de consulta</span>
                <strong>{formatoFecha(new Date())}</strong>
              </div>
            </div>

            <section className="ficha-cliente">
              <div className="ficha-cliente-titulo">
                <UserRound size={20} />
                <h3>Información del cliente</h3>
              </div>

              <div className="ficha-cliente-grid">
                <div>
                  <span>Código de cliente</span>
                  <strong>{cliente.idCliente || "Sin código"}</strong>
                </div>

                <div>
                  <span>Nombre completo</span>
                  <strong>{cliente.nombre || "Sin nombre"}</strong>
                </div>

                <div>
                  <span>Teléfono</span>
                  <strong>
                    <Phone size={14} />
                    {cliente.telefono || "Sin teléfono"}
                  </strong>
                </div>

                <div>
                  <span>Correo electrónico</span>
                  <strong>
                    <Mail size={14} />
                    {cliente.correo || "Sin correo"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="resumen-financiero-cliente">
              <div className="resumen-financiero-titulo">
                <Wallet size={20} />
                <h3>Resumen financiero</h3>
              </div>

              <div className="resumen-financiero-grid">
                <article className="financiero-card">
                  <span>Total contratado</span>
                  <strong>
                    {formatoDinero(cliente.totalContratado)}
                  </strong>
                  <small>Proyectos y cotizaciones aceptadas</small>
                </article>

                <article className="financiero-card">
                  <span>Anticipos</span>
                  <strong>{formatoDinero(cliente.anticipos)}</strong>
                  <small>Pagos registrados como anticipo</small>
                </article>

                <article className="financiero-card">
                  <span>Abonos</span>
                  <strong>{formatoDinero(cliente.abonos)}</strong>
                  <small>Pagos posteriores al anticipo</small>
                </article>

                <article className="financiero-card recibido">
                  <span>Total recibido</span>
                  <strong>{formatoDinero(cliente.totalRecibido)}</strong>
                  <small>Anticipos más abonos</small>
                </article>

                <article className="financiero-card pendiente">
                  <span>Saldo pendiente</span>
                  <strong>
                    {formatoDinero(obtenerSaldo(cliente))}
                  </strong>
                  <small>Monto pendiente de pago</small>
                </article>

                <article className="financiero-card excedente">
                  <span>Excedente</span>
                  <strong>
                    {formatoDinero(obtenerExcedente(cliente))}
                  </strong>
                  <small>Pagos superiores al monto contratado</small>
                </article>
              </div>
            </section>

            <section className="detalle-proyectos">
              <div className="seccion-titulo">
                <div>
                  <FolderKanban size={20} />
                  <h3>Detalle de proyectos</h3>
                </div>

                <span>{proyectos.length} proyecto(s)</span>
              </div>

              {proyectos.length === 0 ? (
                <div className="tabla-vacia">
                  Este cliente todavía no tiene proyectos registrados.
                </div>
              ) : (
                proyectos.map((proyecto, index) => {
                  const pagos = obtenerPagos(proyecto);

                  const anticipo = pagos.find(
                    (pago) => pago.tipoPago === "Anticipo"
                  );

                  return (
                    <article
                      className="proyecto-estado-card"
                      key={proyecto._id || proyecto.idProyecto || index}
                    >
                      <div className="proyecto-card-header">
                        <div>
                          <span>PROYECTO {index + 1}</span>
                          <h4>
                            {proyecto.proyecto || "Proyecto sin nombre"}
                          </h4>
                          <small>
                            Código: {proyecto.idProyecto || "Sin código"}
                          </small>
                        </div>

                        <span
                          className={`proyecto-estado-badge ${(
                            proyecto.estado || "Pendiente"
                          )
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {proyecto.estado || "Pendiente"}
                        </span>
                      </div>

                      <div className="proyecto-datos-grid">
                        <div>
                          <span>Fecha de ingreso</span>
                          <strong>
                            {formatoFecha(
                              proyecto.createdAt || proyecto.fechaIngreso
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Ubicación</span>
                          <strong>
                            <MapPin size={14} />
                            {proyecto.ubicacion || "Sin ubicación registrada"}
                          </strong>
                        </div>

                        <div>
                          <span>Monto contratado</span>
                          <strong>
                            {formatoDinero(proyecto.montoContratado)}
                          </strong>
                        </div>

                        <div>
                          <span>Anticipos</span>
                          <strong>{formatoDinero(proyecto.anticipos)}</strong>
                        </div>

                        <div>
                          <span>Fecha del primer anticipo</span>
                          <strong>{formatoFecha(anticipo?.fecha)}</strong>
                        </div>

                        <div>
                          <span>Abonos</span>
                          <strong>{formatoDinero(proyecto.abonos)}</strong>
                        </div>

                        <div>
                          <span>Total recibido</span>
                          <strong className="texto-recibido">
                            {formatoDinero(proyecto.totalRecibido)}
                          </strong>
                        </div>

                        <div>
                          <span>Saldo pendiente</span>
                          <strong className="texto-pendiente">
                            {formatoDinero(obtenerSaldo(proyecto))}
                          </strong>
                        </div>

                        <div>
                          <span>Excedente</span>
                          <strong>
                            {formatoDinero(obtenerExcedente(proyecto))}
                          </strong>
                        </div>
                      </div>

                      <div className="historial-pagos">
                        <div className="historial-pagos-titulo">
                          <Clock size={17} />
                          <h5>Historial de pagos</h5>
                        </div>

                        {pagos.length === 0 ? (
                          <p className="sin-pagos">
                            No hay pagos registrados para este proyecto.
                          </p>
                        ) : (
                          <div className="tabla-pagos-wrapper">
                            <table className="tabla-pagos">
                              <thead>
                                <tr>
                                  <th>Código</th>
                                  <th>Fecha</th>
                                  <th>Tipo</th>
                                  <th>Forma de pago</th>
                                  <th>Referencia</th>
                                  <th>Monto</th>
                                </tr>
                              </thead>

                              <tbody>
                                {pagos.map((pago, pagoIndex) => (
                                  <tr
                                    key={pago._id || pago.idAbono || pagoIndex}
                                  >
                                    <td>{pago.idAbono || "—"}</td>
                                    <td>{formatoFecha(pago.fecha)}</td>
                                    <td>{pago.tipoPago || "—"}</td>
                                    <td>{pago.formaPago || "—"}</td>
                                    <td>{pago.referencia || "—"}</td>
                                    <td className="monto-pago">
                                      {formatoDinero(pago.monto)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </section>

            {cotizacionesSinProyecto.length > 0 && (
              <section className="cotizaciones-independientes">
                <div className="seccion-titulo">
                  <div>
                    <FileText size={20} />
                    <h3>Cotizaciones aceptadas sin proyecto</h3>
                  </div>

                  <span>{cotizacionesSinProyecto.length} cotización(es)</span>
                </div>

                <div className="tabla-pagos-wrapper">
                  <table className="tabla-pagos">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Fecha</th>
                        <th>Total cotizado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {cotizacionesSinProyecto.map((cotizacion, index) => (
                        <tr
                          key={
                            cotizacion._id ||
                            cotizacion.idCotizacion ||
                            index
                          }
                        >
                          <td>
                            {cotizacion.idCotizacion || "Sin código"}
                          </td>
                          <td>{formatoFecha(cotizacion.fecha)}</td>
                          <td className="monto-pago">
                            {formatoDinero(cotizacion.totalGeneral)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <footer className="estado-cuenta-footer">
              <TrendingUp size={17} />
              <p>
                Documento generado desde el sistema de control financiero
                A&amp;S.
              </p>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

export default EstadoCuentaCliente;