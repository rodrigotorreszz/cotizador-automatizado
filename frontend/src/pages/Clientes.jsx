
import { useCallback, useEffect, useState } from "react";

import {
  Plus,
  Save,
  Trash2,
  RefreshCw,
  Users,
  Search,
  X,
} from "lucide-react";

import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

import api from "../services/api";
import "../styles/clientes.css";

// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================

const clienteInicial = {
  idCliente: "",
  empresa: "",
  direccion: "",
  telefono: "",
  email: "",
  atencionA: "",
};

// Evitar errores cuando un valor sea undefined o null
const obtenerTexto = (valor) => String(valor ?? "").trim();

// Capitalizar cada palabra
const capitalizar = (valor) =>
  String(valor ?? "")
    .toLowerCase()
    .replace(/\b\p{L}/gu, (letra) => letra.toUpperCase());

// ==========================================
// GENERAR ID VISUAL
// ==========================================

function generarId(clientes) {
  const numeros = clientes.map((cliente) => {
    const coincidencia = String(cliente.idCliente || "").match(/CLI-(\d+)/);

    return coincidencia ? Number(coincidencia[1]) : 0;
  });

  const siguiente = Math.max(0, ...numeros) + 1;

  return `CLI-${String(siguiente).padStart(3, "0")}`;
}

// ==========================================
// NORMALIZAR DATOS DE MONGODB
// ==========================================

function normalizarCliente(cliente) {
  return {
    ...cliente,

    idCliente: cliente.idCliente || "",

    // MongoDB utiliza nombre
    empresa: cliente.empresa ?? cliente.nombre ?? "",

    direccion: cliente.direccion ?? "",

    telefono: cliente.telefono ?? "",

    // MongoDB utiliza correo
    email: cliente.email ?? cliente.correo ?? "",

    atencionA: cliente.atencionA ?? "",
  };
}

// ==========================================
// PREPARAR DATOS PARA EL BACKEND
// ==========================================

