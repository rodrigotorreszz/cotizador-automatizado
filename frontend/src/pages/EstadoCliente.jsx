
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  Wallet,
  Clock,
  FolderKanban,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CircleDollarSign,
  CalendarDays,
  Phone,
  Mail,
  Pencil,
  Save,
  X,
  Receipt,
  CreditCard,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import toast from "react-hot-toast";
import api from "../services/api";
import "../styles/estadoCliente.css";

const formatoDinero = (cantidad = 0) =>
  new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(Number(cantidad) || 0);

const formatoFecha = (fecha) => {
  if (!fecha) return "Sin registros";

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) return "Sin registros";

  return date.toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fechaParaInput = (fecha) => {
  if (!fecha) return "";

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) return "";

  const anio = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
};

const formularioInicial = {
  fecha: "",
  monto: "",
  tipoPago: "Abono",
  formaPago: "",
  referencia: "",
};

function EstadoCliente() {
  const [clientes, setClientes] = useState([]);
  const [resumen, setResumen] = useState({});

  const [busqueda, setBusqueda] = useState("");
  const [clienteExpandido, setClienteExpandido] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [abonoEditando, setAbonoEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);

  // ========================================
  // CARGAR ESTADO DE CLIENTES
  // ========================================

  const cargarEstado = async (mostrarCarga = true) => {
    try {
      if (mostrarCarga) setCargando(true);

      setError("");

      const respuesta = await api.get("/estado-cliente");

      if (!respuesta.data.success) {
        throw new Error(
          respuesta.data.message ||
            "No fue posible obtener el estado de los clientes."
        );
      }

      const nuevosClientes = respuesta.data.clientes || [];

      setClientes(nuevosClientes);
      setResumen(respuesta.data.resumen || {});

      setClienteExpandido((actual) => {
        if (!actual) return null;

        const existe = nuevosClientes.some(
          (cliente) => cliente.idCliente === actual
        );

        return existe ? actual : null;
      });

    } catch (err) {
      console.error("Error al cargar estado de clientes:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "No fue posible cargar el estado de los clientes."
      );
    } finally {
      if (mostrarCarga) setCargando(false);
    }
  };

  useEffect(() => {
    cargarEstado();
  }, []);

  // ========================================
  // BUSCAR CLIENTES
  // ========================================

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    if (!termino) return clientes;

    return clientes.filter((cliente) =>
      [
        cliente.idCliente,
        cliente.nombre,
        cliente.telefono,
        cliente.correo,
      ]
        .filter(Boolean)
        .some((dato) =>
          String(dato).toLowerCase().includes(termino)
        )
    );
  }, [clientes, busqueda]);

  // ========================================
  // EXPANDIR Y CONTRAER CLIENTES
  // ========================================

  const cambiarExpandido = (idCliente) => {
    setClienteExpandido((actual) =>
      actual === idCliente ? null : idCliente
    );

    cancelarEdicion();
  };

  // ========================================
  // INICIAR EDICIÓN
  // ========================================

  const iniciarEdicion = (pago, proyecto) => {
    setAbonoEditando({
      idAbono: pago.idAbono,
      idProyecto: proyecto.idProyecto,
    });

    setFormulario({
      fecha: fechaParaInput(pago.fecha),
      monto: String(pago.monto ?? ""),
      tipoPago: pago.tipoPago || "Abono",
      formaPago: pago.formaPago || "",
      referencia: pago.referencia || "",
    });
  };

  // ========================================
  // CANCELAR EDICIÓN
  // ========================================

  const cancelarEdicion = () => {
    setAbonoEditando(null);
    setFormulario(formularioInicial);
  };

  // ========================================
  // ACTUALIZAR FORMULARIO
  // ========================================

  const actualizarCampo = (e) => {
    const { name, value } = e.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  // ========================================
  // GUARDAR EDICIÓN
  // ========================================

  const guardarEdicion = async (e) => {
    e.preventDefault();

    if (!abonoEditando || guardando) return;

    const monto = Number(formulario.monto);

    if (!formulario.fecha) {
      toast.error("Debes seleccionar la fecha del pago.");
      return;
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error("El monto debe ser mayor que cero.");
      return;
    }

    if (!formulario.tipoPago) {
      toast.error("Selecciona el tipo de pago.");
      return;
    }

    if (!formulario.formaPago.trim()) {
      toast.error("Debes ingresar la forma de pago.");
      return;
    }

    try {
      setGuardando(true);

      const respuesta = await api.put(
        `/abonos/${abonoEditando.idAbono}`,
        {
          fecha: formulario.fecha,
          monto,
          tipoPago: formulario.tipoPago,
          formaPago: formulario.formaPago.trim(),
          referencia: formulario.referencia.trim(),
        }
      );

      if (!respuesta.data.success) {
        throw new Error(
          respuesta.data.message ||
            "No fue posible actualizar el pago."
        );
      }

      toast.success("Pago actualizado correctamente.");

      cancelarEdicion();

      // Actualizar los totales y el historial.
      await cargarEstado(false);

    } catch (err) {
      console.error("Error al editar el pago:", err);

      toast.error(
        err.response?.data?.message ||
          err.message ||
          "No fue posible actualizar el pago."
      );
    } finally {
      setGuardando(false);
    }
  };

  // ========================================
  // RENDERIZADO
  // ========================================

  return (
    <main className="estado-cliente-page">

      {/* ENCABEZADO */}

      <section className="estado-cliente-header">

        <div>
          <span className="estado-cliente-etiqueta">
            CONTROL FINANCIERO
          </span>

          <h1>Estado actual por cliente</h1>

          <p>
            Consulta los contratos, pagos recibidos y saldos pendientes
            de cada cliente.
          </p>
        </div>

        <button
          type="button"
          className="estado-refresh-btn"
          onClick={() => cargarEstado()}
          disabled={cargando || guardando}
        >
          <RefreshCw
            size={17}
            className={cargando ? "girando" : ""}
          />
          Actualizar
        </button>

      </section>

      {/* RESUMEN FINANCIERO */}

      <section className="estado-resumen-grid">

        <article className="estado-resumen-card">

          <div className="estado-card-icon azul">
            <Users size={21} />
          </div>

          <div>
            <span>Total de clientes</span>
            <strong>{clientes.length}</strong>
            <small>Clientes registrados</small>
          </div>

        </article>

        <article className="estado-resumen-card">

          <div className="estado-card-icon morado">
            <CircleDollarSign size={21} />
          </div>

          <div>
            <span>Total contratado</span>

            <strong>
              {formatoDinero(resumen.totalContratado)}
            </strong>

            <small>Contratos y cotizaciones aceptadas</small>
          </div>

        </article>

        <article className="estado-resumen-card">

          <div className="estado-card-icon verde">
            <Wallet size={21} />
          </div>

          <div>
            <span>Total recibido</span>

            <strong>
              {formatoDinero(resumen.totalRecibido)}
            </strong>

            <small>Anticipos y abonos registrados</small>
          </div>

        </article>

        <article className="estado-resumen-card">

          <div className="estado-card-icon naranja">
            <Clock size={21} />
          </div>

          <div>
            <span>Saldo pendiente</span>

            <strong>
              {formatoDinero(resumen.saldoPendiente)}
            </strong>

            <small>Saldo por cobrar</small>
          </div>

        </article>

      </section>

      {/* TABLA DE CLIENTES */}

      <section className="estado-tabla-container">

        <div className="estado-tabla-header">

          <div>
            <h2>Resumen financiero</h2>
            <p>Información financiera agrupada por cliente.</p>
          </div>

          <div className="estado-busqueda">

            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar cliente, código o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

          </div>

        </div>

        {/* ERRORES */}

        {error && (

          <div className="estado-error">

            <AlertCircle size={18} />

            <span>{error}</span>

            <button
              type="button"
              onClick={() => cargarEstado()}
            >
              Reintentar
            </button>

          </div>

        )}

        {/* CARGANDO */}

        {cargando ? (

          <div className="estado-vacio">

            <RefreshCw size={27} className="girando" />

            <p>Cargando información financiera...</p>

          </div>

        ) : clientesFiltrados.length === 0 ? (

          <div className="estado-vacio">

            <Users size={34} />

            <h3>No se encontraron clientes</h3>

            <p>
              {busqueda
                ? "Intenta con otro nombre o código."
                : "Todavía no hay clientes registrados."}
            </p>

          </div>

        ) : (

          <div className="estado-tabla-scroll">

            <table className="estado-tabla">

              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Total contratado</th>
                  <th>Anticipos</th>
                  <th>Abonos</th>
                  <th>Total recibido</th>
                  <th>Saldo pendiente</th>
                  <th>Proyectos pendientes</th>
                  <th>Último pago</th>
                  <th>Detalle</th>
                </tr>
              </thead>

              <tbody>

                {clientesFiltrados.map((cliente) => (

                  <React.Fragment key={cliente._id}>

                    {/* FILA DEL CLIENTE */}

                    <tr>

                      <td>
                        <div className="estado-cliente-identidad">

                          <div className="estado-avatar">
                            {cliente.nombre?.charAt(0)?.toUpperCase() || "C"}
                          </div>

                          <div>
                            <strong>{cliente.nombre}</strong>
                            <small>{cliente.idCliente}</small>
                          </div>

                        </div>
                      </td>

                      <td className="estado-monto">
                        {formatoDinero(cliente.totalContratado)}
                      </td>

                      <td className="estado-monto">
                        {formatoDinero(cliente.anticipos)}
                      </td>

                      <td className="estado-monto">
                        {formatoDinero(cliente.abonos)}
                      </td>

                      <td className="estado-monto recibido">
                        {formatoDinero(cliente.totalRecibido)}
                      </td>

                      <td
                        className={`estado-monto ${
                          cliente.excedente > 0
                            ? "excedente"
                            : "pendiente"
                        }`}
                      >
                        {cliente.excedente > 0
                          ? `Excedente: ${formatoDinero(cliente.excedente)}`
                          : formatoDinero(cliente.saldoPendiente)}
                      </td>

                      <td>
                        <span className="estado-proyectos-badge">
                          <FolderKanban size={14} />
                          {cliente.proyectosPendientes}
                        </span>
                      </td>

                      <td>
                        <span className="estado-fecha">
                          {formatoFecha(cliente.ultimoAbono)}
                        </span>
                      </td>

                      <td>

                        <button
                          type="button"
                          className="estado-detalle-btn"
                          onClick={() =>
                            cambiarExpandido(cliente.idCliente)
                          }
                          title="Ver proyectos y detalle"
                        >
                          {clienteExpandido === cliente.idCliente ? (
                            <ChevronUp size={19} />
                          ) : (
                            <ChevronDown size={19} />
                          )}
                        </button>

                      </td>

                    </tr>

                    {/* DETALLE DEL CLIENTE */}

                    {clienteExpandido === cliente.idCliente && (

                      <tr className="estado-fila-detalle">

                        <td colSpan="9">

                          <div className="estado-detalle-contenido">

                            {/* CONTACTO */}

                            <div className="estado-contacto">

                              <div>
                                <Phone size={16} />
                                {cliente.telefono || "Sin teléfono"}
                              </div>

                              <div>
                                <Mail size={16} />
                                {cliente.correo || "Sin correo"}
                              </div>

                            </div>

                            {/* PROYECTOS */}

                            <h3>Proyectos del cliente</h3>

                            {cliente.proyectos?.length > 0 ? (

                              <div className="estado-proyectos-grid">

                                {cliente.proyectos.map((proyecto) => (

                                  <article
                                    className="estado-proyecto-card"
                                    key={proyecto._id}
                                  >

                                    <div className="estado-proyecto-top">

                                      <div>
                                        <small>
                                          {proyecto.idProyecto}
                                        </small>

                                        <h4>{proyecto.proyecto}</h4>

                                        <small className="estado-origen-monto">
                                          {proyecto.origenMonto ||
                                            "Origen de monto no disponible"}

                                          {proyecto.cotizacionReferencia
                                            ? ` · ${proyecto.cotizacionReferencia}`
                                            : ""}
                                        </small>
                                      </div>

                                      <span
                                        className={`estado-proyecto-estado ${
                                          proyecto.estado
                                            ?.toLowerCase()
                                            .replaceAll(" ", "-") || ""
                                        }`}
                                      >
                                        {proyecto.estado}
                                      </span>

                                    </div>

                                    {/* DATOS FINANCIEROS */}

                                    <div className="estado-proyecto-datos">

                                      <div>
                                        <span>Contratado</span>
                                        <strong>
                                          {formatoDinero(proyecto.montoContratado)}
                                        </strong>
                                      </div>

                                      <div>
                                        <span>Anticipos</span>
                                        <strong>
                                          {formatoDinero(proyecto.anticipos)}
                                        </strong>
                                      </div>

                                      <div>
                                        <span>Abonos</span>
                                        <strong>
                                          {formatoDinero(proyecto.abonos)}
                                        </strong>
                                      </div>

                                      <div>
                                        <span>Recibido</span>
                                        <strong>
                                          {formatoDinero(proyecto.totalRecibido)}
                                        </strong>
                                      </div>

                                      <div className="saldo-proyecto">
                                        <span>
                                          {proyecto.excedente > 0
                                            ? "Excedente"
                                            : "Saldo pendiente"}
                                        </span>

                                        <strong>
                                          {formatoDinero(
                                            proyecto.excedente > 0
                                              ? proyecto.excedente
                                              : proyecto.saldoPendiente
                                          )}
                                        </strong>
                                      </div>

                                    </div>

                                    {/* AVISO SIN MONTO */}

                                    {Number(proyecto.montoContratado) === 0 && (

                                      <div className="estado-aviso-monto">
                                        <AlertCircle size={15} />

                                        Este proyecto no tiene un monto contratado
                                        de referencia.
                                      </div>

                                    )}

                                    {/* HISTORIAL DE PAGOS */}

                                    <div className="estado-pagos">

                                      <h4>
                                        <Receipt size={17} />
                                        Historial de pagos (
                                        {proyecto.pagos?.length || 0})
                                      </h4>

                                      {proyecto.pagos?.length > 0 ? (

                                        <div className="estado-pagos-lista">

                                          {proyecto.pagos.map((pago) => {

                                            const editando =
                                              abonoEditando?.idAbono === pago.idAbono;

                                            return (

                                              <div
                                                className="estado-pago-item"
                                                key={pago._id || pago.idAbono}
                                              >

                                                {editando ? (

                                                  <form
                                                    className="estado-editar-pago"
                                                    onSubmit={guardarEdicion}
                                                  >

                                                    <div className="estado-form-grid">

                                                      <label>
                                                        Fecha

                                                        <input
                                                          type="date"
                                                          name="fecha"
                                                          value={formulario.fecha}
                                                          onChange={actualizarCampo}
                                                          required
                                                        />
                                                      </label>

                                                      <label>
                                                        Monto ($)

                                                        <input
                                                          type="number"
                                                          name="monto"
                                                          min="0.01"
                                                          step="0.01"
                                                          value={formulario.monto}
                                                          onChange={actualizarCampo}
                                                          required
                                                        />
                                                      </label>

                                                      <label>
                                                        Tipo de pago

                                                        <select
                                                          name="tipoPago"
                                                          value={formulario.tipoPago}
                                                          onChange={actualizarCampo}
                                                          required
                                                        >
                                                          <option value="Anticipo">
                                                            Anticipo
                                                          </option>

                                                          <option value="Abono">
                                                            Abono
                                                          </option>
                                                        </select>
                                                      </label>

                                                      <label>
                                                        Forma de pago

                                                        <input
                                                          type="text"
                                                          name="formaPago"
                                                          value={formulario.formaPago}
                                                          onChange={actualizarCampo}
                                                          required
                                                        />
                                                      </label>

                                                      <label className="estado-referencia-field">
                                                        Referencia

                                                        <input
                                                          type="text"
                                                          name="referencia"
                                                          value={formulario.referencia}
                                                          onChange={actualizarCampo}
                                                          placeholder="Número de referencia"
                                                        />
                                                      </label>

                                                    </div>

                                                    <div className="estado-form-acciones">

                                                      <button
                                                        type="submit"
                                                        className="estado-guardar-btn"
                                                        disabled={guardando}
                                                      >
                                                        <Save size={16} />

                                                        {guardando
                                                          ? "Guardando..."
                                                          : "Guardar cambios"}
                                                      </button>

                                                      <button
                                                        type="button"
                                                        className="estado-cancelar-btn"
                                                        onClick={cancelarEdicion}
                                                        disabled={guardando}
                                                      >
                                                        <X size={16} />
                                                        Cancelar
                                                      </button>

                                                    </div>

                                                  </form>

                                                ) : (

                                                  <>

                                                    <div className="estado-pago-info">

                                                      <div className="estado-pago-icono">
                                                        <CreditCard size={19} />
                                                      </div>

                                                      <div>
                                                        <strong>{pago.idAbono}</strong>

                                                        <small>
                                                          {formatoFecha(pago.fecha)}
                                                          {" · "}
                                                          {pago.formaPago}
                                                        </small>

                                                        {pago.referencia && (
                                                          <small>
                                                            Referencia: {pago.referencia}
                                                          </small>
                                                        )}

                                                      </div>

                                                    </div>

                                                    <div className="estado-pago-monto">

                                                      <span
                                                        className={
                                                          pago.tipoPago === "Anticipo"
                                                            ? "pago-anticipo"
                                                            : "pago-abono"
                                                        }
                                                      >
                                                        {pago.tipoPago || "Abono"}
                                                      </span>

                                                      <strong>
                                                        {formatoDinero(pago.monto)}
                                                      </strong>

                                                    </div>

                                                    <button
                                                      type="button"
                                                      className="estado-editar-btn"
                                                      onClick={() =>
                                                        iniciarEdicion(pago, proyecto)
                                                      }
                                                      title="Editar pago"
                                                    >
                                                      <Pencil size={16} />
                                                      Editar
                                                    </button>

                                                  </>

                                                )}

                                              </div>

                                            );

                                          })}

                                        </div>

                                      ) : (

                                        <p className="estado-sin-proyectos">
                                          Este proyecto todavía no tiene pagos registrados.
                                        </p>

                                      )}

                                    </div>

                                  </article>

                                ))}

                              </div>

                            ) : (

                              <p className="estado-sin-proyectos">
                                Este cliente todavía no tiene proyectos.
                              </p>

                            )}

                            {/* COTIZACIONES SIN PROYECTO */}

                            {cliente.cotizacionesSinProyecto?.length > 0 && (

                              <>

                                <h3>
                                  Cotizaciones aceptadas sin proyecto
                                </h3>

                                <div className="estado-cotizaciones">

                                  {cliente.cotizacionesSinProyecto.map(
                                    (cotizacion) => (

                                      <div key={cotizacion.idCotizacion}>

                                        <span>
                                          {cotizacion.idCotizacion}
                                        </span>

                                        <span>
                                          <CalendarDays size={14} />
                                          {formatoFecha(cotizacion.fecha)}
                                        </span>

                                        <strong>
                                          {formatoDinero(cotizacion.totalGeneral)}
                                        </strong>

                                      </div>

                                    )
                                  )}

                                </div>

                              </>

                            )}

                          </div>

                        </td>

                      </tr>

                    )}

                  </React.Fragment>

                ))}

              </tbody>

            </table>

          </div>

        )}

        {/* PIE DE TABLA */}

        <div className="estado-tabla-footer">
          Mostrando {clientesFiltrados.length} de {clientes.length} clientes
        </div>

      </section>

    </main>
  );
}

export default EstadoCliente;
