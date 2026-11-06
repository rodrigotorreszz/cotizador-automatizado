
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Users,
  Mail,
  Phone,
  MapPin,
  LoaderCircle,
} from "lucide-react";

import api from "../services/api";
import "../styles/clientes.css";
import notificaciones from "../utils/notificaciones";

// Departamentos de El Salvador
const departamentos = [
  "Ahuachapán",
  "Santa Ana",
  "Sonsonate",
  "Chalatenango",
  "La Libertad",
  "San Salvador",
  "Cuscatlán",
  "La Paz",
  "Cabañas",
  "San Vicente",
  "Usulután",
  "San Miguel",
  "Morazán",
  "La Unión",
];

// Formulario inicial
const formularioInicial = {
  nombre: "",
  direccion: "",
  subdireccion: "",
  registroFiscal: "",
  nit: "",
  telefono: "",
  correo: "",
  atencionA: "",
};

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEditar, setClienteEditar] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // CARGAR CLIENTES
  // ==========================================

  const cargarClientes = async () => {
    try {
      setCargando(true);
      setError("");

      const respuesta = await api.get("/clientes");

      setClientes(respuesta.data.clientes || []);
    } catch (err) {
      console.error("Error al cargar clientes:", err);

      setError(
        "No fue posible cargar los clientes. Verifica el backend."
      );

      notificaciones.error(
        "No fue posible cargar los clientes."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  // ==========================================
  // BUSCADOR DE CLIENTES
  // ==========================================

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();

    if (!termino) return clientes;

    return clientes.filter((cliente) =>
      [
        cliente.idCliente,
        cliente.nombre,
        cliente.telefono,
        cliente.correo,
        cliente.direccion,
      ].some((dato) =>
        dato?.toLowerCase().includes(termino)
      )
    );
  }, [clientes, busqueda]);

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
  // ABRIR MODAL PARA NUEVO CLIENTE
  // ==========================================

  const abrirNuevoCliente = () => {
    setClienteEditar(null);
    setFormulario(formularioInicial);
    setError("");
    setModalAbierto(true);
  };

  // ==========================================
  // ABRIR MODAL PARA EDITAR CLIENTE
  // ==========================================

  const abrirEditarCliente = (cliente) => {
    setClienteEditar(cliente);

    setFormulario({
      nombre: cliente.nombre || "",
      direccion: cliente.direccion || "",
      subdireccion: cliente.subdireccion || "",
      registroFiscal: cliente.registroFiscal || "",
      nit: cliente.nit || "",
      telefono: cliente.telefono || "",
      correo: cliente.correo || "",
      atencionA: cliente.atencionA || "",
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
    setClienteEditar(null);
    setFormulario(formularioInicial);
    setError("");
  };

  // ==========================================
  // REGISTRAR O ACTUALIZAR CLIENTE
  // ==========================================

  const guardarCliente = async (e) => {
    e.preventDefault();

    if (guardando) return;

    const editando = Boolean(clienteEditar);

    const idToast = notificaciones.carga(
      editando
        ? "Actualizando cliente..."
        : "Registrando cliente..."
    );

    try {
      setGuardando(true);
      setError("");

      if (editando) {
        await api.put(
          `/clientes/${clienteEditar.idCliente}`,
          formulario
        );
      } else {
        await api.post("/clientes", formulario);
      }

      // Cerrar alerta de carga
      notificaciones.cerrar(idToast);

      // Mostrar alerta de éxito
      notificaciones.exito(
        editando
          ? "¡Cliente actualizado correctamente!"
          : "¡Cliente registrado correctamente!"
      );

      // Limpiar formulario y cerrar modal
      setModalAbierto(false);
      setClienteEditar(null);
      setFormulario(formularioInicial);

      // Actualizar la tabla
      await cargarClientes();

    } catch (err) {
      notificaciones.cerrar(idToast);

      console.error("Error al guardar cliente:", err);

      const mensajeError =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "No fue posible guardar el cliente. Revisa los datos.";

      setError(mensajeError);

      notificaciones.error(mensajeError);

    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINAR CLIENTE
  // ==========================================

  const eliminarCliente = async (cliente) => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar a ${cliente.nombre}?`
    );

    if (!confirmar) return;

    const idToast = notificaciones.carga(
      "Eliminando cliente..."
    );

    try {
      await api.delete(
        `/clientes/${cliente.idCliente}`
      );

      notificaciones.cerrar(idToast);

      notificaciones.exito(
        "¡Cliente eliminado correctamente!"
      );

      // Actualizar la tabla
      await cargarClientes();

    } catch (err) {
      notificaciones.cerrar(idToast);

      console.error("Error al eliminar cliente:", err);

      const mensajeError =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "No fue posible eliminar el cliente.";

      notificaciones.error(mensajeError);
    }
  };

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="clientes-page">

      {/* ENCABEZADO */}
      <div className="clientes-header">
        <div>
          <h1>Clientes</h1>
          <p>
            Administra la información de tus clientes y empresas.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={abrirNuevoCliente}
        >
          <Plus size={19} />
          Nuevo cliente
        </button>
      </div>

      {/* RESUMEN */}
      <div className="clientes-resumen">
        <div className="resumen-icono">
          <Users size={25} />
        </div>

        <div>
          <span>Total de clientes</span>
          <h2>{clientes.length}</h2>
        </div>
      </div>

      {/* PANEL PRINCIPAL */}
      <div className="clientes-panel">

        {/* ENCABEZADO DEL PANEL */}
        <div className="clientes-panel-header">
          <div>
            <h2>Directorio de clientes</h2>
            <p>
              Consulta y administra tus clientes registrados.
            </p>
          </div>

          {/* BUSCADOR */}
          <div className="buscador-clientes">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
            />
          </div>
        </div>

        {/* ERROR DE CARGA */}
        {error && !modalAbierto && (
          <div className="alerta alerta-error">
            {error}

            <button onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* CARGANDO */}
        {cargando ? (
          <div className="estado-carga">
            <LoaderCircle
              className="spinner"
              size={28}
            />
            <p>Cargando clientes...</p>
          </div>

        ) : clientesFiltrados.length === 0 ? (

          /* SIN RESULTADOS */
          <div className="estado-vacio">
            <Users size={38} />

            <h3>
              {busqueda
                ? "No se encontraron clientes"
                : "Todavía no hay clientes"}
            </h3>

            <p>
              {busqueda
                ? "Prueba con otro término de búsqueda."
                : "Registra tu primer cliente para comenzar."}
            </p>
          </div>

        ) : (

          /* TABLA DE CLIENTES */
          <div className="tabla-contenedor">
            <table className="tabla-clientes">

              <thead>
                <tr>
                  <th>CÓDIGO</th>
                  <th>CLIENTE / EMPRESA</th>
                  <th>CONTACTO</th>
                  <th>UBICACIÓN</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente._id}>

                    {/* CÓDIGO */}
                    <td>
                      <span className="codigo-cliente">
                        {cliente.idCliente}
                      </span>
                    </td>

                    {/* EMPRESA */}
                    <td>
                      <strong>{cliente.nombre}</strong>

                      <small>
                        {cliente.atencionA ||
                          "Sin contacto asignado"}
                      </small>
                    </td>

                    {/* CONTACTO */}
                    <td>
                      <div className="dato-contacto">
                        <Mail size={14} />
                        {cliente.correo}
                      </div>

                      <div className="dato-contacto">
                        <Phone size={14} />
                        {cliente.telefono}
                      </div>
                    </td>

                    {/* UBICACIÓN */}
                    <td>
                      <div className="dato-contacto">
                        <MapPin size={14} />
                        {cliente.direccion}
                      </div>

                      <small>
                        {cliente.subdireccion}
                      </small>
                    </td>

                    {/* ACCIONES */}
                    <td>
                      <div className="acciones-cliente">

                        <button
                          className="btn-accion editar"
                          title="Editar cliente"
                          onClick={() =>
                            abrirEditarCliente(cliente)
                          }
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          className="btn-accion eliminar"
                          title="Eliminar cliente"
                          onClick={() =>
                            eliminarCliente(cliente)
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
        <div className="clientes-panel-footer">
          Mostrando {clientesFiltrados.length} de{" "}
          {clientes.length} clientes
        </div>

      </div>

      {/* ======================================
          MODAL DE REGISTRO Y EDICIÓN
      ====================================== */}

      {modalAbierto && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              cerrarModal();
            }
          }}
        >

          <div
            className="modal-cliente"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-cliente"
          >

            {/* ENCABEZADO DEL MODAL */}
            <div className="modal-header">
              <div>
                <h2 id="titulo-modal-cliente">
                  {clienteEditar
                    ? "Editar cliente"
                    : "Registrar cliente"}
                </h2>

                <p>
                  {clienteEditar
                    ? `Código: ${clienteEditar.idCliente}`
                    : "Completa la información del nuevo cliente."}
                </p>
              </div>

              <button
                className="modal-cerrar"
                onClick={cerrarModal}
                disabled={guardando}
                type="button"
              >
                <X size={21} />
              </button>
            </div>

            {/* FORMULARIO */}
            <form onSubmit={guardarCliente}>

              <div className="formulario-clientes">

                {/* NOMBRE */}
                <div className="campo campo-completo">
                  <label htmlFor="nombre">
                    Nombre o empresa *
                  </label>

                  <input
                    id="nombre"
                    name="nombre"
                    value={formulario.nombre}
                    onChange={cambiarCampo}
                    placeholder="Ej. Empresa de Prueba S.A. de C.V."
                    required
                  />
                </div>

                {/* DEPARTAMENTO */}
                <div className="campo">
                  <label htmlFor="direccion">
                    Departamento *
                  </label>

                  <select
                    id="direccion"
                    name="direccion"
                    value={formulario.direccion}
                    onChange={cambiarCampo}
                    required
                  >
                    <option value="">
                      Seleccionar departamento
                    </option>

                    {departamentos.map((departamento) => (
                      <option
                        key={departamento}
                        value={departamento}
                      >
                        {departamento}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SUBDIRECCIÓN */}
                <div className="campo">
                  <label htmlFor="subdireccion">
                    Subdirección
                  </label>

                  <input
                    id="subdireccion"
                    name="subdireccion"
                    value={formulario.subdireccion}
                    onChange={cambiarCampo}
                    placeholder="Municipio, colonia, dirección..."
                  />
                </div>

                {/* REGISTRO FISCAL */}
                <div className="campo">
                  <label htmlFor="registroFiscal">
                    Registro fiscal
                  </label>

                  <input
                    id="registroFiscal"
                    name="registroFiscal"
                    value={formulario.registroFiscal}
                    onChange={cambiarCampo}
                    placeholder="Registro fiscal"
                  />
                </div>

                {/* NIT */}
                <div className="campo">
                  <label htmlFor="nit">
                    NIT
                  </label>

                  <input
                    id="nit"
                    name="nit"
                    value={formulario.nit}
                    onChange={cambiarCampo}
                    placeholder="Número de NIT"
                  />
                </div>

                {/* TELÉFONO */}
                <div className="campo">
                  <label htmlFor="telefono">
                    Teléfono *
                  </label>

                  <input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    value={formulario.telefono}
                    onChange={cambiarCampo}
                    placeholder="Ej. 2222-2222"
                    required
                  />
                </div>

                {/* CORREO */}
                <div className="campo">
                  <label htmlFor="correo">
                    Correo electrónico *
                  </label>

                  <input
                    id="correo"
                    name="correo"
                    type="email"
                    value={formulario.correo}
                    onChange={cambiarCampo}
                    placeholder="correo@empresa.com"
                    required
                  />
                </div>

                {/* ATENCIÓN A */}
                <div className="campo campo-completo">
                  <label htmlFor="atencionA">
                    Atención a
                  </label>

                  <input
                    id="atencionA"
                    name="atencionA"
                    value={formulario.atencionA}
                    onChange={cambiarCampo}
                    placeholder="Nombre de la persona de contacto"
                  />
                </div>

              </div>

              {/* ERROR DEL FORMULARIO */}
              {error && (
                <div className="alerta alerta-error">
                  {error}
                </div>
              )}

              {/* BOTONES */}
              <div className="modal-acciones">

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
                  disabled={guardando}
                >
                  {guardando ? (
                    <>
                      <LoaderCircle
                        className="spinner"
                        size={17}
                      />
                      Guardando...
                    </>
                  ) : (
                    clienteEditar
                      ? "Guardar cambios"
                      : "Registrar cliente"
                  )}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Clientes;
