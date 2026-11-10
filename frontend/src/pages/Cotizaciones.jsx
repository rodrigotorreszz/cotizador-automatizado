
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  FileText,
  Pencil,
  Trash2,
  X,
  Save,
  Calculator,
  ClipboardList,
  UserRound,
  FolderKanban,
  CalendarDays,
  ChevronDown,
  FileDown,
} from "lucide-react";

import html2pdf from "html2pdf.js";
import api from "../services/api";
import notificaciones from "../utils/notificaciones";
import "../styles/cotizaciones.css";

const conceptoVacio = () => ({
  descripcion: "",
  cantidad: 1,
  precioUnitario: 0,
});

const formatoDinero = (cantidad) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(cantidad) || 0);

const fechaActual = () => new Date().toISOString().split("T")[0];

function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proyectos, setProyectos] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [cotizacionEditando, setCotizacionEditando] = useState(null);
  const [cotizacionEliminar, setCotizacionEliminar] = useState(null);
  const [cotizacionDocumento, setCotizacionDocumento] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  const [opcionesDocumento, setOpcionesDocumento] = useState({
    cliente: true,
    proyecto: true,
    conceptos: true,
    cantidades: true,
    precios: true,
    subtotal: true,
    iva: true,
    total: true,
  });

  const [formulario, setFormulario] = useState({
    idCliente: "",
    idProyecto: "",
    fecha: fechaActual(),
    porcentajeIVA: 13,
    estado: "Borrador",
    anticipo: "",
    entrega: "",
    validez: "15 días",
    conceptos: [conceptoVacio()],
  });

  const cargarDatos = async () => {
    try {
      setCargando(true);

      const [
        respuestaCotizaciones,
        respuestaClientes,
        respuestaProyectos,
      ] = await Promise.all([
        api.get("/cotizaciones"),
        api.get("/clientes"),
        api.get("/proyectos"),
      ]);

      setCotizaciones(respuestaCotizaciones.data.cotizaciones || []);
      setClientes(respuestaClientes.data.clientes || []);
      setProyectos(respuestaProyectos.data.proyectos || []);
    } catch (error) {
      console.error("Error al cargar cotizaciones:", error);

      notificaciones.error(
        error.response?.data?.message ||
          "No se pudieron cargar los datos de cotizaciones."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const proyectosDelCliente = useMemo(() => {
    if (!formulario.idCliente) return [];

    return proyectos.filter((proyecto) => {
      const clienteProyecto =
        proyecto.idCliente?.idCliente || proyecto.idCliente;

      return clienteProyecto === formulario.idCliente;
    });
  }, [proyectos, formulario.idCliente]);

  const subtotal = useMemo(() => {
    return formulario.conceptos.reduce((acumulado, concepto) => {
      const cantidad = Number(concepto.cantidad) || 0;
      const precio = Number(concepto.precioUnitario) || 0;

      return acumulado + cantidad * precio;
    }, 0);
  }, [formulario.conceptos]);

  const iva =
    (subtotal * (Number(formulario.porcentajeIVA) || 0)) / 100;

  const totalGeneral = subtotal + iva;

  const cotizacionesFiltradas = cotizaciones.filter((cotizacion) => {
    const texto = busqueda.toLowerCase();

    const codigo = cotizacion.idCotizacion?.toLowerCase() || "";
    const nombreCliente = cotizacion.idCliente?.nombre?.toLowerCase() || "";
    const nombreProyecto =
      cotizacion.idProyecto?.proyecto?.toLowerCase() || "";

    return (
      codigo.includes(texto) ||
      nombreCliente.includes(texto) ||
      nombreProyecto.includes(texto)
    );
  });

  // NUEVA COTIZACIÓN
  const abrirNuevaCotizacion = () => {
    setCotizacionEditando(null);

    setFormulario({
      idCliente: "",
      idProyecto: "",
      fecha: fechaActual(),
      porcentajeIVA: 13,
      estado: "Borrador",
      anticipo: "",
      entrega: "",
      validez: "15 días",
      conceptos: [conceptoVacio()],
    });

    setModalAbierto(true);
  };

  // EDITAR COTIZACIÓN
  const abrirEdicion = (cotizacion) => {
    setCotizacionEditando(cotizacion);

    setFormulario({
      idCliente: cotizacion.idCliente?.idCliente || "",
      idProyecto: cotizacion.idProyecto?.idProyecto || "",
      fecha: cotizacion.fecha
        ? new Date(cotizacion.fecha).toISOString().split("T")[0]
        : fechaActual(),
      porcentajeIVA: cotizacion.porcentajeIVA ?? 13,
      estado: cotizacion.estado || "Borrador",

      // CONDICIONES INDIVIDUALES
      anticipo: cotizacion.anticipo || "",
      entrega: cotizacion.entrega || "",
      validez: cotizacion.validez || "15 días",

      conceptos: cotizacion.conceptos?.length
        ? cotizacion.conceptos.map((concepto) => ({
            descripcion: concepto.descripcion || "",
            cantidad: concepto.cantidad ?? 1,
            precioUnitario: concepto.precioUnitario ?? 0,
          }))
        : [conceptoVacio()],
    });

    setModalAbierto(true);
  };

  const actualizarCampo = (campo, valor) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  const actualizarConcepto = (indice, campo, valor) => {
    setFormulario((anterior) => ({
      ...anterior,
      conceptos: anterior.conceptos.map((concepto, index) =>
        index === indice
          ? { ...concepto, [campo]: valor }
          : concepto
      ),
    }));
  };

  const agregarConcepto = () => {
    setFormulario((anterior) => ({
      ...anterior,
      conceptos: [...anterior.conceptos, conceptoVacio()],
    }));
  };

  const eliminarConcepto = (indice) => {
    if (formulario.conceptos.length === 1) {
      notificaciones.informacion(
        "La cotización debe tener al menos un concepto."
      );
      return;
    }

    setFormulario((anterior) => ({
      ...anterior,
      conceptos: anterior.conceptos.filter(
        (_, index) => index !== indice
      ),
    }));
  };

  // GUARDAR COTIZACIÓN
  const guardarCotizacion = async (evento) => {
    evento.preventDefault();

    if (!formulario.idCliente) {
      notificaciones.error("Selecciona un cliente.");
      return;
    }

    const conceptosValidos = formulario.conceptos.every(
      (concepto) =>
        concepto.descripcion.trim() &&
        Number(concepto.cantidad) > 0 &&
        Number(concepto.precioUnitario) >= 0
    );

    if (!conceptosValidos) {
      notificaciones.error(
        "Completa la descripción, cantidad y precio de cada concepto."
      );
      return;
    }

    const datos = {
      idCliente: formulario.idCliente,
      idProyecto: formulario.idProyecto || null,
      fecha: formulario.fecha,
      porcentajeIVA: Number(formulario.porcentajeIVA),
      estado: formulario.estado,

      // CONDICIONES DE ESTA COTIZACIÓN
      anticipo: formulario.anticipo.trim(),
      entrega: formulario.entrega.trim(),
      validez: formulario.validez.trim(),

      conceptos: formulario.conceptos.map((concepto) => ({
        descripcion: concepto.descripcion.trim(),
        cantidad: Number(concepto.cantidad),
        precioUnitario: Number(concepto.precioUnitario),
      })),
    };

    try {
      if (cotizacionEditando) {
        await api.put(
          `/cotizaciones/${cotizacionEditando.idCotizacion}`,
          datos
        );

        notificaciones.exito("Cotización actualizada correctamente.");
      } else {
        await api.post("/cotizaciones", datos);

        notificaciones.exito("Cotización creada correctamente.");
      }

      setModalAbierto(false);
      setCotizacionEditando(null);

      await cargarDatos();
    } catch (error) {
      console.error("Error al guardar cotización:", error);

      notificaciones.error(
        error.response?.data?.message ||
          "No se pudo guardar la cotización."
      );
    }
  };

  // ELIMINAR COTIZACIÓN
  const confirmarEliminacion = async () => {
    if (!cotizacionEliminar) return;

    try {
      await api.delete(
        `/cotizaciones/${cotizacionEliminar.idCotizacion}`
      );

      notificaciones.exito("Cotización eliminada correctamente.");

      setCotizacionEliminar(null);

      await cargarDatos();
    } catch (error) {
      console.error("Error al eliminar cotización:", error);

      notificaciones.error(
        error.response?.data?.message ||
          "No se pudo eliminar la cotización."
      );
    }
  };

  const obtenerClaseEstado = (estado) => {
    const clases = {
      Borrador: "borrador",
      Enviada: "enviada",
      Aceptada: "aceptada",
      Rechazada: "rechazada",
    };

    return clases[estado] || "borrador";
  };

  // DOCUMENTO
  const abrirDocumento = (cotizacion) => {
    setOpcionesDocumento({
      cliente: true,
      proyecto: true,
      conceptos: true,
      cantidades: true,
      precios: true,
      subtotal: true,
      iva: true,
      total: true,
    });

    setCotizacionDocumento(cotizacion);
  };

  const cambiarOpcionDocumento = (opcion) => {
    setOpcionesDocumento((anterior) => ({
      ...anterior,
      [opcion]: !anterior[opcion],
    }));
  };

  // GENERAR PDF
  const descargarPDF = async () => {
    if (!Object.values(opcionesDocumento).some(Boolean)) {
      notificaciones.error(
        "Selecciona al menos un dato para el documento."
      );
      return;
    }

    const elemento = document.querySelector(
      ".cotizacion-documento-vista"
    );

    if (!elemento) {
      notificaciones.error("No se encontró el documento.");
      return;
    }

    try {
      setGenerandoPDF(true);

      const codigo =
        cotizacionDocumento?.idCotizacion || "Cotizacion";

      const opciones = {
        margin: [5, 5, 5, 5],
        filename: `Cotizacion-${codigo}.pdf`,
        image: {
          type: "jpeg",
          quality: 0.98,
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#FFFFFF",
          logging: false,
          windowWidth: 1200,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "landscape",
        },
        pagebreak: {
          mode: ["css", "legacy"],
        },
      };

      await html2pdf()
        .set(opciones)
        .from(elemento)
        .save();

      notificaciones.exito("PDF descargado correctamente.");
    } catch (error) {
      console.error("Error al generar PDF:", error);

      notificaciones.error("No se pudo generar el PDF.");
    } finally {
      setGenerandoPDF(false);
    }
  };

  const fechaDocumento = cotizacionDocumento?.fecha
    ? new Date(cotizacionDocumento.fecha).toLocaleDateString("es-SV")
    : "—";

  return (
    <main className="cotizaciones-page">
      <section className="cotizaciones-encabezado">
        <div>
          <span className="cotizaciones-etiqueta">
            GESTIÓN COMERCIAL
          </span>

          <h1>Cotizaciones</h1>

          <p>
            Crea, administra y consulta las cotizaciones de tus clientes.
          </p>
        </div>

        <button
          className="cotizacion-btn-principal"
          onClick={abrirNuevaCotizacion}
        >
          <Plus size={19} />
          Nueva cotización
        </button>
      </section>

      <section className="cotizaciones-resumen">
        <article className="cotizacion-resumen-card">
          <div className="cotizacion-resumen-icono azul">
            <FileText size={22} />
          </div>

          <div>
            <span>Total de cotizaciones</span>
            <strong>{cotizaciones.length}</strong>
          </div>
        </article>

        <article className="cotizacion-resumen-card">
          <div className="cotizacion-resumen-icono verde">
            <ClipboardList size={22} />
          </div>

          <div>
            <span>Aceptadas</span>
            <strong>
              {cotizaciones.filter((c) => c.estado === "Aceptada").length}
            </strong>
          </div>
        </article>

        <article className="cotizacion-resumen-card">
          <div className="cotizacion-resumen-icono naranja">
            <Calculator size={22} />
          </div>

          <div>
            <span>Enviadas</span>
            <strong>
              {cotizaciones.filter((c) => c.estado === "Enviada").length}
            </strong>
          </div>
        </article>
      </section>

      <section className="cotizaciones-contenido">
        <div className="cotizaciones-tabla-encabezado">
          <div>
            <h2>Listado de cotizaciones</h2>
            <p>Consulta y administra tus cotizaciones registradas.</p>
          </div>

          <div className="cotizaciones-busqueda">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar por código, cliente o proyecto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {cargando ? (
          <div className="cotizaciones-vacio">
            <div className="cotizaciones-loader" />
            <p>Cargando cotizaciones...</p>
          </div>
        ) : cotizacionesFiltradas.length === 0 ? (
          <div className="cotizaciones-vacio">
            <FileText size={42} />
            <h3>No hay cotizaciones</h3>

            <p>
              {busqueda
                ? "No se encontraron resultados para tu búsqueda."
                : "Todavía no has registrado ninguna cotización."}
            </p>

            {!busqueda && (
              <button
                className="cotizacion-btn-principal"
                onClick={abrirNuevaCotizacion}
              >
                <Plus size={18} />
                Crear primera cotización
              </button>
            )}
          </div>
        ) : (
          <div className="cotizaciones-tabla-contenedor">
            <table className="cotizaciones-tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Proyecto</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cotizacionesFiltradas.map((cotizacion) => (
                  <tr key={cotizacion._id}>
                    <td>
                      <strong className="cotizacion-codigo">
                        {cotizacion.idCotizacion}
                      </strong>
                    </td>

                    <td>
                      <div className="cotizacion-cliente-celda">
                        <UserRound size={17} />
                        {cotizacion.idCliente?.nombre || "Sin cliente"}
                      </div>
                    </td>

                    <td>
                      {cotizacion.idProyecto?.proyecto || "Sin proyecto"}
                    </td>

                    <td>
                      {cotizacion.fecha
                        ? new Date(cotizacion.fecha).toLocaleDateString("es-SV")
                        : "—"}
                    </td>

                    <td>
                      <span
                        className={`cotizacion-estado ${obtenerClaseEstado(
                          cotizacion.estado
                        )}`}
                      >
                        {cotizacion.estado || "Borrador"}
                      </span>
                    </td>

                    <td className="cotizacion-total-celda">
                      {formatoDinero(cotizacion.totalGeneral)}
                    </td>

                    <td>
                      <div className="cotizacion-acciones">
                        <button
                          className="cotizacion-accion editar"
                          title="Editar cotización"
                          onClick={() => abrirEdicion(cotizacion)}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          className="cotizacion-generar-btn"
                          title="Generar documento para el cliente"
                          onClick={() => abrirDocumento(cotizacion)}
                        >
                          <FileText size={16} />
                          Generar
                        </button>

                        <button
                          className="cotizacion-accion eliminar"
                          title="Eliminar cotización"
                          onClick={() => setCotizacionEliminar(cotizacion)}
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
      </section>

      {/* MODAL CREAR / EDITAR */}
      {modalAbierto && (
        <div
          className="cotizacion-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModalAbierto(false);
            }
          }}
        >
          <section className="cotizacion-modal">
            <header className="cotizacion-modal-header">
              <div>
                <span className="cotizaciones-etiqueta">
                  {cotizacionEditando
                    ? "ACTUALIZAR REGISTRO"
                    : "NUEVO REGISTRO"}
                </span>

                <h2>
                  {cotizacionEditando
                    ? "Editar cotización"
                    : "Crear cotización"}
                </h2>

                <p>
                  Completa los datos y agrega los conceptos necesarios.
                </p>
              </div>

              <button
                type="button"
                className="cotizacion-modal-cerrar"
                onClick={() => setModalAbierto(false)}
                title="Cerrar"
              >
                <X size={21} />
              </button>
            </header>

            <form onSubmit={guardarCotizacion}>
              <div className="cotizacion-modal-cuerpo">
                <div className="cotizacion-seccion-titulo">
                  <UserRound size={19} />
                  <h3>Información general</h3>
                </div>

                <div className="cotizacion-form-grid">
                  <label className="cotizacion-campo">
                    <span>Cliente *</span>

                    <div className="cotizacion-input-icono">
                      <UserRound size={17} />

                      <select
                        value={formulario.idCliente}
                        onChange={(e) => {
                          actualizarCampo("idCliente", e.target.value);
                          actualizarCampo("idProyecto", "");
                        }}
                        required
                      >
                        <option value="">Selecciona un cliente</option>

                        {clientes.map((cliente) => (
                          <option
                            key={cliente._id}
                            value={cliente.idCliente}
                          >
                            {cliente.idCliente} - {cliente.nombre}
                          </option>
                        ))}
                      </select>

                      <ChevronDown size={16} />
                    </div>
                  </label>

                  <label className="cotizacion-campo">
                    <span>Proyecto (opcional)</span>

                    <div className="cotizacion-input-icono">
                      <FolderKanban size={17} />

                      <select
                        value={formulario.idProyecto}
                        onChange={(e) =>
                          actualizarCampo("idProyecto", e.target.value)
                        }
                        disabled={!formulario.idCliente}
                      >
                        <option value="">Sin proyecto asociado</option>

                        {proyectosDelCliente.map((proyecto) => (
                          <option
                            key={proyecto._id}
                            value={proyecto.idProyecto}
                          >
                            {proyecto.idProyecto} - {proyecto.proyecto}
                          </option>
                        ))}
                      </select>

                      <ChevronDown size={16} />
                    </div>
                  </label>

                  <label className="cotizacion-campo">
                    <span>Fecha</span>

                    <div className="cotizacion-input-icono">
                      <CalendarDays size={17} />

                      <input
                        type="date"
                        value={formulario.fecha}
                        onChange={(e) =>
                          actualizarCampo("fecha", e.target.value)
                        }
                        required
                      />
                    </div>
                  </label>

                  <label className="cotizacion-campo">
                    <span>Estado</span>

                    <div className="cotizacion-input-icono">
                      <ClipboardList size={17} />

                      <select
                        value={formulario.estado}
                        onChange={(e) =>
                          actualizarCampo("estado", e.target.value)
                        }
                      >
                        <option value="Borrador">Borrador</option>
                        <option value="Enviada">Enviada</option>
                        <option value="Aceptada">Aceptada</option>
                        <option value="Rechazada">Rechazada</option>
                      </select>

                      <ChevronDown size={16} />
                    </div>
                  </label>
                </div>

                {/* CONDICIONES EDITABLES POR COTIZACIÓN */}
                <div className="cotizacion-seccion-titulo cotizacion-conceptos-titulo">
                  <FileText size={19} />
                  <h3>Condiciones de la cotización</h3>
                </div>

                <div className="cotizacion-form-grid cotizacion-condiciones-grid">
                  <label className="cotizacion-campo">
                    <span>Anticipo</span>

                    <textarea
                      rows="2"
                      placeholder="Ej. 70% al iniciar, 20% durante la instalación y 10% al finalizar"
                      value={formulario.anticipo}
                      onChange={(e) =>
                        actualizarCampo("anticipo", e.target.value)
                      }
                    />
                  </label>

                  <label className="cotizacion-campo">
                    <span>Tiempo de entrega</span>

                    <input
                      type="text"
                      placeholder="Ej. 30 a 40 días hábiles"
                      value={formulario.entrega}
                      onChange={(e) =>
                        actualizarCampo("entrega", e.target.value)
                      }
                    />
                  </label>

                  <label className="cotizacion-campo">
                    <span>Validez de la oferta</span>

                    <input
                      type="text"
                      placeholder="Ej. 15 días"
                      value={formulario.validez}
                      onChange={(e) =>
                        actualizarCampo("validez", e.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="cotizacion-seccion-titulo cotizacion-conceptos-titulo">
                  <ClipboardList size={19} />
                  <h3>Conceptos de la cotización</h3>
                </div>

                <p className="cotizacion-ayuda">
                  Agrega los productos, materiales, servicios o trabajos que
                  necesites. No hay conceptos predefinidos.
                </p>

                <div className="cotizacion-conceptos-lista">
                  {formulario.conceptos.map((concepto, indice) => {
                    const totalConcepto =
                      (Number(concepto.cantidad) || 0) *
                      (Number(concepto.precioUnitario) || 0);

                    return (
                      <div className="cotizacion-concepto" key={indice}>
                        <div className="cotizacion-concepto-numero">
                          {String(indice + 1).padStart(2, "0")}
                        </div>

                        <label className="cotizacion-campo concepto-descripcion">
                          <span>Descripción</span>

                          <input
                            type="text"
                            placeholder="Ej. Ventanas de aluminio natural"
                            value={concepto.descripcion}
                            onChange={(e) =>
                              actualizarConcepto(
                                indice,
                                "descripcion",
                                e.target.value
                              )
                            }
                            required
                          />
                        </label>

                        <label className="cotizacion-campo concepto-cantidad">
                          <span>Cantidad</span>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={concepto.cantidad}
                            onChange={(e) =>
                              actualizarConcepto(
                                indice,
                                "cantidad",
                                e.target.value
                              )
                            }
                            required
                          />
                        </label>

                        <label className="cotizacion-campo concepto-precio">
                          <span>Precio unitario ($)</span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={concepto.precioUnitario}
                            onChange={(e) =>
                              actualizarConcepto(
                                indice,
                                "precioUnitario",
                                e.target.value
                              )
                            }
                            required
                          />
                        </label>

                        <div className="cotizacion-concepto-total">
                          <span>Total</span>
                          <strong>{formatoDinero(totalConcepto)}</strong>
                        </div>

                        <button
                          type="button"
                          className="cotizacion-quitar-concepto"
                          onClick={() => eliminarConcepto(indice)}
                          title="Eliminar concepto"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="cotizacion-agregar-concepto"
                  onClick={agregarConcepto}
                >
                  <Plus size={18} />
                  Agregar otro concepto
                </button>

                <div className="cotizacion-resumen-final">
                  <div className="cotizacion-iva-control">
                    <label htmlFor="porcentajeIVA">IVA (%)</label>

                    <input
                      id="porcentajeIVA"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formulario.porcentajeIVA}
                      onChange={(e) =>
                        actualizarCampo("porcentajeIVA", e.target.value)
                      }
                    />
                  </div>

                  <div className="cotizacion-calculos">
                    <div>
                      <span>Subtotal</span>
                      <strong>{formatoDinero(subtotal)}</strong>
                    </div>

                    <div>
                      <span>IVA ({formulario.porcentajeIVA || 0}%)</span>
                      <strong>{formatoDinero(iva)}</strong>
                    </div>

                    <div className="cotizacion-total-final">
                      <span>Total general</span>
                      <strong>{formatoDinero(totalGeneral)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <footer className="cotizacion-modal-footer">
                <button
                  type="button"
                  className="cotizacion-btn-secundario"
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="cotizacion-btn-principal"
                >
                  <Save size={18} />

                  {cotizacionEditando
                    ? "Guardar cambios"
                    : "Guardar cotización"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* MODAL DEL DOCUMENTO */}
      {cotizacionDocumento && (
        <div
          className="cotizacion-modal-overlay cotizacion-documento-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setCotizacionDocumento(null);
            }
          }}
        >
          <section className="cotizacion-modal cotizacion-modal-documento">
            <header className="cotizacion-modal-header no-imprimir">
              <div>
                <span className="cotizaciones-etiqueta">
                  DOCUMENTO PARA CLIENTE
                </span>

                <h2>Generar cotización</h2>

                <p>
                  Selecciona la información que deseas incluir en el documento.
                </p>
              </div>

              <button
                type="button"
                className="cotizacion-modal-cerrar"
                onClick={() => setCotizacionDocumento(null)}
              >
                <X size={21} />
              </button>
            </header>

            <div className="cotizacion-documento-cuerpo">
              <div className="cotizacion-documento-opciones no-imprimir">
                <h3>Información que se incluirá</h3>

                {[
                  ["cliente", "Datos del cliente"],
                  ["proyecto", "Datos del proyecto"],
                  ["conceptos", "Descripción de los conceptos"],
                  ["cantidades", "Cantidades"],
                  ["precios", "Precios unitarios e importes"],
                  ["subtotal", "Subtotal"],
                  ["iva", "IVA"],
                  ["total", "Total general"],
                ].map(([clave, etiqueta]) => (
                  <label
                    className="cotizacion-documento-opcion"
                    key={clave}
                  >
                    <input
                      type="checkbox"
                      checked={opcionesDocumento[clave]}
                      onChange={() => cambiarOpcionDocumento(clave)}
                    />
                    {etiqueta}
                  </label>
                ))}
              </div>

              {/* DOCUMENTO PDF */}
              <div className="cotizacion-documento-vista">
                <div className="pdf-plantilla-encabezado">
                  <div className="pdf-logo">
                    <strong>A&S</strong>
                    <span>ALUMINIO Y VIDRIO</span>
                  </div>

                  <div className="pdf-empresa">
                    <h2>ACABADOS Y SERVICIOS S.A. DE C.V.</h2>
                    <p>
                      Sistemas de Aluminio y Vidrio | Tel: 2226-0408 |
                      E-mail: acabados_y_servicios@yahoo.com
                    </p>
                    <p>
                      Quinta avenida norte y 31 calle poniente número 413,
                      San Salvador
                    </p>
                  </div>

                  <div className="pdf-titulo">
                    <h2>COTIZACIONES</h2>
                    <strong>{cotizacionDocumento.idCotizacion}</strong>
                    <span>{fechaDocumento}</span>
                  </div>
                </div>

                <div className="pdf-linea" />

                <div className="pdf-datos-grid">
                  {opcionesDocumento.cliente && (
                    <section className="pdf-datos-bloque">
                      <h3>DATOS DEL CLIENTE</h3>

                      <p>
                        <strong>ID CLIENTE:</strong>{" "}
                        {cotizacionDocumento.idCliente?.idCliente || "—"}
                      </p>

                      <p>
                        <strong>EMPRESA:</strong>{" "}
                        {cotizacionDocumento.idCliente?.nombre || "—"}
                      </p>

                      <p>
                        <strong>ATENCIÓN A:</strong>{" "}
                        {cotizacionDocumento.idCliente?.atencionA || "—"}
                      </p>

                      <p>
                        <strong>TELÉFONO:</strong>{" "}
                        {cotizacionDocumento.idCliente?.telefono || "—"}
                      </p>

                      <p>
                        <strong>DIRECCIÓN:</strong>{" "}
                        {cotizacionDocumento.idCliente?.direccion || "—"}
                      </p>
                    </section>
                  )}

                  {opcionesDocumento.proyecto && (
                    <section className="pdf-datos-bloque">
                      <h3>DATOS DEL PROYECTO</h3>

                      <p>
                        <strong>ID PROYECTO:</strong>{" "}
                        {cotizacionDocumento.idProyecto?.idProyecto || "—"}
                      </p>

                      <p>
                        <strong>PROYECTO:</strong>{" "}
                        {cotizacionDocumento.idProyecto?.proyecto || "—"}
                      </p>

                      <p>
                        <strong>UBICACIÓN:</strong>{" "}
                        {cotizacionDocumento.idProyecto?.ubicacion || "—"}
                      </p>

                      <p>
                        <strong>FECHA:</strong> {fechaDocumento}
                      </p>
                    </section>
                  )}
                </div>

                {opcionesDocumento.conceptos && (
                  <section className="pdf-detalle">
                    <h3>DETALLE DE LA COTIZACIÓN</h3>

                    <table className="pdf-tabla">
                      <thead>
                        <tr>
                          <th>ÍTEM</th>
                          <th>DESCRIPCIÓN</th>

                          {opcionesDocumento.cantidades && (
                            <th>CANTIDAD</th>
                          )}

                          {opcionesDocumento.precios && (
                            <>
                              <th>PRECIO UNITARIO</th>
                              <th>PRECIO TOTAL</th>
                            </>
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {cotizacionDocumento.conceptos?.map(
                          (concepto, indice) => (
                            <tr key={concepto._id || indice}>
                              <td>{indice + 1}</td>
                              <td>{concepto.descripcion}</td>

                              {opcionesDocumento.cantidades && (
                                <td>{concepto.cantidad}</td>
                              )}

                              {opcionesDocumento.precios && (
                                <>
                                  <td>
                                    {formatoDinero(
                                      concepto.precioUnitario
                                    )}
                                  </td>

                                  <td>
                                    {formatoDinero(
                                      Number(concepto.cantidad) *
                                        Number(concepto.precioUnitario)
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </section>
                )}

                <div className="pdf-parte-inferior">
                  <section className="pdf-condiciones-comerciales">
                    <h3>CONDICIONES COMERCIALES</h3>

                    <p>
                      <strong>ANTICIPO:</strong>{" "}
                      {cotizacionDocumento.anticipo || "No especificado"}
                    </p>

                    <p>
                      <strong>ENTREGA:</strong>{" "}
                      {cotizacionDocumento.entrega || "No especificado"}
                    </p>

                    <p>
                      <strong>VALIDEZ:</strong>{" "}
                      {cotizacionDocumento.validez || "No especificada"}
                    </p>
                  </section>

                  <section className="pdf-totales">
                    {opcionesDocumento.subtotal && (
                      <p>
                        <span>SUBTOTAL</span>
                        <strong>
                          {formatoDinero(cotizacionDocumento.subtotal)}
                        </strong>
                      </p>
                    )}

                    {opcionesDocumento.iva && (
                      <p>
                        <span>
                          IVA ({cotizacionDocumento.porcentajeIVA ?? 13}%)
                        </span>
                        <strong>
                          {formatoDinero(cotizacionDocumento.iva)}
                        </strong>
                      </p>
                    )}

                    {opcionesDocumento.total && (
                      <p className="pdf-total-general">
                        <span>TOTAL GENERAL</span>
                        <strong>
                          {formatoDinero(cotizacionDocumento.totalGeneral)}
                        </strong>
                      </p>
                    )}
                  </section>
                </div>

                <section className="pdf-condiciones-generales">
                  <h3>CONDICIONES GENERALES DEL CONTRATO</h3>

                  <div className="pdf-condiciones-columnas">
                    <div>
                      <p>
                        <strong>A)</strong> El Cliente pagará el valor de este
                        contrato de acuerdo con los términos y condiciones
                        contratadas.
                      </p>

                      <p>
                        <strong>B)</strong> El Cliente autoriza los trabajos
                        de acuerdo con lo expresado en la presente cotización,
                        con los valores y medidas acordadas.
                      </p>

                      <p>
                        <strong>C)</strong> El tiempo de ejecución se realizará
                        en días y horas hábiles. Los trabajos nocturnos podrán
                        generar costos adicionales.
                      </p>

                      <p>
                        <strong>D)</strong> El cliente deberá proveer un lugar
                        seguro para el almacenamiento de materiales y
                        herramientas.
                      </p>

                      <p>
                        <strong>E)</strong> El cliente proveerá alimentación
                        eléctrica para las herramientas a una distancia
                        máxima de 25 m.
                      </p>

                      <p>
                        <strong>F)</strong> El cliente deberá mantener el área
                        de trabajo libre de materiales u objetos que impidan
                        la instalación.
                      </p>

                      <p>
                        <strong>G)</strong> La fecha de inicio se confirmará
                        después de recibido el anticipo e incluido el proyecto
                        en la programación.
                      </p>
                    </div>

                    <div>
                      <p>
                        <strong>H)</strong> Una vez cancelado el anticipo, el
                        proyecto deberá ejecutarse en un plazo no mayor a 90
                        días o según lo negociado.
                      </p>

                      <p>
                        <strong>I)</strong> Si se requiere devolución del
                        anticipo, la empresa se reserva el derecho de retener
                        el 10 % por operaciones realizadas.
                      </p>

                      <p>
                        <strong>J)</strong> El material será propiedad de
                        ACABADOS Y SERVICIOS S.A. DE C.V. mientras no haya sido
                        cancelado en su totalidad.
                      </p>

                      <p>
                        <strong>K)</strong> Se brinda garantía de un año en
                        instalaciones y 10 años en materiales, excluyendo
                        vidrio, bajo las condiciones establecidas.
                      </p>

                      <p>
                        <strong>L)</strong> Los materiales cuentan con garantía
                        contra desperfectos de fabricación según las políticas
                        del fabricante.
                      </p>

                      <p>
                        <strong>M)</strong> La empresa se reserva el dominio
                        de lo vendido mientras no esté totalmente pagado.
                      </p>

                      <p>
                        <strong>N)</strong> La validez de esta oferta será la
                        indicada en las condiciones comerciales de esta
                        cotización.
                      </p>
                    </div>
                  </div>
                </section>

                <div className="pdf-firmas">
                  <div>
                    <span />
                    <strong>CLIENTE</strong>
                    <small>Nombre y firma</small>
                  </div>

                  <div>
                    <span />
                    <strong>ACABADOS Y SERVICIOS S.A. DE C.V.</strong>
                    <small>Firma autorizada</small>
                  </div>
                </div>
              </div>
            </div>

            <footer className="cotizacion-modal-footer no-imprimir">
              <button
                type="button"
                className="cotizacion-btn-secundario"
                onClick={() => setCotizacionDocumento(null)}
              >
                Cerrar
              </button>

              <button
                type="button"
                className="cotizacion-btn-principal"
                onClick={descargarPDF}
                disabled={generandoPDF}
              >
                <FileDown size={18} />

                {generandoPDF
                  ? "Generando PDF..."
                  : "Descargar PDF"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* CONFIRMACIÓN DE ELIMINACIÓN */}
      {cotizacionEliminar && (
        <div className="as-confirmacion-overlay">
          <section className="as-confirmacion-modal">
            <div className="as-confirmacion-icono">
              <Trash2 size={27} />
            </div>

            <h2>¿Eliminar cotización?</h2>

            <p>
              ¿Estás seguro de que deseas eliminar la cotización{" "}
              <strong>{cotizacionEliminar.idCotizacion}</strong>? Esta acción
              no se puede deshacer.
            </p>

            <div className="as-confirmacion-acciones">
              <button
                className="as-confirmacion-cancelar"
                onClick={() => setCotizacionEliminar(null)}
              >
                Cancelar
              </button>

              <button
                className="as-confirmacion-eliminar"
                onClick={confirmarEliminacion}
              >
                Sí, eliminar
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default Cotizaciones;
