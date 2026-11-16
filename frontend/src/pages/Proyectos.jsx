import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  Search, Plus, Pencil, Trash2, X, FolderKanban, MapPin, Users,
  LoaderCircle, Eye, RefreshCw, BriefcaseBusiness, CircleCheck,
  Clock3, CircleAlert, Building2, ClipboardList,
} from "lucide-react";

import api from "../services/api";
import "../styles/proyectos.css";
import notificaciones from "../utils/notificaciones";

// Estados originales del sistema.
const estados = ["Pendiente", "Aprobado", "Perdido"];

const formularioInicial = {
  idCliente: "",
  proyecto: "",
  ubicacion: "",
  estado: "Pendiente",
};

const normalizarTexto = (valor) =>
  String(valor ?? "").toLocaleLowerCase("es-SV").trim();

const capitalizarPalabras = (texto = "") =>
  texto.replace(/(^|[\s])(\p{L})/gu, (coincidencia, espacio, letra) =>
    espacio + letra.toLocaleUpperCase("es-SV")
  );

const validarNombreProyecto = (texto = "") =>
  texto.replace(/[^\p{L}\p{N}\s.,&'()/-]/gu, "");

const validarUbicacion = (texto = "") =>
  texto.replace(/[^\p{L}\p{N}\s.,#/-]/gu, "");

function Proyectos() {
  const [proyectos, setProyectos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [proyectoDetalle, setProyectoDetalle] = useState(null);
  const [proyectoEditar, setProyectoEditar] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  const cargarDatos = async (mostrarCarga = true) => {
    try {
      if (mostrarCarga) setCargando(true);
      setError("");

      const [respuestaProyectos, respuestaClientes] = await Promise.all([
        api.get("/proyectos"),
        api.get("/clientes"),
      ]);

      setProyectos(
        Array.isArray(respuestaProyectos.data?.proyectos)
          ? respuestaProyectos.data.proyectos
          : []
      );

      setClientes(
        Array.isArray(respuestaClientes.data?.clientes)
          ? respuestaClientes.data.clientes
          : []
      );
    } catch (err) {
      console.error("Error al cargar los datos:", err);

      const mensaje =
        "No fue posible cargar los proyectos y clientes. Verifica el backend.";

      setError(mensaje);
      notificaciones.error(mensaje);
    } finally {
      if (mostrarCarga) setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const obtenerCliente = (proyecto) => {
    if (proyecto?.idCliente && typeof proyecto.idCliente === "object") {
      return proyecto.idCliente;
    }

    const id = proyecto?.idCliente;

    return clientes.find((cliente) => cliente.idCliente === id) || null;
  };

  const proyectosFiltrados = useMemo(() => {
    const termino = normalizarTexto(busqueda);

    return proyectos.filter((proyecto) => {
      const cliente =
        proyecto.idCliente && typeof proyecto.idCliente === "object"
          ? proyecto.idCliente
          : clientes.find(
              (item) => item.idCliente === proyecto.idCliente
            );

      const coincideEstado =
        filtroEstado === "Todos" || proyecto.estado === filtroEstado;

      const campos = [
        proyecto.idProyecto,
        proyecto.proyecto,
        proyecto.ubicacion,
        proyecto.estado,
        cliente?.nombre,
        cliente?.idCliente,
      ];

      const coincideBusqueda =
        !termino ||
        campos.some((dato) => normalizarTexto(dato).includes(termino));

      return coincideEstado && coincideBusqueda;
    });
  }, [proyectos, clientes, busqueda, filtroEstado]);

  const estadisticas = useMemo(
    () => ({
      total: proyectos.length,
      pendientes: proyectos.filter((p) => p.estado === "Pendiente").length,
      aprobados: proyectos.filter((p) => p.estado === "Aprobado").length,
      perdidos: proyectos.filter((p) => p.estado === "Perdido").length,
    }),
    [proyectos]
  );

  const cambiarCampo = (e) => {
    const { name, value } = e.target;
    let nuevoValor = value;

    if (name === "proyecto") {
      nuevoValor = capitalizarPalabras(validarNombreProyecto(value));
    }

    if (name === "ubicacion") {
      nuevoValor = capitalizarPalabras(validarUbicacion(value));
    }

    setFormulario((anterior) => ({
      ...anterior,
      [name]: nuevoValor,
    }));

    setError("");
  };

  const validarFormulario = () => {
    if (!formulario.idCliente && !proyectoEditar) {
      return "Debes seleccionar un cliente.";
    }

    if (!formulario.proyecto.trim()) {
      return "El nombre del proyecto es obligatorio.";
    }

    if (formulario.proyecto.trim().length < 3) {
      return "El nombre del proyecto debe tener al menos 3 caracteres.";
    }

    if (formulario.proyecto.trim().length > 120) {
      return "El nombre del proyecto no puede superar los 120 caracteres.";
    }

    if (!formulario.ubicacion.trim()) {
      return "La ubicación del proyecto es obligatoria.";
    }

    if (formulario.ubicacion.trim().length < 3) {
      return "La ubicación debe tener al menos 3 caracteres.";
    }

    if (formulario.ubicacion.trim().length > 150) {
      return "La ubicación no puede superar los 150 caracteres.";
    }

    if (!estados.includes(formulario.estado)) {
      return "Selecciona un estado válido.";
    }

    return "";
  };

  const abrirNuevoProyecto = () => {
    setProyectoEditar(null);
    setFormulario(formularioInicial);
    setError("");
    setModalAbierto(true);
  };

  const abrirEditarProyecto = (proyecto) => {
    const cliente = obtenerCliente(proyecto);

    setProyectoEditar(proyecto);

    setFormulario({
      idCliente:
        cliente?.idCliente ||
        (typeof proyecto.idCliente === "string"
          ? proyecto.idCliente
          : ""),
      proyecto: proyecto.proyecto || "",
      ubicacion: proyecto.ubicacion || "",
      estado: proyecto.estado || "Pendiente",
    });

    setError("");
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;

    setModalAbierto(false);
    setProyectoEditar(null);
    setFormulario(formularioInicial);
    setError("");
  };

  const guardarProyecto = async (e) => {
    e.preventDefault();

    if (guardando) return;

    const mensajeValidacion = validarFormulario();

    if (mensajeValidacion) {
      setError(mensajeValidacion);
      notificaciones.error(mensajeValidacion);
      return;
    }

    const editando = Boolean(proyectoEditar);

    const datos = {
      proyecto: capitalizarPalabras(formulario.proyecto.trim()),
      ubicacion: capitalizarPalabras(formulario.ubicacion.trim()),
      estado: formulario.estado,
    };

    if (!editando) {
      datos.idCliente = formulario.idCliente;
    }

    const idToast = notificaciones.carga(
      editando ? "Actualizando proyecto..." : "Registrando proyecto..."
    );

    try {
      setGuardando(true);
      setError("");

      if (editando) {
        await api.put(
          `/proyectos/${proyectoEditar.idProyecto}`,
          datos
        );
      } else {
        await api.post("/proyectos", datos);
      }

      notificaciones.cerrar(idToast);

      notificaciones.exito(
        editando
          ? "¡Proyecto actualizado correctamente!"
          : "¡Proyecto registrado correctamente!"
      );

      setModalAbierto(false);
      setProyectoEditar(null);
      setFormulario(formularioInicial);

      await cargarDatos(false);
    } catch (err) {
      notificaciones.cerrar(idToast);

      console.error("Error al guardar proyecto:", err);

      const mensaje =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "No fue posible guardar el proyecto. Revisa los datos.";

      setError(mensaje);
      notificaciones.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProyecto = async (proyecto) => {
    if (eliminando) return;

    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar proyecto?",
      text: `Estás por eliminar ${
        proyecto.proyecto || proyecto.idProyecto
      }. Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#DC2626",
      cancelButtonColor: "#64748B",
      reverseButtons: true,
      customClass: {
        popup: "as-swal-popup",
      },
    });

    if (!confirmacion.isConfirmed) return;

    const idToast = notificaciones.carga("Eliminando proyecto...");

    try {
      setEliminando(true);

      await api.delete(`/proyectos/${proyecto.idProyecto}`);

      notificaciones.cerrar(idToast);
      notificaciones.exito("¡Proyecto eliminado correctamente!");

      if (proyectoDetalle?.idProyecto === proyecto.idProyecto) {
        setDetalleAbierto(false);
        setProyectoDetalle(null);
      }

      await cargarDatos(false);
    } catch (err) {
      notificaciones.cerrar(idToast);

      console.error("Error al eliminar proyecto:", err);

      notificaciones.error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "No fue posible eliminar el proyecto."
      );
    } finally {
      setEliminando(false);
    }
  };

  const abrirDetalle = (proyecto) => {
    setProyectoDetalle(proyecto);
    setDetalleAbierto(true);
  };

  const claseEstado = (estado = "") =>
    `proyecto-status proyecto-status--${normalizarTexto(estado).replaceAll(
      " ",
      "-"
    )}`;

  return (
    <main className="proyectos-page">
      <header className="proyectos-header">
        <div className="proyectos-header-copy">
          <span className="proyectos-eyebrow">
            A&amp;S ALUMINIO Y VIDRIO
          </span>

          <h1>Gestión de proyectos</h1>

          <p>
            Organiza, consulta y da seguimiento a los proyectos y sus
            clientes asociados.
          </p>
        </div>

        <div className="proyectos-header-actions">
          <button
            type="button"
            className="proyectos-btn proyectos-btn--outline"
            onClick={() => cargarDatos()}
            disabled={cargando}
          >
            <RefreshCw
              size={17}
              className={cargando ? "proyectos-spin" : ""}
            />
            Actualizar
          </button>

          <button
            type="button"
            className="proyectos-btn proyectos-btn--primary"
            onClick={abrirNuevoProyecto}
          >
            <Plus size={18} />
            Nuevo proyecto
          </button>
        </div>
      </header>

      <section
        className="proyectos-stats"
        aria-label="Indicadores de proyectos"
      >
        <article className="proyectos-stat-card">
          <span className="proyectos-stat-icon proyectos-stat-icon--blue">
            <FolderKanban size={21} />
          </span>

          <div>
            <span className="proyectos-stat-label">
              Total de proyectos
            </span>
            <strong>{estadisticas.total}</strong>
            <small>Registros existentes</small>
          </div>
        </article>

        <article className="proyectos-stat-card">
          <span className="proyectos-stat-icon proyectos-stat-icon--amber">
            <Clock3 size={21} />
          </span>

          <div>
            <span className="proyectos-stat-label">Pendientes</span>
            <strong>{estadisticas.pendientes}</strong>
            <small>Estado pendiente</small>
          </div>
        </article>

        <article className="proyectos-stat-card">
          <span className="proyectos-stat-icon proyectos-stat-icon--indigo">
            <CircleCheck size={21} />
          </span>

          <div>
            <span className="proyectos-stat-label">Aprobados</span>
            <strong>{estadisticas.aprobados}</strong>
            <small>Estado aprobado</small>
          </div>
        </article>

        <article className="proyectos-stat-card">
          <span className="proyectos-stat-icon proyectos-stat-icon--red">
            <CircleAlert size={21} />
          </span>

          <div>
            <span className="proyectos-stat-label">Perdidos</span>
            <strong>{estadisticas.perdidos}</strong>
            <small>Estado perdido</small>
          </div>
        </article>
      </section>
            <section className="proyectos-panel">
        <div className="proyectos-panel-heading">
          <div>
            <h2>Directorio de proyectos</h2>
            <p>Consulta los datos del proyecto y su cliente relacionado.</p>
          </div>
          <span className="proyectos-result-count">
            {proyectosFiltrados.length} resultados
          </span>
        </div>

        <div className="proyectos-toolbar">
          <label className="proyectos-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Buscar por proyecto, código, cliente o ubicación..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar proyectos"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <label className="proyectos-filter">
            <span>Estado</span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              aria-label="Filtrar por estado"
            >
              <option value="Todos">Todos los estados</option>
              {estados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && !modalAbierto && (
          <div className="proyectos-alert proyectos-alert--error">
            <CircleAlert size={17} />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Cerrar aviso"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {cargando ? (
          <div className="proyectos-empty">
            <LoaderCircle size={30} className="proyectos-spin" />
            <strong>Cargando proyectos...</strong>
            <span>Consultando proyectos y clientes registrados.</span>
          </div>
        ) : proyectosFiltrados.length === 0 ? (
          <div className="proyectos-empty">
            <span className="proyectos-empty-icon">
              <FolderKanban size={27} />
            </span>
            <strong>
              {busqueda || filtroEstado !== "Todos"
                ? "No se encontraron proyectos"
                : "Todavía no hay proyectos"}
            </strong>
            <span>
              {busqueda || filtroEstado !== "Todos"
                ? "Prueba modificando la búsqueda o el filtro."
                : "Registra un proyecto para comenzar a organizar el trabajo."}
            </span>

            {(busqueda || filtroEstado !== "Todos") && (
              <button
                type="button"
                className="proyectos-btn proyectos-btn--outline"
                onClick={() => {
                  setBusqueda("");
                  setFiltroEstado("Todos");
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="proyectos-table-wrap">
            <table className="proyectos-table">
              <thead>
                <tr>
                  <th>CÓDIGO</th>
                  <th>PROYECTO</th>
                  <th>CLIENTE ASOCIADO</th>
                  <th>UBICACIÓN</th>
                  <th>ESTADO</th>
                  <th className="proyectos-actions-head">ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {proyectosFiltrados.map((proyecto) => {
                  const cliente = obtenerCliente(proyecto);

                  return (
                    <tr key={proyecto._id || proyecto.idProyecto}>
                      <td>
                        <span className="proyectos-code">
                          {proyecto.idProyecto || "—"}
                        </span>
                      </td>

                      <td>
                        <div className="proyectos-project-cell">
                          <span className="proyectos-project-icon">
                            <FolderKanban size={17} />
                          </span>
                          <div>
                            <strong>
                              {proyecto.proyecto || "Sin nombre"}
                            </strong>
                            <small>Proyecto registrado</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="proyectos-client-link"
                          onClick={() => abrirDetalle(proyecto)}
                          title="Consultar proyecto y cliente"
                        >
                          <span className="proyectos-client-avatar">
                            {(cliente?.nombre || "?")
                              .trim()
                              .charAt(0)
                              .toLocaleUpperCase("es-SV")}
                          </span>
                          <span>
                            <strong>
                              {cliente?.nombre || "Cliente no disponible"}
                            </strong>
                            <small>
                              {cliente?.idCliente || "Sin código disponible"}
                            </small>
                          </span>
                        </button>
                      </td>

                      <td>
                        <span className="proyectos-location">
                          <MapPin size={15} />
                          {proyecto.ubicacion || "Sin ubicación"}
                        </span>
                      </td>

                      <td>
                        <span className={claseEstado(proyecto.estado)}>
                          {proyecto.estado || "Sin estado"}
                        </span>
                      </td>

                      <td>
                        <div className="proyectos-row-actions">
                          <button
                            type="button"
                            className="proyectos-icon-btn proyectos-icon-btn--view"
                            title="Visualizar proyecto"
                            aria-label={`Visualizar ${proyecto.proyecto}`}
                            onClick={() => abrirDetalle(proyecto)}
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            className="proyectos-icon-btn proyectos-icon-btn--edit"
                            title="Editar proyecto"
                            aria-label={`Editar ${proyecto.proyecto}`}
                            onClick={() => abrirEditarProyecto(proyecto)}
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            className="proyectos-icon-btn proyectos-icon-btn--delete"
                            title="Eliminar proyecto"
                            aria-label={`Eliminar ${proyecto.proyecto}`}
                            onClick={() => eliminarProyecto(proyecto)}
                            disabled={eliminando}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="proyectos-panel-footer">
          <span>
            Mostrando <strong>{proyectosFiltrados.length}</strong> de{" "}
            <strong>{proyectos.length}</strong> proyectos
          </span>
          <span>{clientes.length} clientes disponibles</span>
        </footer>
      </section>

      {modalAbierto && (
        <div
          className="proyectos-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <section
            className="proyectos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="proyectos-modal-title"
          >
            <header className="proyectos-modal-header">
              <div className="proyectos-modal-title-icon">
                <ClipboardList size={21} />
              </div>

              <div>
                <h2 id="proyectos-modal-title">
                  {proyectoEditar ? "Editar proyecto" : "Nuevo proyecto"}
                </h2>
                <p>
                  {proyectoEditar
                    ? `Código ${proyectoEditar.idProyecto}`
                    : "Completa la información para registrar el proyecto."}
                </p>
              </div>

              <button
                type="button"
                className="proyectos-modal-close"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={guardarProyecto}>
              <div className="proyectos-form-body">
                <div className="proyectos-form-section">
                  <div className="proyectos-form-section-title">
                    <Building2 size={17} />
                    <div>
                      <strong>Relación con el cliente</strong>
                      <span>
                        Selecciona el cliente registrado al que pertenece
                        este proyecto.
                      </span>
                    </div>
                  </div>

                  <div className="proyectos-field">
                    <label htmlFor="idCliente">
                      Cliente asociado <em>*</em>
                    </label>

                    <select
                      id="idCliente"
                      name="idCliente"
                      value={formulario.idCliente}
                      onChange={cambiarCampo}
                      required
                      disabled={Boolean(proyectoEditar)}
                    >
                      <option value="">
                        Seleccionar cliente existente
                      </option>

                      {clientes.map((cliente) => (
                        <option
                          key={cliente._id}
                          value={cliente.idCliente}
                        >
                          {cliente.idCliente} — {cliente.nombre}
                        </option>
                      ))}
                    </select>

                    {proyectoEditar && (
                      <small>
                        El cliente asociado no se puede cambiar desde esta
                        edición.
                      </small>
                    )}

                    {!proyectoEditar && clientes.length === 0 && (
                      <small>
                        No hay clientes registrados para asociar.
                      </small>
                    )}
                  </div>
                </div>

                <div className="proyectos-form-section">
                  <div className="proyectos-form-section-title">
                    <FolderKanban size={17} />
                    <div>
                      <strong>Información del proyecto</strong>
                      <span>
                        Identificación y ubicación del trabajo.
                      </span>
                    </div>
                  </div>

                  <div className="proyectos-form-grid">
                    <div className="proyectos-field proyectos-field--full">
                      <label htmlFor="proyecto">
                        Nombre del proyecto <em>*</em>
                      </label>
                      <input
                        id="proyecto"
                        name="proyecto"
                        value={formulario.proyecto}
                        onChange={cambiarCampo}
                        placeholder="Ej. Instalación de ventanas de aluminio"
                        minLength={3}
                        maxLength={120}
                        required
                      />
                      <small>
                        {formulario.proyecto.length}/120 caracteres
                      </small>
                    </div>

                    <div className="proyectos-field proyectos-field--full">
                      <label htmlFor="ubicacion">
                        Ubicación <em>*</em>
                      </label>
                      <input
                        id="ubicacion"
                        name="ubicacion"
                        value={formulario.ubicacion}
                        onChange={cambiarCampo}
                        placeholder="Ej. San Salvador, El Salvador"
                        minLength={3}
                        maxLength={150}
                        required
                      />
                      <small>
                        {formulario.ubicacion.length}/150 caracteres
                      </small>
                    </div>

                    <div className="proyectos-field proyectos-field--full">
                      <label htmlFor="estado">Estado del proyecto</label>
                      <select
                        id="estado"
                        name="estado"
                        value={formulario.estado}
                        onChange={cambiarCampo}
                      >
                        {estados.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="proyectos-alert proyectos-alert--error">
                    <CircleAlert size={17} />
                    {error}
                  </div>
                )}
              </div>

              <footer className="proyectos-modal-footer">
                <button
                  type="button"
                  className="proyectos-btn proyectos-btn--outline"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="proyectos-btn proyectos-btn--primary"
                  disabled={
                    guardando ||
                    (!proyectoEditar && clientes.length === 0)
                  }
                >
                  {guardando ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="proyectos-spin"
                      />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      {proyectoEditar
                        ? "Guardar cambios"
                        : "Registrar proyecto"}
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {detalleAbierto &&
        proyectoDetalle &&
        (() => {
          const cliente = obtenerCliente(proyectoDetalle);

          return (
            <div
              className="proyectos-overlay proyectos-overlay--detail"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  setDetalleAbierto(false);
                }
              }}
            >
              <aside
                className="proyectos-detail"
                role="dialog"
                aria-modal="true"
                aria-labelledby="proyectos-detail-title"
              >
                <header className="proyectos-detail-header">
                  <div>
                    <span className="proyectos-eyebrow">
                      DETALLE DEL REGISTRO
                    </span>
                    <h2 id="proyectos-detail-title">Proyecto</h2>
                  </div>

                  <button
                    type="button"
                    className="proyectos-modal-close"
                    onClick={() => setDetalleAbierto(false)}
                    aria-label="Cerrar detalle"
                  >
                    <X size={20} />
                  </button>
                </header>

                <div className="proyectos-detail-body">
                  <div className="proyectos-detail-hero">
                    <span className="proyectos-detail-symbol">
                      <FolderKanban size={24} />
                    </span>

                    <div>
                      <span className="proyectos-code">
                        {proyectoDetalle.idProyecto || "Sin código"}
                      </span>
                      <h3>{proyectoDetalle.proyecto}</h3>
                      <span className={claseEstado(proyectoDetalle.estado)}>
                        {proyectoDetalle.estado || "Sin estado"}
                      </span>
                    </div>
                  </div>

                  <section className="proyectos-detail-section">
                    <h3>Cliente asociado</h3>

                    <div className="proyectos-detail-client">
                      <span className="proyectos-client-avatar">
                        {(cliente?.nombre || "?")
                          .trim()
                          .charAt(0)
                          .toLocaleUpperCase("es-SV")}
                      </span>

                      <div>
                        <strong>
                          {cliente?.nombre || "Cliente no disponible"}
                        </strong>
                        <small>
                          {cliente?.idCliente || "Sin código disponible"}
                        </small>
                      </div>
                    </div>
                  </section>

                  <section className="proyectos-detail-section">
                    <h3>Información del proyecto</h3>

                    <div className="proyectos-detail-item">
                      <span>
                        <MapPin size={15} /> Ubicación
                      </span>
                      <strong>
                        {proyectoDetalle.ubicacion || "No especificada"}
                      </strong>
                    </div>

                    <div className="proyectos-detail-item">
                      <span>
                        <FolderKanban size={15} /> Código
                      </span>
                      <strong>
                        {proyectoDetalle.idProyecto || "—"}
                      </strong>
                    </div>
                  </section>

                  {cliente && (
                    <section className="proyectos-detail-section">
                      <h3>Datos del cliente</h3>

                      <div className="proyectos-detail-item">
                        <span>
                          <Users size={15} /> Cliente
                        </span>
                        <strong>{cliente.nombre || "—"}</strong>
                      </div>

                      <div className="proyectos-detail-item">
                        <span>
                          <Building2 size={15} /> Código de cliente
                        </span>
                        <strong>{cliente.idCliente || "—"}</strong>
                      </div>

                      <div className="proyectos-detail-item">
                        <span>Teléfono</span>
                        <strong>
                          {cliente.telefono || "No disponible"}
                        </strong>
                      </div>

                      <div className="proyectos-detail-item">
                        <span>Correo</span>
                        <strong>
                          {cliente.correo || "No disponible"}
                        </strong>
                      </div>
                    </section>
                  )}
                </div>

                <footer className="proyectos-detail-footer">
                  <button
                    type="button"
                    className="proyectos-btn proyectos-btn--outline"
                    onClick={() => {
                      setDetalleAbierto(false);
                      abrirEditarProyecto(proyectoDetalle);
                    }}
                  >
                    <Pencil size={16} />
                    Editar proyecto
                  </button>

                  <button
                    type="button"
                    className="proyectos-btn proyectos-btn--danger"
                    onClick={() => eliminarProyecto(proyectoDetalle)}
                    disabled={eliminando}
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                </footer>
              </aside>
            </div>
          );
        })()}
    </main>
  );
}

export default Proyectos;