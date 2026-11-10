import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  FolderKanban,
  MapPin,
  Users,
  LoaderCircle,
} from "lucide-react";

import api from "../services/api";
import "../styles/proyectos.css";
import notificaciones from "../utils/notificaciones";

// ==========================================
// ESTADOS DISPONIBLES
// ==========================================

const estados = [
  "Pendiente",
  "Aprobado",
  "Perdido",
];

// ==========================================
// FORMULARIO INICIAL
// ==========================================

const formularioInicial = {
  idCliente: "",
  proyecto: "",
  ubicacion: "",
  estado: "Pendiente",
};

function Proyectos() {
  const [proyectos, setProyectos] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proyectoEditar, setProyectoEditar] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  // Confirmación personalizada de eliminación
  const [proyectoPendienteEliminar, setProyectoPendienteEliminar] =
    useState(null);

  // ==========================================
  // CARGAR PROYECTOS Y CLIENTES
  // ==========================================

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const [respuestaProyectos, respuestaClientes] =
        await Promise.all([
          api.get("/proyectos"),
          api.get("/clientes"),
        ]);

      setProyectos(respuestaProyectos.data.proyectos || []);
      setClientes(respuestaClientes.data.clientes || []);

    } catch (err) {
      console.error("Error al cargar los datos:", err);

      const mensajeError =
        "No fue posible cargar los proyectos y clientes. Verifica el backend.";

      setError(mensajeError);
      notificaciones.error(mensajeError);

    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ==========================================
  // BUSCADOR DE PROYECTOS
  // ==========================================

  const proyectosFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();

    if (!termino) return proyectos;

    return proyectos.filter((proyecto) => {
      const nombreCliente =
        typeof proyecto.idCliente === "object"
          ? proyecto.idCliente?.nombre
          : "";

      return [
        proyecto.idProyecto,
        proyecto.proyecto,
        proyecto.ubicacion,
        proyecto.estado,
        nombreCliente,
      ].some((dato) =>
        String(dato ?? "").toLowerCase().includes(termino)
      );
    });
  }, [proyectos, busqueda]);

  // ==========================================
  // CAMBIAR CAMPOS DEL FORMULARIO
  // ==========================================

  const cambiarCampo = (e) => {
    const { name, value } = e.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  // ==========================================
  // ABRIR MODAL PARA NUEVO PROYECTO
  // ==========================================

  const abrirNuevoProyecto = () => {
    setProyectoEditar(null);
    setFormulario({ ...formularioInicial });
    setError("");
    setModalAbierto(true);
  };

  // ==========================================
  // ABRIR MODAL PARA EDITAR PROYECTO
  // ==========================================

  const abrirEditarProyecto = (proyecto) => {
    setProyectoEditar(proyecto);

    setFormulario({
      idCliente:
        typeof proyecto.idCliente === "object"
          ? proyecto.idCliente?.idCliente || ""
          : "",
      proyecto: proyecto.proyecto || "",
      ubicacion: proyecto.ubicacion || "",
      estado: estados.includes(proyecto.estado)
        ? proyecto.estado
        : "Pendiente",
    });

    setError("");
    setModalAbierto(true);
  };

  // ==========================================
  // CERRAR MODAL
  // ==========================================

  const cerrarModal = () => {
    if (guardando) return;

    setModalAbierto(false);
    setProyectoEditar(null);
    setFormulario({ ...formularioInicial });
    setError("");
  };

  // ==========================================
  // REGISTRAR O ACTUALIZAR PROYECTO
  // ==========================================

  const guardarProyecto = async (e) => {
    e.preventDefault();

    if (guardando) return;

    const editando = Boolean(proyectoEditar);

    const idToast = notificaciones.carga(
      editando
        ? "Actualizando proyecto..."
        : "Registrando proyecto..."
    );

    try {
      setGuardando(true);
      setError("");

      if (editando) {
        await api.put(
          `/proyectos/${proyectoEditar.idProyecto}`,
          {
            proyecto: formulario.proyecto.trim(),
            ubicacion: formulario.ubicacion.trim(),
            estado: formulario.estado,
          }
        );
      } else {
        await api.post("/proyectos", {
          ...formulario,
          proyecto: formulario.proyecto.trim(),
          ubicacion: formulario.ubicacion.trim(),
        });
      }

      notificaciones.cerrar(idToast);

      notificaciones.exito(
        editando
          ? "¡Proyecto actualizado correctamente!"
          : "¡Proyecto registrado correctamente!"
      );

      setModalAbierto(false);
      setProyectoEditar(null);
      setFormulario({ ...formularioInicial });

      await cargarDatos();

    } catch (err) {
      notificaciones.cerrar(idToast);

      console.error("Error al guardar proyecto:", err);

      const mensajeError =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "No fue posible guardar el proyecto. Revisa los datos.";

      setError(mensajeError);
      notificaciones.error(mensajeError);

    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // SOLICITAR ELIMINACIÓN
  // ==========================================

  const solicitarEliminarProyecto = (proyecto) => {
    setProyectoPendienteEliminar(proyecto);
  };

  // ==========================================
  // CANCELAR ELIMINACIÓN
  // ==========================================

  const cancelarEliminarProyecto = () => {
    if (eliminando) return;

    setProyectoPendienteEliminar(null);
  };

  // ==========================================
  // ELIMINAR PROYECTO
  // ==========================================

  const eliminarProyecto = async () => {
    if (!proyectoPendienteEliminar || eliminando) return;

    const proyecto = proyectoPendienteEliminar;

    const idToast = notificaciones.carga(
      "Eliminando proyecto..."
    );

    try {
      setEliminando(true);

      await api.delete(
        `/proyectos/${proyecto.idProyecto}`
      );

      notificaciones.cerrar(idToast);

      notificaciones.exito(
        `¡El proyecto ${proyecto.idProyecto} fue eliminado correctamente!`
      );

      setProyectoPendienteEliminar(null);

      await cargarDatos();

    } catch (err) {
      notificaciones.cerrar(idToast);

      console.error("Error al eliminar proyecto:", err);

      const mensajeError =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "No fue posible eliminar el proyecto.";

      notificaciones.error(mensajeError);

    } finally {
      setEliminando(false);
    }
  };

  // ==========================================
  // OBTENER NOMBRE DEL CLIENTE
  // ==========================================

  const obtenerCliente = (proyecto) => {
    if (typeof proyecto.idCliente === "object") {
      return proyecto.idCliente?.nombre || "Cliente no disponible";
    }

    return "Cliente no disponible";
  };

  // ==========================================
  // OBTENER CÓDIGO DEL CLIENTE
  // ==========================================

  const obtenerCodigoCliente = (proyecto) => {
    if (typeof proyecto.idCliente === "object") {
      return proyecto.idCliente?.idCliente || "";
    }

    return "";
  };

  // ==========================================
  // OBTENER CLASE DEL ESTADO
  // ==========================================

  const obtenerClaseEstado = (estado) => {
    const clases = {
      Pendiente: "estado-pendiente",
      Aprobado: "estado-aprobado",
      Perdido: "estado-perdido",
    };

    return clases[estado] || "estado-pendiente";
  };

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="proyectos-page">

      {/* ENCABEZADO */}
      <div className="proyectos-header">
        <div>
          <h1>Proyectos</h1>
          <p>
            Administra los proyectos y sus respectivos clientes.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={abrirNuevoProyecto}
        >
          <Plus size={19} />
          Nuevo proyecto
        </button>
      </div>

      {/* RESUMEN */}
      <div className="proyectos-resumen">
        <div className="proyectos-resumen-icono">
          <FolderKanban size={25} />
        </div>

        <div>
          <span>Total de proyectos</span>
          <h2>{proyectos.length}</h2>
        </div>
      </div>

      {/* DIRECTORIO */}
      <div className="proyectos-panel">

        {/* ENCABEZADO DEL PANEL */}
        <div className="proyectos-panel-header">
          <div>
            <h2>Directorio de proyectos</h2>
            <p>
              Consulta y administra los proyectos registrados.
            </p>
          </div>

          {/* BUSCADOR */}
          <div className="buscador-proyectos">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar proyecto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* ERROR DE CARGA */}
        {error && !modalAbierto && (
          <div className="proyectos-alerta proyectos-error">
            {error}

            <button onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ESTADO DE CARGA */}
        {cargando ? (
          <div className="proyectos-estado">
            <LoaderCircle
              className="proyectos-spinner"
              size={28}
            />
            <p>Cargando proyectos...</p>
          </div>

        ) : proyectosFiltrados.length === 0 ? (

          /* SIN RESULTADOS */
          <div className="proyectos-estado">
            <FolderKanban size={38} />

            <h3>
              {busqueda
                ? "No se encontraron proyectos"
                : "Todavía no hay proyectos"}
            </h3>

            <p>
              {busqueda
                ? "Prueba con otro término de búsqueda."
                : "Registra tu primer proyecto para comenzar."}
            </p>
          </div>

        ) : (

          /* TABLA DE PROYECTOS */
          <div className="proyectos-tabla-contenedor">
            <table className="tabla-proyectos">

              <thead>
                <tr>
                  <th>CÓDIGO</th>
                  <th>PROYECTO</th>
                  <th>CLIENTE</th>
                  <th>UBICACIÓN</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {proyectosFiltrados.map((proyecto) => (
                  <tr key={proyecto._id}>

                    {/* CÓDIGO */}
                    <td>
                      <span className="proyecto-codigo">
                        {proyecto.idProyecto}
                      </span>
                    </td>

                    {/* PROYECTO */}
                    <td>
                      <strong>{proyecto.proyecto}</strong>
                    </td>

                    {/* CLIENTE */}
                    <td>
                      <div className="proyecto-cliente">
                        <Users size={15} />
                        <span>
                          {obtenerCliente(proyecto)}
                        </span>
                      </div>

                      <small className="proyecto-cliente-codigo">
                        {obtenerCodigoCliente(proyecto)}
                      </small>
                    </td>

                    {/* UBICACIÓN */}
                    <td>
                      <div className="proyecto-ubicacion">
                        <MapPin size={15} />
                        {proyecto.ubicacion || "Sin ubicación registrada"}
                      </div>
                    </td>

                    {/* ESTADO */}
                    <td>
                      <span
                        className={`proyecto-estado ${obtenerClaseEstado(
                          proyecto.estado
                        )}`}
                      >
                        {proyecto.estado || "Pendiente"}
                      </span>
                    </td>

                    {/* ACCIONES */}
                    <td>
                      <div className="proyecto-acciones">

                        <button
                          className="proyecto-btn-accion editar"
                          title="Editar proyecto"
                          onClick={() =>
                            abrirEditarProyecto(proyecto)
                          }
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          className="proyecto-btn-accion eliminar"
                          title="Eliminar proyecto"
                          onClick={() =>
                            solicitarEliminarProyecto(proyecto)
                          }
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

        {/* PIE DE TABLA */}
        <div className="proyectos-panel-footer">
          Mostrando {proyectosFiltrados.length} de{" "}
          {proyectos.length} proyectos
        </div>

      </div>

      {/* ======================================
          MODAL DE REGISTRO Y EDICIÓN
      ====================================== */}

      {modalAbierto && (
        <div
          className="proyectos-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              cerrarModal();
            }
          }}
        >

          <div
            className="proyectos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-proyecto"
          >

            {/* ENCABEZADO DEL MODAL */}
            <div className="proyectos-modal-header">
              <div>
                <h2 id="titulo-modal-proyecto">
                  {proyectoEditar
                    ? "Editar proyecto"
                    : "Registrar proyecto"}
                </h2>

                <p>
                  {proyectoEditar
                    ? `Código: ${proyectoEditar.idProyecto}`
                    : "Completa la información del nuevo proyecto."}
                </p>
              </div>

              <button
                type="button"
                className="proyectos-modal-cerrar"
                onClick={cerrarModal}
                disabled={guardando}
              >
                <X size={21} />
              </button>
            </div>

            {/* FORMULARIO */}
            <form onSubmit={guardarProyecto}>

              <div className="proyectos-formulario">

                {/* CLIENTE */}
                <div className="proyectos-campo campo-proyecto-completo">
                  <label htmlFor="idCliente">
                    Cliente *
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
                      Seleccionar cliente
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

                  {proyectoEditar && (
                    <small>
                      El cliente asociado no se puede cambiar desde esta edición.
                    </small>
                  )}
                </div>

                {/* NOMBRE DEL PROYECTO */}
                <div className="proyectos-campo campo-proyecto-completo">
                  <label htmlFor="proyecto">
                    Nombre del proyecto *
                  </label>

                  <input
                    id="proyecto"
                    name="proyecto"
                    value={formulario.proyecto}
                    onChange={cambiarCampo}
                    placeholder="Ej. Instalación de ventanas de aluminio"
                    required
                  />
                </div>

                {/* UBICACIÓN */}
                <div className="proyectos-campo campo-proyecto-completo">
                  <label htmlFor="ubicacion">
                    Ubicación *
                  </label>

                  <input
                    id="ubicacion"
                    name="ubicacion"
                    value={formulario.ubicacion}
                    onChange={cambiarCampo}
                    placeholder="Ej. San Salvador, El Salvador"
                    required
                  />
                </div>

                {/* ESTADO */}
                <div className="proyectos-campo campo-proyecto-completo">
                  <label htmlFor="estado">
                    Estado del proyecto
                  </label>

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

              {/* ERROR DEL FORMULARIO */}
              {error && (
                <div className="proyectos-alerta proyectos-error">
                  {error}
                </div>
              )}

              {/* BOTONES */}
              <div className="proyectos-modal-acciones">

                <button
                  type="button"
                  className="btn-secundario"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    guardando ||
                    (!proyectoEditar && clientes.length === 0)
                  }
                >
                  {guardando ? (
                    <>
                      <LoaderCircle
                        className="proyectos-spinner"
                        size={17}
                      />
                      Guardando...
                    </>
                  ) : proyectoEditar ? (
                    "Guardar cambios"
                  ) : (
                    "Registrar proyecto"
                  )}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================
          CONFIRMACIÓN PERSONALIZADA
          DE ELIMINACIÓN
      ====================================== */}

      {proyectoPendienteEliminar && (
        <div
          className="as-confirmacion-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget &&
              !eliminando
            ) {
              cancelarEliminarProyecto();
            }
          }}
        >
          <div
            className="as-confirmacion-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmacion-proyecto"
          >

            <div className="as-confirmacion-icono">
              <Trash2 size={30} />
            </div>

            <h3 id="titulo-confirmacion-proyecto">
              ¿Eliminar proyecto?
            </h3>

            <p>
              Estás a punto de eliminar el proyecto{" "}
              <strong>
                {proyectoPendienteEliminar.idProyecto}
              </strong>
              {" "}({proyectoPendienteEliminar.proyecto}).
              Esta acción no se puede deshacer.
            </p>

            <div className="as-confirmacion-acciones">

              <button
                type="button"
                className="as-confirmacion-cancelar"
                onClick={cancelarEliminarProyecto}
                disabled={eliminando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="as-confirmacion-eliminar"
                onClick={eliminarProyecto}
                disabled={eliminando}
              >
                {eliminando ? (
                  <>
                    <LoaderCircle
                      className="proyectos-spinner"
                      size={16}
                    />
                    Eliminando...
                  </>
                ) : (
                  "Sí, eliminar"
                )}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Proyectos;
