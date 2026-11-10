
import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  Clock,
  CircleDollarSign,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  CalendarDays,
  FolderKanban,
  UserRound,
  CreditCard,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Receipt,
} from "lucide-react";

import api from "../services/api";
import notificaciones from "../utils/notificaciones";
import "../styles/abonos.css";

const formatoMoneda = (cantidad = 0) =>
  new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(Number(cantidad) || 0);

const fechaLocal = (fecha) => {
  if (!fecha) return "";

  const date = new Date(fecha);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const fechaVisible = (fecha) => {
  if (!fecha) return "—";

  return new Date(fecha).toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const datosIniciales = {
  idProyecto: "",
  fecha: fechaLocal(new Date()),
  monto: "",
  tipoPago: "Abono",
  formaPago: "",
  referencia: "",
};

function Abonos() {
  const [abonos, setAbonos] = useState([]);
  const [proyectos, setProyectos] = useState([]);

  const [resumenGeneral, setResumenGeneral] = useState({
    totalContratado: 0,
    totalAbonado: 0,
    totalPendiente: 0,
    totalExcedente: 0,
    cantidadProyectos: 0,
  });

  const [resumenesProyectos, setResumenesProyectos] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroProyecto, setFiltroProyecto] = useState("todos");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [abonoEditar, setAbonoEditar] = useState(null);
  const [formulario, setFormulario] = useState(datosIniciales);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // ======================================
  // CARGAR INFORMACIÓN
  // ======================================

  const cargarDatos = async () => {
    try {
      setCargando(true);

      const [
        respuestaAbonos,
        respuestaProyectos,
        respuestaResumen,
      ] = await Promise.all([
        api.get("/abonos"),
        api.get("/proyectos"),
        api.get("/abonos/resumen"),
      ]);

      setAbonos(respuestaAbonos.data.abonos || []);
      setProyectos(respuestaProyectos.data.proyectos || []);

      setResumenGeneral(
        respuestaResumen.data.resumenGeneral || {
          totalContratado: 0,
          totalAbonado: 0,
          totalPendiente: 0,
          totalExcedente: 0,
          cantidadProyectos: 0,
        }
      );

      setResumenesProyectos(
        respuestaResumen.data.proyectos || []
      );

    } catch (error) {
      console.error("Error al cargar abonos:", error);

      notificaciones.error(
        "No fue posible cargar la información de abonos."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ======================================
  // PROYECTO SELECCIONADO
  // ======================================

  const proyectoSeleccionado = useMemo(() => {
    return proyectos.find(
      (proyecto) =>
        proyecto.idProyecto === formulario.idProyecto
    );
  }, [proyectos, formulario.idProyecto]);

  // Cliente asociado al proyecto.
  const clienteSeleccionado = proyectoSeleccionado?.idCliente;

  // ======================================
  // RESUMEN DEL PROYECTO SELECCIONADO
  // ======================================

  const resumenProyectoSeleccionado = useMemo(() => {
    return resumenesProyectos.find(
      (item) => item.idProyecto === formulario.idProyecto
    );
  }, [resumenesProyectos, formulario.idProyecto]);

  // El monto contratado puede venir de una cotización aceptada
  // o del monto registrado directamente en el proyecto.
  const montoContratado = Number(
    resumenProyectoSeleccionado?.montoContratado ||
    proyectoSeleccionado?.montoContratado ||
    0
  );

  // Total de pagos registrados actualmente.
  const totalActualProyecto = Number(
    resumenProyectoSeleccionado?.totalAbonado ??
    resumenProyectoSeleccionado?.totalRecibido ??
    0
  );

  // Monto anterior del pago que se está editando.
  const montoAnterior = Number(abonoEditar?.monto || 0);

  // ======================================
  // CALCULAR SALDO Y EXCEDENTE EN TIEMPO REAL
  // ======================================

  const totalConEdicion = useMemo(() => {
    if (!proyectoSeleccionado) return 0;

    const pagoAnteriorDelProyecto =
      abonoEditar?.proyectoOriginal === formulario.idProyecto
        ? montoAnterior
        : 0;

    const nuevoMonto = Number(formulario.monto) || 0;

    return (
      totalActualProyecto -
      pagoAnteriorDelProyecto +
      nuevoMonto
    );
  }, [
    proyectoSeleccionado,
    abonoEditar,
    formulario.idProyecto,
    formulario.monto,
    montoAnterior,
    totalActualProyecto,
  ]);

  const saldoPendienteCalculado = Math.max(
    montoContratado - totalConEdicion,
    0
  );

  const excedenteCalculado = Math.max(
    totalConEdicion - montoContratado,
    0
  );

  // ======================================
  // FILTRAR HISTORIAL
  // ======================================

  const abonosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return abonos.filter((abono) => {
      const proyecto = abono.idProyecto || {};
      const cliente = abono.idCliente || {};

      const coincideTexto =
        !texto ||
        String(abono.idAbono || "").toLowerCase().includes(texto) ||
        String(proyecto.idProyecto || "").toLowerCase().includes(texto) ||
        String(proyecto.proyecto || "").toLowerCase().includes(texto) ||
        String(cliente.nombre || "").toLowerCase().includes(texto) ||
        String(cliente.idCliente || "").toLowerCase().includes(texto) ||
        String(abono.referencia || "").toLowerCase().includes(texto);

      const coincideProyecto =
        filtroProyecto === "todos" ||
        proyecto.idProyecto === filtroProyecto;

      return coincideTexto && coincideProyecto;
    });
  }, [abonos, busqueda, filtroProyecto]);

  // ======================================
  // ABRIR MODAL NUEVO ABONO
  // ======================================

  const abrirNuevoAbono = () => {
    setAbonoEditar(null);

    setFormulario({
      ...datosIniciales,
      fecha: fechaLocal(new Date()),
    });

    setModalAbierto(true);
  };

  // ======================================
  // ABRIR MODAL EDITAR ABONO
  // ======================================

  const abrirEditarAbono = (abono) => {
    setAbonoEditar({
      ...abono,
      proyectoOriginal: abono.idProyecto?.idProyecto || "",
    });

    setFormulario({
      idProyecto: abono.idProyecto?.idProyecto || "",
      fecha: fechaLocal(abono.fecha),
      monto: String(abono.monto ?? ""),
      tipoPago: abono.tipoPago || "Abono",
      formaPago: abono.formaPago || "",
      referencia: abono.referencia || "",
    });

    setModalAbierto(true);
  };

  // ======================================
  // CERRAR MODAL
  // ======================================

  const cerrarModal = () => {
    if (guardando) return;

    setModalAbierto(false);
    setAbonoEditar(null);
    setFormulario({
      ...datosIniciales,
      fecha: fechaLocal(new Date()),
    });
  };

  // ======================================
  // MANEJAR FORMULARIO
  // ======================================

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  // ======================================
  // GUARDAR ABONO
  // ======================================

  const guardarAbono = async (e) => {
    e.preventDefault();

    if (!formulario.idProyecto) {
      notificaciones.error("Debes seleccionar un proyecto.");
      return;
    }

    if (!formulario.fecha) {
      notificaciones.error("Debes seleccionar una fecha.");
      return;
    }

    const monto = Number(formulario.monto);

    if (!Number.isFinite(monto) || monto <= 0) {
      notificaciones.error("El monto debe ser mayor que cero.");
      return;
    }

    if (!formulario.tipoPago) {
      notificaciones.error("Debes seleccionar el tipo de pago.");
      return;
    }

    if (!formulario.formaPago) {
      notificaciones.error("Debes seleccionar una forma de pago.");
      return;
    }

    if (!clienteSeleccionado) {
      notificaciones.error(
        "El proyecto seleccionado no tiene un cliente asociado."
      );
      return;
    }

    const datos = {
      idProyecto: formulario.idProyecto,
      fecha: formulario.fecha,
      monto,
      tipoPago: formulario.tipoPago,
      formaPago: formulario.formaPago,
      referencia: formulario.referencia.trim(),
    };

    try {
      setGuardando(true);

      if (abonoEditar) {
        await api.put(
          `/abonos/${abonoEditar.idAbono}`,
          datos
        );

        notificaciones.success(
          "Abono actualizado correctamente."
        );
      } else {
        await api.post("/abonos", datos);

        notificaciones.success(
          "Abono registrado correctamente."
        );
      }

      setModalAbierto(false);
      setAbonoEditar(null);

      setFormulario({
        ...datosIniciales,
        fecha: fechaLocal(new Date()),
      });

      await cargarDatos();

    } catch (error) {
      console.error("Error al guardar abono:", error);

      notificaciones.error(
        error.response?.data?.message ||
        "No fue posible guardar el abono."
      );
    } finally {
      setGuardando(false);
    }
  };

  // ======================================
  // ELIMINAR ABONO
  // ======================================

  const eliminarAbono = async (abono) => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar el abono ${abono.idAbono}?`
    );

    if (!confirmar) return;

    try {
      await api.delete(`/abonos/${abono.idAbono}`);

      notificaciones.success(
        "Abono eliminado correctamente."
      );

      await cargarDatos();

    } catch (error) {
      console.error("Error al eliminar abono:", error);

      notificaciones.error(
        error.response?.data?.message ||
        "No fue posible eliminar el abono."
      );
    }
  };

  // ======================================
  // RENDERIZADO
  // ======================================

  return (
    <section className="abonos-page">

      {/* ENCABEZADO */}

      <header className="abonos-header">

        <div className="abonos-header-info">

          <div className="abonos-header-icon">
            <Wallet size={27} />
          </div>

          <div>
            <span className="abonos-eyebrow">
              CONTROL FINANCIERO
            </span>

            <h1>Gestión de abonos</h1>

            <p>
              Administra los pagos y saldos de tus proyectos.
            </p>
          </div>

        </div>

        <div className="abonos-header-actions">

          <button
            type="button"
            className="abonos-btn-secondary"
            onClick={cargarDatos}
            disabled={cargando || guardando}
          >
            <RefreshCw
              size={17}
              className={cargando ? "abonos-spin" : ""}
            />
            Actualizar
          </button>

          <button
            type="button"
            className="abonos-btn-primary"
            onClick={abrirNuevoAbono}
          >
            <Plus size={19} />
            Registrar abono
          </button>

        </div>

      </header>

      {/* TARJETAS DE RESUMEN */}

      <div className="abonos-stats-grid">

        <div className="abonos-stat-card">

          <div className="abonos-stat-top">

            <div className="abonos-stat-icon stat-blue">
              <CircleDollarSign size={22} />
            </div>

            <span className="abonos-stat-label">
              Total contratado
            </span>

          </div>

          <h2>
            {formatoMoneda(resumenGeneral.totalContratado)}
          </h2>

          <p>
            Monto de referencia de los proyectos
          </p>

        </div>

        <div className="abonos-stat-card">

          <div className="abonos-stat-top">

            <div className="abonos-stat-icon stat-green">
              <TrendingUp size={22} />
            </div>

            <span className="abonos-stat-label">
              Total abonado
            </span>

          </div>

          <h2>
            {formatoMoneda(resumenGeneral.totalAbonado)}
          </h2>

          <p>
            Pagos registrados hasta la fecha
          </p>

        </div>

        <div className="abonos-stat-card">

          <div className="abonos-stat-top">

            <div className="abonos-stat-icon stat-orange">
              <Clock size={22} />
            </div>

            <span className="abonos-stat-label">
              Saldo pendiente
            </span>

          </div>

          <h2>
            {formatoMoneda(resumenGeneral.totalPendiente)}
          </h2>

          <p>
            Total que falta por cobrar
          </p>

        </div>

        <div className="abonos-stat-card">

          <div className="abonos-stat-top">

            <div className="abonos-stat-icon stat-purple">
              <ArrowUpRight size={22} />
            </div>

            <span className="abonos-stat-label">
              Excedente
            </span>

          </div>

          <h2>
            {formatoMoneda(resumenGeneral.totalExcedente)}
          </h2>

          <p>
            Pagos superiores al monto contratado
          </p>

        </div>

      </div>

      {/* RESUMEN POR PROYECTO */}

      <div className="abonos-section-card">

        <div className="abonos-section-heading">

          <div>
            <h2>Control de pagos por proyecto</h2>

            <p>
              Consulta el avance de cobros de cada proyecto.
            </p>
          </div>

          <span className="abonos-count">
            {resumenesProyectos.length} proyectos
          </span>

        </div>

        {cargando ? (

          <div className="abonos-loading">
            <RefreshCw size={22} className="abonos-spin" />
            <span>Cargando información...</span>
          </div>

        ) : resumenesProyectos.length === 0 ? (

          <div className="abonos-empty">
            <FolderKanban size={35} />

            <h3>No hay proyectos registrados</h3>

            <p>
              Cuando registres proyectos, aparecerán aquí.
            </p>
          </div>

        ) : (

          <div className="abonos-projects-grid">

            {resumenesProyectos.map((item) => (

              <article
                className="abonos-project-card"
                key={item.idProyecto}
              >

                <div className="abonos-project-card-top">

                  <div className="abonos-project-symbol">
                    <FolderKanban size={19} />
                  </div>

                  <span className="abonos-project-code">
                    {item.idProyecto}
                  </span>

                </div>

                <h3>{item.proyecto}</h3>

                <div className="abonos-project-client">
                  <UserRound size={15} />
                  <span>{item.cliente || "Sin cliente"}</span>
                </div>

                <div className="abonos-project-values">

                  <div>
                    <span>Contratado</span>

                    <strong>
                      {formatoMoneda(item.montoContratado)}
                    </strong>
                  </div>

                  <div>
                    <span>Abonado</span>

                    <strong className="amount-paid">
                      {formatoMoneda(
                        item.totalAbonado ?? item.totalRecibido
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Pendiente</span>

                    <strong className="amount-pending">
                      {formatoMoneda(item.saldoPendiente)}
                    </strong>
                  </div>

                </div>

                <div className="abonos-progress-area">

                  <div className="abonos-progress-info">

                    <span>Avance de pago</span>

                    <strong>
                      {Number(item.porcentajePagado || 0).toFixed(1)}%
                    </strong>

                  </div>

                  <div className="abonos-progress-track">

                    <div
                      className="abonos-progress-fill"
                      style={{
                        width: `${Math.min(
                          Number(item.porcentajePagado || 0),
                          100
                        )}%`,
                      }}
                    />

                  </div>

                </div>

                {item.excedente > 0 && (

                  <div className="abonos-excedent-notice">
                    <CheckCircle2 size={15} />

                    Excedente: {formatoMoneda(item.excedente)}
                  </div>

                )}

                {Number(item.montoContratado) === 0 && (

                  <div className="abonos-no-reference">
                    <AlertCircle size={15} />

                    Sin monto contratado de referencia
                  </div>

                )}

                <div className="abonos-project-footer">

                  <span>
                    {item.cantidadPagos ?? item.cantidadAbonos ?? 0} pagos registrados
                  </span>

                  <Receipt size={16} />

                </div>

              </article>

            ))}

          </div>

        )}

      </div>

      {/* HISTORIAL */}

      <div className="abonos-section-card abonos-history-card">

        <div className="abonos-section-heading">

          <div>
            <h2>Historial de abonos</h2>

            <p>
              Consulta, modifica o elimina los pagos registrados.
            </p>
          </div>

          <span className="abonos-count">
            {abonosFiltrados.length} registros
          </span>

        </div>

        {/* FILTROS */}

        <div className="abonos-filters">

          <div className="abonos-search">

            <Search size={19} />

            <input
              type="text"
              placeholder="Buscar por abono, proyecto o cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            {busqueda && (

              <button
                type="button"
                onClick={() => setBusqueda("")}
                title="Limpiar búsqueda"
              >
                <X size={17} />
              </button>

            )}

          </div>

          <div className="abonos-filter-select">

            <FolderKanban size={17} />

            <select
              value={filtroProyecto}
              onChange={(e) => setFiltroProyecto(e.target.value)}
            >

              <option value="todos">
                Todos los proyectos
              </option>

              {proyectos.map((proyecto) => (

                <option
                  key={proyecto._id}
                  value={proyecto.idProyecto}
                >
                  {proyecto.idProyecto} - {proyecto.proyecto}
                </option>

              ))}

            </select>

          </div>

        </div>

        {/* TABLA */}

        {cargando ? (

          <div className="abonos-loading">
            <RefreshCw size={22} className="abonos-spin" />
            <span>Cargando historial...</span>
          </div>

        ) : abonosFiltrados.length === 0 ? (

          <div className="abonos-empty">

            <Wallet size={38} />

            <h3>No se encontraron abonos</h3>

            <p>
              {abonos.length === 0
                ? "Todavía no has registrado ningún abono."
                : "Prueba modificando los filtros de búsqueda."}
            </p>

            {abonos.length === 0 && (

              <button
                type="button"
                className="abonos-btn-primary"
                onClick={abrirNuevoAbono}
              >
                <Plus size={17} />
                Registrar primer abono
              </button>

            )}

          </div>

        ) : (

          <div className="abonos-table-container">

            <table className="abonos-table">

              <thead>
                <tr>
                  <th>ID Abono</th>
                  <th>Fecha</th>
                  <th>Proyecto</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Forma de pago</th>
                  <th>Referencia / Nota</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>

                {abonosFiltrados.map((abono) => (

                  <tr key={abono._id}>

                    <td>
                      <span className="abonos-id">
                        {abono.idAbono}
                      </span>
                    </td>

                    <td>
                      <div className="abonos-date-cell">
                        <CalendarDays size={15} />
                        {fechaVisible(abono.fecha)}
                      </div>
                    </td>

                    <td>
                      <div className="abonos-project-cell">

                        <strong>
                          {abono.idProyecto?.idProyecto || "—"}
                        </strong>

                        <span>
                          {abono.idProyecto?.proyecto || "Sin proyecto"}
                        </span>

                      </div>
                    </td>

                    <td>
                      <div className="abonos-client-cell">

                        <strong>
                          {abono.idCliente?.nombre || "Sin cliente"}
                        </strong>

                        <span>
                          {abono.idCliente?.idCliente || "—"}
                        </span>

                      </div>
                    </td>

                    <td>
                      <span
                        className={
                          abono.tipoPago === "Anticipo"
                            ? "pago-anticipo"
                            : "pago-abono"
                        }
                      >
                        {abono.tipoPago || "Abono"}
                      </span>
                    </td>

                    <td>
                      <strong className="abonos-amount-cell">
                        {formatoMoneda(abono.monto)}
                      </strong>
                    </td>

                    <td>
                      <span className="abonos-payment-method">
                        <CreditCard size={14} />
                        {abono.formaPago}
                      </span>
                    </td>

                    <td>
                      <span className="abonos-reference">
                        {abono.referencia || "Sin referencia"}
                      </span>
                    </td>

                    <td>

                      <div className="abonos-actions">

                        <button
                          type="button"
                          className="abonos-action-edit"
                          title="Editar abono"
                          onClick={() => abrirEditarAbono(abono)}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className="abonos-action-delete"
                          title="Eliminar abono"
                          onClick={() => eliminarAbono(abono)}
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* MODAL DE REGISTRO Y EDICIÓN */}

      {modalAbierto && (

        <div
          className="abonos-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >

          <div className="abonos-modal">

            <div className="abonos-modal-header">

              <div className="abonos-modal-title">

                <div className="abonos-modal-icon">

                  {abonoEditar ? (
                    <Pencil size={21} />
                  ) : (
                    <Wallet size={22} />
                  )}

                </div>

                <div>

                  <span>CONTROL DE PAGOS</span>

                  <h2>
                    {abonoEditar ? "Editar abono" : "Nuevo abono"}
                  </h2>

                  <p>
                    {abonoEditar
                      ? `Modificando ${abonoEditar.idAbono}`
                      : "Registra un pago asociado a un proyecto."}
                  </p>

                </div>

              </div>

              <button
                type="button"
                className="abonos-modal-close"
                onClick={cerrarModal}
                disabled={guardando}
              >
                <X size={21} />
              </button>

            </div>

            <form
              className="abonos-form"
              onSubmit={guardarAbono}
            >

              {/* PROYECTO */}

              <div className="abonos-form-group full">

                <label htmlFor="idProyecto">
                  Proyecto <span>*</span>
                </label>

                <div className="abonos-input-icon">

                  <FolderKanban size={18} />

                  <select
                    id="idProyecto"
                    name="idProyecto"
                    value={formulario.idProyecto}
                    onChange={manejarCambio}
                    required
                  >

                    <option value="">
                      Selecciona un proyecto
                    </option>

                    {proyectos.map((proyecto) => (

                      <option
                        key={proyecto._id}
                        value={proyecto.idProyecto}
                      >
                        {proyecto.idProyecto} - {proyecto.proyecto}
                      </option>

                    ))}

                  </select>

                </div>

              </div>

              {/* CLIENTE ASOCIADO */}

              <div className="abonos-client-preview">

                <div className="abonos-client-preview-icon">
                  <UserRound size={21} />
                </div>

                <div>

                  <span>CLIENTE ASOCIADO</span>

                  <strong>
                    {clienteSeleccionado?.nombre ||
                      "Selecciona un proyecto"}
                  </strong>

                  <small>
                    {clienteSeleccionado?.idCliente
                      ? `Código: ${clienteSeleccionado.idCliente}`
                      : "El cliente se completará automáticamente"}
                  </small>

                </div>

                {clienteSeleccionado && (

                  <CheckCircle2
                    size={20}
                    className="abonos-client-check"
                  />

                )}

              </div>

              {/* MONTO Y SALDO */}

              {proyectoSeleccionado && (

                <div className="abonos-reference-box">

                  <div>

                    <span>Monto contratado de referencia</span>

                    <strong>
                      {formatoMoneda(montoContratado)}
                    </strong>

                  </div>

                  <div>

                    <span>Saldo pendiente</span>

                    <strong>
                      {formatoMoneda(
                        abonoEditar
                          ? saldoPendienteCalculado
                          : resumenProyectoSeleccionado?.saldoPendiente ?? 0
                      )}
                    </strong>

                  </div>

                  {excedenteCalculado > 0 && (

                    <div>

                      <span>Excedente proyectado</span>

                      <strong>
                        {formatoMoneda(excedenteCalculado)}
                      </strong>

                    </div>

                  )}

                  {montoContratado === 0 && (

                    <div className="abonos-no-reference">
                      <AlertCircle size={15} />
                      Este proyecto no tiene monto contratado de referencia.
                    </div>

                  )}

                </div>

              )}

              {/* CAMPOS */}

              <div className="abonos-form-grid">

                {/* FECHA */}

                <div className="abonos-form-group">

                  <label htmlFor="fecha">
                    Fecha del pago <span>*</span>
                  </label>

                  <div className="abonos-input-icon">

                    <CalendarDays size={18} />

                    <input
                      id="fecha"
                      type="date"
                      name="fecha"
                      value={formulario.fecha}
                      onChange={manejarCambio}
                      required
                    />

                  </div>

                </div>

                {/* MONTO */}

                <div className="abonos-form-group">

                  <label htmlFor="monto">
                    Monto del pago <span>*</span>
                  </label>

                  <div className="abonos-input-icon">

                    <span className="abonos-currency-symbol">
                      $
                    </span>

                    <input
                      id="monto"
                      type="number"
                      name="monto"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={formulario.monto}
                      onChange={manejarCambio}
                      required
                    />

                  </div>

                </div>

                {/* TIPO DE PAGO */}

                <div className="abonos-form-group">

                  <label htmlFor="tipoPago">
                    Tipo de pago <span>*</span>
                  </label>

                  <div className="abonos-input-icon">

                    <Wallet size={18} />

                    <select
                      id="tipoPago"
                      name="tipoPago"
                      value={formulario.tipoPago}
                      onChange={manejarCambio}
                      required
                    >

                      <option value="Anticipo">
                        Anticipo
                      </option>

                      <option value="Abono">
                        Abono
                      </option>

                    </select>

                  </div>

                </div>

                {/* FORMA DE PAGO */}

                <div className="abonos-form-group">

                  <label htmlFor="formaPago">
                    Forma de pago <span>*</span>
                  </label>

                  <div className="abonos-input-icon">

                    <CreditCard size={18} />

                    <select
                      id="formaPago"
                      name="formaPago"
                      value={formulario.formaPago}
                      onChange={manejarCambio}
                      required
                    >

                      <option value="">
                        Selecciona una forma
                      </option>

                      <option value="Efectivo">
                        Efectivo
                      </option>

                      <option value="Transferencia">
                        Transferencia bancaria
                      </option>

                      <option value="Depósito">
                        Depósito
                      </option>

                      <option value="Cheque">
                        Cheque
                      </option>

                      <option value="Tarjeta">
                        Tarjeta
                      </option>

                      <option value="Otro">
                        Otro
                      </option>

                    </select>

                  </div>

                </div>

                {/* REFERENCIA */}

                <div className="abonos-form-group full">

                  <label htmlFor="referencia">
                    Referencia / Nota
                  </label>

                  <div className="abonos-input-icon textarea-icon">

                    <FileText size={18} />

                    <textarea
                      id="referencia"
                      name="referencia"
                      rows="3"
                      placeholder="Número de comprobante, observaciones o detalles..."
                      value={formulario.referencia}
                      onChange={manejarCambio}
                    />

                  </div>

                </div>

              </div>

              {/* BOTONES */}

              <div className="abonos-modal-footer">

                <button
                  type="button"
                  className="abonos-btn-cancel"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="abonos-btn-primary"
                  disabled={guardando}
                >

                  {guardando ? (

                    <>
                      <RefreshCw
                        size={17}
                        className="abonos-spin"
                      />

                      Guardando...

                    </>

                  ) : (

                    <>
                      <Save size={18} />

                      {abonoEditar
                        ? "Guardar cambios"
                        : "Registrar abono"}
                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </section>
  );
}

export default Abonos;