function prepararDatos(cliente) {
  return {
    idCliente: obtenerTexto(cliente.idCliente),

    // Coincidir con el modelo de MongoDB
    nombre: capitalizar(cliente.empresa),

    direccion: capitalizar(cliente.direccion),

    telefono: obtenerTexto(cliente.telefono),

    correo: obtenerTexto(cliente.email).toLowerCase(),

    atencionA: capitalizar(cliente.atencionA),
  };
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(null);
  const [filaNueva, setFilaNueva] = useState(null);

  // ========================================
  // CARGAR CLIENTES
  // ========================================

  const cargarClientes = useCallback(async () => {
    try {
      setCargando(true);

      const respuesta = await api.get("/clientes");

      const datos = Array.isArray(respuesta.data)
        ? respuesta.data
        : respuesta.data?.clientes || [];

      const clientesNormalizados = datos.map(normalizarCliente);

      setClientes(clientesNormalizados);

    } catch (error) {
      console.error("Error al cargar clientes:", error);

      Swal.fire({
        icon: "error",
        title: "Error al cargar clientes",
        text:
          error.response?.data?.message ||
          "No se pudieron obtener los clientes del servidor.",
      });

    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  // ========================================
  // ACTUALIZAR CAMPOS DE CLIENTES
  // ========================================

  const actualizarCampo = (id, campo, valor) => {
    setClientes((actuales) =>
      actuales.map((cliente) =>
        cliente.idCliente === id
          ? {
              ...cliente,
              [campo]: valor,
            }
          : cliente
      )
    );
  };

  // ========================================
  // ACTUALIZAR FILA NUEVA
  // ========================================

  const actualizarCampoNuevo = (campo, valor) => {
    setFilaNueva((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  };

  // ========================================
  // VALIDACIONES
  // ========================================

  const validarCliente = (cliente) => {
    const telefono = obtenerTexto(cliente.telefono);
    const email = obtenerTexto(cliente.email);

    if (telefono && !/^\d{8}$/.test(telefono)) {
      Swal.fire({
        icon: "warning",
        title: "Teléfono inválido",
        text: "El teléfono debe contener exactamente 8 números.",
      });

      return false;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Swal.fire({
        icon: "warning",
        title: "Correo inválido",
        text: "Ingresá un correo electrónico válido.",
      });

      return false;
    }

    return true;
  };

  // ========================================
  // AGREGAR NUEVA FILA
  // ========================================

  const agregarFila = () => {
    if (filaNueva) {
      Swal.fire({
        icon: "info",
        title: "Fila pendiente",
        text: "Primero guardá o cancelá el cliente que estás agregando.",
      });

      return;
    }

    setFilaNueva({
      ...clienteInicial,
      idCliente: generarId(clientes),
    });
  };

  // ========================================
  // CANCELAR NUEVO CLIENTE
  // ========================================

  const cancelarNuevo = () => {
    setFilaNueva(null);
  };

  // ========================================
  // REGISTRAR NUEVO CLIENTE
  // ========================================

  const guardarNuevo = async () => {
    if (!filaNueva) return;

    if (!validarCliente(filaNueva)) return;

    try {
      setGuardando("nuevo");

      const datos = prepararDatos(filaNueva);

      const respuesta = await api.post("/clientes", datos);

      setFilaNueva(null);

      await cargarClientes();

      Swal.fire({
        icon: "success",
        title: "Cliente agregado",
        text:
          respuesta.data?.message ||
          "El cliente se guardó correctamente.",
        timer: 1800,
        showConfirmButton: false,
      });

    } catch (error) {
      console.error("Error al crear cliente:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo registrar",
        text:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Ocurrió un problema al guardar el cliente.",
      });

    } finally {
      setGuardando(null);
    }
  };

  // ========================================
  // ACTUALIZAR CLIENTE
  // ========================================

  const guardarCliente = async (cliente) => {
    if (!validarCliente(cliente)) return;

    try {
      setGuardando(cliente.idCliente);

      const datos = prepararDatos(cliente);

      // El backend busca mediante idCliente, no mediante _id
      const respuesta = await api.put(
        `/clientes/${encodeURIComponent(cliente.idCliente)}`,
        datos
      );

      await cargarClientes();

      Swal.fire({
        icon: "success",
        title: "Cambios guardados",
        text:
          respuesta.data?.message ||
          "El cliente se actualizó correctamente.",
        timer: 1500,
        showConfirmButton: false,
      });

    } catch (error) {
      console.error("Error al actualizar cliente:", error);

      Swal.fire({
        icon: "error",
        title: "Error al actualizar",
        text:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "No se pudieron guardar los cambios.",
      });

    } finally {
      setGuardando(null);
    }
  };

  // ========================================
  // ELIMINAR CLIENTE
  // ========================================

  const eliminarCliente = async (cliente) => {
    const confirmacion = await Swal.fire({
      title: "¿Eliminar cliente?",
      text: `Se eliminará el registro ${cliente.idCliente}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    });

    if (!confirmacion.isConfirmed) return;

    try {
      await api.delete(
        `/clientes/${encodeURIComponent(cliente.idCliente)}`
      );

      await cargarClientes();

      Swal.fire({
        icon: "success",
        title: "Cliente eliminado",
        text: "El registro se eliminó correctamente.",
        timer: 1500,
        showConfirmButton: false,
      });

    } catch (error) {
      console.error("Error al eliminar cliente:", error);

      Swal.fire({
        icon: "error",
        title: "Error al eliminar",
        text:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "No se pudo eliminar el cliente.",
      });
    }
  };

  // ========================================
  // BUSCADOR
  // ========================================

  const clientesFiltrados = clientes.filter((cliente) => {
    const texto = busqueda.toLowerCase().trim();

    return [
      cliente.idCliente,
      cliente.empresa,
      cliente.direccion,
      cliente.telefono,
      cliente.email,
      cliente.atencionA,
    ].some((valor) =>
      String(valor || "").toLowerCase().includes(texto)
    );
  });

  // ========================================
  // INTERFAZ
  // ========================================

  return (
    <div className="clientes-page">

      {/* ENCABEZADO */}

      <div className="clientes-header">
        <div>
          <span className="clientes-etiqueta">
            GESTIÓN COMERCIAL
          </span>

          <h1>Clientes</h1>

          <p>
            Administrá la información de tus clientes.
          </p>
        </div>

        <div className="clientes-header-actions">

          <button
            type="button"
            className="btn-clientes-secundario"
            onClick={cargarClientes}
            disabled={cargando}
          >
            <RefreshCw
              size={17}
              className={cargando ? "clientes-rotando" : ""}
            />

            Actualizar
          </button>

          <button
            type="button"
            className="btn-clientes-agregar"
            onClick={agregarFila}
            disabled={Boolean(filaNueva)}
          >
            <Plus size={18} />

            Nuevo cliente
          </button>

        </div>
      </div>

      {/* RESUMEN */}

      <div className="clientes-resumen">

        <div className="clientes-resumen-icono">
          <Users size={23} />
        </div>

        <div>
          <span>Total de clientes</span>

          <strong>{clientes.length}</strong>
        </div>

      </div>

      {/* TABLA */}

      <div className="clientes-tabla-contenedor">

        {/* BARRA SUPERIOR */}

        <div className="clientes-tabla-toolbar">

          <div>
            <h2>Directorio de clientes</h2>

            <span>
              {clientesFiltrados.length} registros encontrados
            </span>
          </div>

          <div className="clientes-buscador">
            <Search size={17} />

            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

        </div>

        {/* TABLA RESPONSIVE */}

        <div className="clientes-tabla-scroll">

          <table className="clientes-tabla">

            <thead>
              <tr>
                <th>ID CLIENTE</th>
                <th>EMPRESA</th>
                <th>DIRECCIÓN</th>
                <th>TELÉFONO</th>
                <th>E-MAIL</th>
                <th>ATENCIÓN A</th>
              </tr>
            </thead>

            <tbody>

              {/* NUEVO CLIENTE */}

              {filaNueva && (
                <tr className="fila-nueva">

                  <td>
                    <span className="cliente-id">
                      {filaNueva.idCliente}
                    </span>
                  </td>

                  <td>
                    <input
                      autoFocus
                      value={filaNueva.empresa}
                      placeholder="Empresa"
                      onChange={(e) =>
                        actualizarCampoNuevo(
                          "empresa",
                          e.target.value
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      value={filaNueva.direccion}
                      placeholder="Dirección"
                      onChange={(e) =>
                        actualizarCampoNuevo(
                          "direccion",
                          e.target.value
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      value={filaNueva.telefono}
                      placeholder="00000000"
                      maxLength={8}
                      inputMode="numeric"
                      onChange={(e) =>
                        actualizarCampoNuevo(
                          "telefono",
                          e.target.value.replace(/\D/g, "").slice(0, 8)
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="email"
                      value={filaNueva.email}
                      placeholder="correo@empresa.com"
                      onChange={(e) =>
                        actualizarCampoNuevo(
                          "email",
                          e.target.value
                        )
                      }
                    />
                  </td>

                  <td>
                    <div className="celda-atencion">

                      <input
                        value={filaNueva.atencionA}
                        placeholder="Persona de contacto"
                        onChange={(e) =>
                          actualizarCampoNuevo(
                            "atencionA",
                            e.target.value
                          )
                        }
                      />

                      <button
                        type="button"
                        className="btn-tabla-guardar"
                        onClick={guardarNuevo}
                        disabled={guardando === "nuevo"}
                        title="Guardar cliente"
                      >
                        <Save size={17} />
                      </button>

                      <button
                        type="button"
                        className="btn-tabla-cancelar"
                        onClick={cancelarNuevo}
                        title="Cancelar"
                      >
                        <X size={17} />
                      </button>

                    </div>
                  </td>

                </tr>
              )}

              {/* CARGANDO */}

              {cargando ? (
                <tr>
                  <td
                    colSpan={6}
                    className="clientes-estado-tabla"
                  >
                    Cargando clientes...
                  </td>
                </tr>

              ) : clientesFiltrados.length === 0 && !filaNueva ? (

                /* SIN RESULTADOS */

                <tr>
                  <td
                    colSpan={6}
                    className="clientes-estado-tabla"
                  >
                    {busqueda
                      ? "No se encontraron clientes con esa búsqueda."
                      : "No hay clientes registrados."}
                  </td>
                </tr>

              ) : (

                /* CLIENTES REGISTRADOS */

                clientesFiltrados.map((cliente) => (

                  <tr key={cliente._id || cliente.idCliente}>

                    <td>
                      <span className="cliente-id">
                        {cliente.idCliente}
                      </span>
                    </td>

                    <td>
                      <input
                        value={cliente.empresa}
                        placeholder="Empresa"
                        onChange={(e) =>
                          actualizarCampo(
                            cliente.idCliente,
                            "empresa",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        value={cliente.direccion}
                        placeholder="Dirección"
                        onChange={(e) =>
                          actualizarCampo(
                            cliente.idCliente,
                            "direccion",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        value={cliente.telefono}
                        placeholder="00000000"
                        maxLength={8}
                        inputMode="numeric"
                        onChange={(e) =>
                          actualizarCampo(
                            cliente.idCliente,
                            "telefono",
                            e.target.value.replace(/\D/g, "").slice(0, 8)
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="email"
                        value={cliente.email}
                        placeholder="correo@empresa.com"
                        onChange={(e) =>
                          actualizarCampo(
                            cliente.idCliente,
                            "email",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <div className="celda-atencion">

                        <input
                          value={cliente.atencionA}
                          placeholder="Persona de contacto"
                          onChange={(e) =>
                            actualizarCampo(
                              cliente.idCliente,
                              "atencionA",
                              e.target.value
                            )
                          }
                        />

                        <button
                          type="button"
                          className="btn-tabla-guardar"
                          onClick={() => guardarCliente(cliente)}
                          disabled={guardando === cliente.idCliente}
                          title="Guardar cambios"
                        >
                          <Save size={17} />
                        </button>

                        <button
                          type="button"
                          className="btn-tabla-eliminar"
                          onClick={() => eliminarCliente(cliente)}
                          title="Eliminar cliente"
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>
                    </td>

                  </tr>

                ))
              )}

            </tbody>

          </table>

        </div>

        {/* PIE DE TABLA */}

        <div className="clientes-tabla-footer">
          <span>
            Los campos son opcionales. Guardá cada fila después de editarla.
          </span>
        </div>

      </div>
    </div>
  );
}

export default Clientes;
