
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  Copy,
} from "lucide-react";

import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import html2pdf from "html2pdf.js";

import api from "../services/api";
import "../styles/cotizaciones.css";

// ==========================================
// CONSTANTES
// ==========================================

const ESTADOS = ["Borrador", "Enviada", "Aceptada", "Rechazada"];

const FORMA_PAGO =
  "70% ANTICIPO - 20% SEGUNDA ESTIMACIÓN - 10% AL FINALIZAR";

const conceptoVacio = () => ({
  descripcion: "",
  ancho: "0",
  alto: "0",
  cantidad: "1",
  precioUnitario: "0",
});

// ==========================================
// FECHAS
// ==========================================

function fechaActual() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// ==========================================
// FORMULARIO INICIAL
// ==========================================

const formularioInicial = () => ({
  idCliente: "",
  idProyecto: "",
  fecha: fechaActual(),
  porcentajeIVA: "13",
  estado: "Borrador",
  anticipo: FORMA_PAGO,
  entrega: "",
  validez: "15 días",
  conceptos: [conceptoVacio()],
});

// ==========================================
// FORMATO DE TEXTO
// ==========================================

const capitalizarPalabras = (texto = "") =>
  String(texto).replace(
    /(^|[\s])(\p{L})/gu,
    (coincidencia, espacio, letra) =>
      espacio + letra.toLocaleUpperCase("es-SV")
  );

const limpiarTexto = (texto = "") =>
  String(texto).replace(/[^\p{L}\p{N}\s.,&'()/%#-]/gu, "");

// ==========================================
// LIMPIAR NOMBRE DEL ARCHIVO PDF
// ==========================================

const limpiarNombreArchivo = (texto = "") =>
  String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// ==========================================
// FORMATO DE DATOS
// ==========================================

const formatoDinero = (cantidad) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(cantidad) || 0);

const formatoMedida = (valor) =>
  Number(valor || 0).toFixed(4);

// ==========================================
// ALERTAS
// ==========================================

const alerta = (icon, title, text) =>
  Swal.fire({
    icon,
    title,
    text,
    confirmButtonText: "Aceptar",
    confirmButtonColor: "#0C133F",
    customClass: {
      popup: "cotizacion-swal-popup",
      confirmButton: "cotizacion-swal-confirmar",
    },
  });

const mostrarCarga = (titulo) => {
  Swal.fire({
    title: titulo,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    customClass: {
      popup: "cotizacion-swal-popup",
    },
    didOpen: () => Swal.showLoading(),
  });
};

// ==========================================
// ESPERAR CARGA DE IMÁGENES
// ==========================================

const esperarImagen = async (imagen) => {
  if (!imagen) return;

  if (!imagen.complete) {
    await new Promise((resolve, reject) => {
      imagen.onload = resolve;
      imagen.onerror = () =>
        reject(new Error("No se pudo cargar el logo de A&S."));
    });
  }

  if (!imagen.naturalWidth || !imagen.naturalHeight) {
    throw new Error("El logo de A&S no se pudo cargar correctamente.");
  }

  if (imagen.decode) {
    await imagen.decode();
  }
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

function Cotizaciones() {
  const navigate = useNavigate();

  const [cotizaciones, setCotizaciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proyectos, setProyectos] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [cotizacionEditando, setCotizacionEditando] = useState(null);
  const [cotizacionCopiando, setCotizacionCopiando] = useState(null);
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

  const [formulario, setFormulario] = useState(formularioInicial);

  // ==========================================
  // CARGAR INFORMACIÓN
  // ==========================================

  const cargarDatos = async (mostrarError = true) => {
    try {
      setCargando(true);

      const [resCotizaciones, resClientes, resProyectos] =
        await Promise.all([
          api.get("/cotizaciones"),
          api.get("/clientes"),
          api.get("/proyectos"),
        ]);

      setCotizaciones(resCotizaciones.data.cotizaciones || []);
      setClientes(resClientes.data.clientes || []);
      setProyectos(resProyectos.data.proyectos || []);
    } catch (error) {
      console.error("Error al cargar cotizaciones:", error);

      if (mostrarError) {
        alerta(
          "error",
          "Error al cargar",
          error.response?.data?.message ||
            "No se pudieron cargar los datos de cotizaciones."
        );
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ==========================================
  // PROYECTOS DEL CLIENTE
  // ==========================================

  const proyectosDelCliente = useMemo(() => {
    if (!formulario.idCliente) return [];

    const clienteSeleccionado = clientes.find(
      (cliente) =>
        String(cliente.idCliente).toUpperCase() ===
        String(formulario.idCliente).toUpperCase()
    );

    if (!clienteSeleccionado) return [];

    return proyectos.filter((proyecto) => {
      const relacionCliente = proyecto.idCliente;

      const idMongoCliente =
        relacionCliente && typeof relacionCliente === "object"
          ? relacionCliente._id
          : relacionCliente;

      const codigoCliente =
        relacionCliente && typeof relacionCliente === "object"
          ? relacionCliente.idCliente
          : null;

      return (
        String(idMongoCliente || "") ===
          String(clienteSeleccionado._id) ||
        String(codigoCliente || "").toUpperCase() ===
          String(clienteSeleccionado.idCliente || "").toUpperCase()
      );
    });
  }, [proyectos, clientes, formulario.idCliente]);

  // ==========================================
  // CÁLCULOS
  // ==========================================

  const subtotal = useMemo(
    () =>
      formulario.conceptos.reduce((acumulado, concepto) => {
        return (
          acumulado +
          (Number(concepto.cantidad) || 0) *
            (Number(concepto.precioUnitario) || 0)
        );
      }, 0),
    [formulario.conceptos]
  );

  const porcentajeIVA = Number(formulario.porcentajeIVA);

  const iva =
    (subtotal *
      (Number.isFinite(porcentajeIVA) ? porcentajeIVA : 0)) /
    100;

  const totalGeneral = subtotal + iva;

  // ==========================================
  // BÚSQUEDA
  // ==========================================

  const cotizacionesFiltradas = cotizaciones.filter((cotizacion) => {
    const texto = busqueda.toLocaleLowerCase("es-SV");

    const codigo = cotizacion.idCotizacion?.toLowerCase() || "";
    const cliente = cotizacion.idCliente?.nombre?.toLowerCase() || "";
    const proyecto = cotizacion.idProyecto?.proyecto?.toLowerCase() || "";
    const origen =
      cotizacion.cotizacionOrigen?.toString().toLowerCase() || "";

    return (
      codigo.includes(texto) ||
      cliente.includes(texto) ||
      proyecto.includes(texto) ||
      origen.includes(texto)
    );
  });

  // ==========================================
  // CREAR COTIZACIÓN
  // ==========================================

  const abrirNuevaCotizacion = () => {
    setCotizacionEditando(null);
    setCotizacionCopiando(null);
    setFormulario(formularioInicial());
    setModalAbierto(true);
  };

  // ==========================================
  // EDITAR COTIZACIÓN
  // ==========================================

  const abrirEdicion = (cotizacion) => {
    setCotizacionEditando(cotizacion);
    setCotizacionCopiando(null);

    setFormulario({
      idCliente:
        cotizacion.idCliente?.idCliente ||
        cotizacion.idCliente?._id ||
        cotizacion.idCliente ||
        "",

      idProyecto:
        cotizacion.idProyecto?.idProyecto ||
        cotizacion.idProyecto?._id ||
        cotizacion.idProyecto ||
        "",

      fecha: cotizacion.fecha
        ? (() => {
            const fecha = new Date(cotizacion.fecha);

            return new Intl.DateTimeFormat("en-CA", {
              timeZone: "America/El_Salvador",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(fecha);
          })()
        : fechaActual(),

      porcentajeIVA: String(cotizacion.porcentajeIVA ?? 13),
      estado: cotizacion.estado || "Borrador",

      // La forma de pago siempre será fija
      anticipo: FORMA_PAGO,

      entrega: cotizacion.entrega || "",
      validez: cotizacion.validez || "15 días",

      conceptos:
        Array.isArray(cotizacion.conceptos) &&
        cotizacion.conceptos.length > 0
          ? cotizacion.conceptos.map((concepto) => ({
              descripcion: concepto.descripcion || "",
              ancho: String(concepto.ancho ?? 0),
              alto: String(concepto.alto ?? 0),
              cantidad: String(concepto.cantidad ?? 1),
              precioUnitario: String(concepto.precioUnitario ?? 0),
            }))
          : [conceptoVacio()],
    });

    setModalAbierto(true);
  };

  // ==========================================
  // COPIAR COTIZACIÓN
  // ==========================================

  const abrirCopia = (cotizacion) => {
    setCotizacionEditando(null);
    setCotizacionCopiando(cotizacion);

    const idCliente =
      cotizacion.idCliente?.idCliente ||
      cotizacion.idCliente?._id ||
      cotizacion.idCliente ||
      "";

    const idProyecto =
      cotizacion.idProyecto?.idProyecto ||
      cotizacion.idProyecto?._id ||
      cotizacion.idProyecto ||
      "";

    const conceptos =
      Array.isArray(cotizacion.conceptos) &&
      cotizacion.conceptos.length > 0
        ? cotizacion.conceptos.map((concepto) => ({
            descripcion: concepto.descripcion || "",
            ancho: String(concepto.ancho ?? 0),
            alto: String(concepto.alto ?? 0),
            cantidad: String(concepto.cantidad ?? 1),
            precioUnitario: String(concepto.precioUnitario ?? 0),
          }))
        : [conceptoVacio()];

    setFormulario({
      idCliente,
      idProyecto,
      fecha: fechaActual(),
      porcentajeIVA: String(cotizacion.porcentajeIVA ?? 13),
      estado: "Borrador",

      // La copia también utiliza la forma de pago fija
      anticipo: FORMA_PAGO,

      entrega: cotizacion.entrega || "",
      validez: cotizacion.validez || "15 días",
      conceptos,
    });

    setModalAbierto(true);
  };

  // ==========================================
  // ACTUALIZAR FORMULARIO
  // ==========================================

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

  const eliminarConcepto = async (indice) => {
    if (formulario.conceptos.length === 1) {
      await alerta(
        "warning",
        "Concepto obligatorio",
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

  // ==========================================
  // VALIDACIONES
  // ==========================================

  const validarFormulario = () => {
    if (formulario.idCliente) {
      const clienteExiste = clientes.some(
        (cliente) =>
          String(cliente.idCliente) === String(formulario.idCliente)
      );

      if (!clienteExiste) {
        alerta(
          "warning",
          "Cliente no válido",
          "El cliente seleccionado ya no está disponible. Actualiza la lista."
        );
        return false;
      }
    }

    if (formulario.idProyecto) {
      if (!formulario.idCliente) {
        alerta(
          "warning",
          "Selecciona un cliente",
          "Para asociar un proyecto primero debes seleccionar su cliente."
        );
        return false;
      }

      const proyectoValido = proyectosDelCliente.some(
        (proyecto) =>
          String(proyecto.idProyecto) === String(formulario.idProyecto)
      );

      if (!proyectoValido) {
        alerta(
          "warning",
          "Proyecto no válido",
          "El proyecto debe pertenecer al cliente seleccionado."
        );
        return false;
      }
    }

    if (
      !formulario.fecha ||
      Number.isNaN(
        new Date(`${formulario.fecha}T12:00:00`).getTime()
      )
    ) {
      alerta(
        "warning",
        "Fecha no válida",
        "Selecciona una fecha válida."
      );
      return false;
    }

    if (!ESTADOS.includes(formulario.estado)) {
      alerta(
        "warning",
        "Estado no válido",
        "Selecciona un estado permitido."
      );
      return false;
    }

    const ivaIngresado = Number(formulario.porcentajeIVA);

    if (
      formulario.porcentajeIVA === "" ||
      !Number.isFinite(ivaIngresado) ||
      ivaIngresado < 0 ||
      ivaIngresado > 100
    ) {
      alerta(
        "warning",
        "IVA no válido",
        "El porcentaje de IVA debe estar entre 0 y 100."
      );
      return false;
    }

    if (
      !Array.isArray(formulario.conceptos) ||
      formulario.conceptos.length === 0
    ) {
      alerta(
        "warning",
        "Conceptos obligatorios",
        "Agrega al menos un concepto a la cotización."
      );
      return false;
    }

    for (let i = 0; i < formulario.conceptos.length; i += 1) {
      const concepto = formulario.conceptos[i];
      const descripcion = concepto.descripcion.trim();
      const cantidad = Number(concepto.cantidad);
      const precio = Number(concepto.precioUnitario);
      const ancho = Number(concepto.ancho);
      const alto = Number(concepto.alto);

      if (descripcion.length < 3 || descripcion.length > 200) {
        alerta(
          "warning",
          `Descripción del concepto ${i + 1}`,
          "La descripción debe tener entre 3 y 200 caracteres."
        );
        return false;
      }

      if (
        !Number.isFinite(ancho) ||
        ancho < 0 ||
        ancho > 1000000 ||
        !/^\d+(\.\d{1,4})?$/.test(String(concepto.ancho))
      ) {
        alerta(
          "warning",
          `Ancho del concepto ${i + 1}`,
          "El ancho debe ser un número válido con máximo 4 decimales."
        );
        return false;
      }

      if (
        !Number.isFinite(alto) ||
        alto < 0 ||
        alto > 1000000 ||
        !/^\d+(\.\d{1,4})?$/.test(String(concepto.alto))
      ) {
        alerta(
          "warning",
          `Alto del concepto ${i + 1}`,
          "El alto debe ser un número válido con máximo 4 decimales."
        );
        return false;
      }

      if (
        !Number.isFinite(cantidad) ||
        cantidad <= 0 ||
        cantidad > 1000000
      ) {
        alerta(
          "warning",
          `Cantidad del concepto ${i + 1}`,
          "La cantidad debe ser mayor que cero y no exceder 1,000,000."
        );
        return false;
      }

      if (
        !Number.isFinite(precio) ||
        precio < 0 ||
        precio > 100000000
      ) {
        alerta(
          "warning",
          `Precio del concepto ${i + 1}`,
          "El precio debe ser un número igual o mayor que cero."
        );
        return false;
      }
    }

    if (formulario.entrega.length > 200) {
      alerta(
        "warning",
        "Entrega demasiado larga",
        "El tiempo de entrega admite hasta 200 caracteres."
      );
      return false;
    }

    if (formulario.validez.length > 100) {
      alerta(
        "warning",
        "Validez demasiado larga",
        "La validez admite hasta 100 caracteres."
      );
      return false;
    }

    return true;
  };

  // ==========================================
  // GUARDAR / ACTUALIZAR / COPIAR
  // ==========================================

  const guardarCotizacion = async (evento) => {
    evento.preventDefault();

    if (guardando || !validarFormulario()) return;

    const esEdicion = Boolean(cotizacionEditando);
    const esCopia = Boolean(cotizacionCopiando);

    const datos = {
      idCliente: formulario.idCliente || null,
      idProyecto: formulario.idProyecto || null,
      fecha: formulario.fecha,
      porcentajeIVA: Number(formulario.porcentajeIVA),
      estado: formulario.estado,

      // Se guarda siempre la misma forma de pago
      anticipo: FORMA_PAGO,

      entrega: capitalizarPalabras(formulario.entrega.trim()),
      validez: capitalizarPalabras(formulario.validez.trim()),

      cotizacionOrigen: esCopia
        ? cotizacionCopiando.idCotizacion
        : esEdicion
          ? cotizacionEditando.cotizacionOrigen || null
          : null,

      conceptos: formulario.conceptos.map((concepto) => ({
        descripcion: capitalizarPalabras(
          limpiarTexto(concepto.descripcion).trim()
        ),
        ancho: Number(concepto.ancho),
        alto: Number(concepto.alto),
        cantidad: Number(concepto.cantidad),
        precioUnitario: Number(concepto.precioUnitario),
      })),
    };

    try {
      setGuardando(true);

      mostrarCarga(
        esEdicion
          ? "Actualizando cotización..."
          : esCopia
            ? "Creando copia de cotización..."
            : "Guardando cotización..."
      );

      if (esEdicion) {
        await api.put(
          `/cotizaciones/${cotizacionEditando.idCotizacion}`,
          datos
        );
      } else {
        await api.post("/cotizaciones", datos);
      }

      Swal.close();

      setModalAbierto(false);
      setCotizacionEditando(null);
      setCotizacionCopiando(null);

      await cargarDatos(false);

      await alerta(
        "success",
        "¡Operación exitosa!",
        esEdicion
          ? "La cotización se actualizó correctamente."
          : esCopia
            ? "La copia se creó correctamente y quedó relacionada con su cotización original."
            : "La cotización se creó correctamente."
      );
    } catch (error) {
      Swal.close();

      console.error("Error al guardar cotización:", error);

      alerta(
        "error",
        "No se pudo guardar",
        error.response?.data?.message ||
          "Ocurrió un error al guardar la cotización."
      );
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINAR COTIZACIÓN
  // ==========================================

  const confirmarEliminacion = async (cotizacion) => {
    const resultado = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar cotización?",
      html: `Se eliminará la cotización <strong>${cotizacion.idCotizacion}</strong>. Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#DC3545",
      cancelButtonColor: "#64748B",
      reverseButtons: true,
      customClass: {
        popup: "cotizacion-swal-popup",
      },
    });

    if (!resultado.isConfirmed) return;

    try {
      mostrarCarga("Eliminando cotización...");

      await api.delete(
        `/cotizaciones/${cotizacion.idCotizacion}`
      );

      Swal.close();

      await cargarDatos(false);

      await alerta(
        "success",
        "Cotización eliminada",
        "El registro se eliminó correctamente."
      );
    } catch (error) {
      Swal.close();

      console.error("Error al eliminar cotización:", error);

      alerta(
        "error",
        "No se pudo eliminar",
        error.response?.data?.message ||
          "Ocurrió un error al eliminar la cotización."
      );
    }
  };

  // ==========================================
  // ESTADOS
  // ==========================================

  const obtenerClaseEstado = (estado) => {
    const clases = {
      Borrador: "borrador",
      Enviada: "enviada",
      Aceptada: "aceptada",
      Rechazada: "rechazada",
    };

    return clases[estado] || "borrador";
  };

  // ==========================================
  // DOCUMENTO PDF
  // ==========================================

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

  // ==========================================
  // GENERAR Y DESCARGAR PDF
  // ==========================================

  const descargarPDF = async () => {
    if (!cotizacionDocumento || generandoPDF) return;

    if (!Object.values(opcionesDocumento).some(Boolean)) {
      await alerta(
        "warning",
        "Documento vacío",
        "Selecciona al menos un dato para incluir en el documento."
      );
      return;
    }

    const elemento = document.querySelector(
      ".cotizacion-documento-vista"
    );

    if (!elemento) {
      await alerta(
        "error",
        "Documento no encontrado",
        "No se encontró la vista del documento."
      );
      return;
    }

    try {
      setGenerandoPDF(true);

      const imagenes = Array.from(
        elemento.querySelectorAll("img")
      );

      await Promise.all(
        imagenes.map((imagen) => esperarImagen(imagen))
      );

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });

      const nombreCliente =
        cotizacionDocumento.idCliente?.nombre || "Sin-Cliente";

      const nombreLimpio = limpiarNombreArchivo(nombreCliente);

      const codigo = limpiarNombreArchivo(
        cotizacionDocumento.idCotizacion || "Cotizacion"
      );

      const nombrePDF = `Cotizacion-${nombreLimpio}-${codigo}.pdf`;

      const anchoDocumento = Math.max(
        elemento.scrollWidth,
        elemento.offsetWidth
      );

      const altoDocumento = Math.max(
        elemento.scrollHeight,
        elemento.offsetHeight
      );

      await html2pdf()
        .set({
          margin: [7, 7, 7, 7],

          filename: nombrePDF,

          image: {
            type: "jpeg",
            quality: 0.98,
          },

          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#FFFFFF",
            logging: false,
            windowWidth: anchoDocumento,
            windowHeight: altoDocumento,
            scrollX: 0,
            scrollY: 0,
          },

          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "landscape",
          },

          pagebreak: {
            mode: ["css", "legacy"],
            before: [".pdf-condiciones-generales"],
            avoid: [
              ".pdf-plantilla-encabezado",
              ".pdf-datos-bloque",
              ".pdf-condiciones-comerciales",
              ".pdf-firmas",
            ],
          },
        })
        .from(elemento)
        .save();

      // Cerrar el modal del documento
      setCotizacionDocumento(null);

      // Confirmación de descarga
      await alerta(
        "success",
        "PDF generado",
        `Se descargó correctamente: ${nombrePDF}`
      );

      // Regresar a la página de cotizaciones
      navigate("/cotizaciones");
    } catch (error) {
      console.error("Error al generar PDF:", error);

      await alerta(
        "error",
        "Error al generar PDF",
        error.message ||
          "No se pudo generar el documento. Verifica que Imagen 1.png esté dentro de public."
      );
    } finally {
      setGenerandoPDF(false);
    }
  };

  // ==========================================
  // FECHA DEL DOCUMENTO
  // ==========================================

  const fechaDocumento = cotizacionDocumento?.fecha
    ? new Date(cotizacionDocumento.fecha).toLocaleDateString(
        "es-SV",
        {
          timeZone: "America/El_Salvador",
        }
      )
    : "—";

  // ==========================================
  // RENDERIZADO
  // ==========================================

  return (
    <main className="cotizaciones-page">

      {/* ENCABEZADO */}

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
          type="button"
          className="cotizacion-btn-principal"
          onClick={abrirNuevaCotizacion}
        >
          <Plus size={19} />
          Nueva cotización
        </button>
      </section>

      {/* INDICADORES */}

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
              {
                cotizaciones.filter(
                  (c) => c.estado === "Aceptada"
                ).length
              }
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
              {
                cotizaciones.filter(
                  (c) => c.estado === "Enviada"
                ).length
              }
            </strong>
          </div>
        </article>
      </section>

      {/* LISTADO */}

      <section className="cotizaciones-contenido">
        <div className="cotizaciones-tabla-encabezado">
          <div>
            <h2>Listado de cotizaciones</h2>
            <p>
              Consulta y administra tus cotizaciones registradas.
            </p>
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
                type="button"
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
                {cotizacionesFiltradas.map((cotizacion) => {
                  const esCopia =
                    Boolean(cotizacion.esCopia) ||
                    Boolean(cotizacion.cotizacionOrigen);

                  return (
                    <tr key={cotizacion._id}>
                      <td>
                        <div className="cotizacion-codigo-contenedor">
                          <strong className="cotizacion-codigo">
                            {cotizacion.idCotizacion}
                          </strong>

                          <span
                            className={`cotizacion-tipo ${
                              esCopia ? "copia" : "original"
                            }`}
                          >
                            {esCopia ? (
                              <>
                                <Copy size={11} />
                                COPIA
                              </>
                            ) : (
                              "ORIGINAL"
                            )}
                          </span>
                        </div>

                        {cotizacion.cotizacionOrigen && (
                          <small className="cotizacion-origen">
                            De: {cotizacion.cotizacionOrigen}
                          </small>
                        )}
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
                          ? new Date(cotizacion.fecha).toLocaleDateString(
                              "es-SV",
                              {
                                timeZone: "America/El_Salvador",
                              }
                            )
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
                            type="button"
                            className="cotizacion-accion editar"
                            title="Editar cotización"
                            onClick={() => abrirEdicion(cotizacion)}
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            className="cotizacion-accion copiar"
                            title="Crear copia de cotización"
                            onClick={() => abrirCopia(cotizacion)}
                          >
                            <Copy size={17} />
                          </button>

                          <button
                            type="button"
                            className="cotizacion-generar-btn"
                            title="Generar documento para el cliente"
                            onClick={() => abrirDocumento(cotizacion)}
                          >
                            <FileText size={16} />
                            Generar
                          </button>

                          <button
                            type="button"
                            className="cotizacion-accion eliminar"
                            title="Eliminar cotización"
                            onClick={() =>
                              confirmarEliminacion(cotizacion)
                            }
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
      </section>

      {/* MODAL CREAR / EDITAR / COPIAR */}

      {modalAbierto && (
        <div
          className="cotizacion-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !guardando) {
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
                    : cotizacionCopiando
                      ? `COPIA DE ${cotizacionCopiando.idCotizacion}`
                      : "NUEVO REGISTRO"}
                </span>

                <h2>
                  {cotizacionEditando
                    ? "Editar cotización"
                    : cotizacionCopiando
                      ? "Crear copia de cotización"
                      : "Crear cotización"}
                </h2>

                <p>
                  {cotizacionCopiando
                    ? `Estás creando una copia de ${cotizacionCopiando.idCotizacion}. Puedes modificar cualquier dato antes de guardarla.`
                    : "Completa los datos y agrega los conceptos necesarios."}
                </p>
              </div>

              <button
                type="button"
                className="cotizacion-modal-cerrar"
                onClick={() => setModalAbierto(false)}
                disabled={guardando}
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
                    <span>Cliente (opcional)</span>

                    <div className="cotizacion-input-icono">
                      <UserRound size={17} />

                      <select
                        value={formulario.idCliente}
                        onChange={(e) => {
                          actualizarCampo("idCliente", e.target.value);
                          actualizarCampo("idProyecto", "");
                        }}
                      >
                        <option value="">Sin cliente asociado</option>

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
                    <span>Fecha *</span>

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
                        {ESTADOS.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>

                      <ChevronDown size={16} />
                    </div>
                  </label>
                </div>

                {/* CONDICIONES */}

                <div className="cotizacion-seccion-titulo cotizacion-conceptos-titulo">
                  <FileText size={19} />
                  <h3>Condiciones de la cotización</h3>
                </div>

                <div className="cotizacion-form-grid cotizacion-condiciones-grid">
                  <label className="cotizacion-campo">
                    <span>Forma de pago</span>

                    <div className="cotizacion-anticipo-lectura">
                      {FORMA_PAGO}
                    </div>
                  </label>

                  <label className="cotizacion-campo">
                    <span>Tiempo de entrega</span>

                    <input
                      type="text"
                      maxLength={200}
                      placeholder="Ej. 30 a 40 días hábiles"
                      value={formulario.entrega}
                      onChange={(e) =>
                        actualizarCampo("entrega", e.target.value)
                      }
                      onBlur={() =>
                        actualizarCampo(
                          "entrega",
                          capitalizarPalabras(formulario.entrega)
                        )
                      }
                    />
                  </label>

                  <label className="cotizacion-campo">
                    <span>Validez de la oferta</span>

                    <input
                      type="text"
                      maxLength={100}
                      placeholder="Ej. 15 días"
                      value={formulario.validez}
                      onChange={(e) =>
                        actualizarCampo("validez", e.target.value)
                      }
                      onBlur={() =>
                        actualizarCampo(
                          "validez",
                          capitalizarPalabras(formulario.validez)
                        )
                      }
                    />
                  </label>
                </div>

                {/* CONCEPTOS */}

                <div className="cotizacion-seccion-titulo cotizacion-conceptos-titulo">
                  <ClipboardList size={19} />
                  <h3>Conceptos de la cotización</h3>
                </div>

                <p className="cotizacion-ayuda">
                  Agrega los productos, materiales, servicios o trabajos
                  que necesites.
                </p>

                <div className="cotizacion-conceptos-lista">
                  {formulario.conceptos.map((concepto, indice) => {
                    const totalConcepto =
                      (Number(concepto.cantidad) || 0) *
                      (Number(concepto.precioUnitario) || 0);

                    return (
                      <div
                        className="cotizacion-concepto"
                        key={indice}
                      >
                        <div className="cotizacion-concepto-numero">
                          {String(indice + 1).padStart(2, "0")}
                        </div>

                        <label className="cotizacion-campo concepto-descripcion">
                          <span>Descripción *</span>

                          <input
                            type="text"
                            maxLength={200}
                            placeholder="Ej. Ventanas de aluminio natural"
                            value={concepto.descripcion}
                            onChange={(e) =>
                              actualizarConcepto(
                                indice,
                                "descripcion",
                                limpiarTexto(e.target.value)
                              )
                            }
                            onBlur={() =>
                              actualizarConcepto(
                                indice,
                                "descripcion",
                                capitalizarPalabras(
                                  concepto.descripcion.trim()
                                )
                              )
                            }
                            required
                          />
                        </label>

                        <label className="cotizacion-campo concepto-medida">
                          <span>Ancho (m) *</span>

                          <input
                            type="number"
                            min="0"
                            max="1000000"
                            step="0.0001"
                            value={concepto.ancho}
                            onChange={(e) =>
                              actualizarConcepto(
                                indice,
                                "ancho",
                                e.target.value
                              )
                            }
                            required
                          />
                        </label>

                        <label className="cotizacion-campo concepto-medida">
                          <span>Alto (m) *</span>

                          <input
                            type="number"
                            min="0"
                            max="1000000"
                            step="0.0001"
                            value={concepto.alto}
                            onChange={(e) =>
                              actualizarConcepto(
                                indice,
                                "alto",
                                e.target.value
                              )
                            }
                            required
                          />
                        </label>

                        <label className="cotizacion-campo concepto-cantidad">
                          <span>Cantidad *</span>

                          <input
                            type="number"
                            min="0.01"
                            max="1000000"
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
                          <span>Precio unitario ($) *</span>

                          <input
                            type="number"
                            min="0"
                            max="100000000"
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

                          <strong>
                            {formatoDinero(totalConcepto)}
                          </strong>
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

                {/* RESUMEN */}

                <div className="cotizacion-resumen-final">
                  <div className="cotizacion-iva-control">
                    <label htmlFor="porcentajeIVA">IVA (%)</label>

                    <input
                      id="porcentajeIVA"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formulario.porcentajeIVA}
                      onChange={(e) =>
                        actualizarCampo(
                          "porcentajeIVA",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="cotizacion-calculos">
                    <div>
                      <span>Subtotal</span>
                      <strong>{formatoDinero(subtotal)}</strong>
                    </div>

                    <div>
                      <span>
                        IVA ({formulario.porcentajeIVA || 0}%)
                      </span>
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
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="cotizacion-btn-principal"
                  disabled={guardando}
                >
                  <Save size={18} />

                  {guardando
                    ? "Guardando..."
                    : cotizacionEditando
                      ? "Guardar cambios"
                      : cotizacionCopiando
                        ? "Guardar copia"
                        : "Guardar cotización"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* ==========================================
          MODAL DEL DOCUMENTO PDF
      ========================================== */}

      {cotizacionDocumento && (
        <div
          className="cotizacion-modal-overlay cotizacion-documento-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget &&
              !generandoPDF
            ) {
              setCotizacionDocumento(null);
            }
          }}
        >
          <section className="cotizacion-modal cotizacion-modal-documento">

            {/* ENCABEZADO DEL MODAL */}

            <header className="cotizacion-modal-header no-imprimir">
              <div>
                <span className="cotizaciones-etiqueta">
                  DOCUMENTO PARA CLIENTE
                </span>

                <h2>Generar cotización</h2>

                <p>
                  Selecciona la información que deseas incluir en el
                  documento.
                </p>
              </div>

              <button
                type="button"
                className="cotizacion-modal-cerrar"
                onClick={() => setCotizacionDocumento(null)}
                disabled={generandoPDF}
              >
                <X size={21} />
              </button>
            </header>

            <div className="cotizacion-documento-cuerpo">

              {/* OPCIONES DEL DOCUMENTO */}

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
                      onChange={() =>
                        cambiarOpcionDocumento(clave)
                      }
                    />
                    {etiqueta}
                  </label>
                ))}
              </div>

              {/* DOCUMENTO QUE SE CONVIERTE EN PDF */}

              <div className="cotizacion-documento-vista">

                {/* ENCABEZADO DE EMPRESA Y COTIZACIÓN */}

                <div className="pdf-plantilla-encabezado">

                  <div className="pdf-encabezado-empresa">
                    <div className="pdf-logo">
                      <img
                        src="/Imagen%201.png"
                        alt="Logo A&S Aluminio y Vidrio"
                        className="pdf-logo-imagen"
                        crossOrigin="anonymous"
                      />
                    </div>

                    <div className="pdf-empresa">
                      <h2>
                        ACABADOS Y SERVICIOS S.A. DE C.V.
                      </h2>

                      <p>
                        Sistemas de Aluminio y Vidrio | Tel: 2226-0408 |
                        E-mail: acabados_y_servicios@yahoo.com
                      </p>

                      <p>
                        Quinta avenida norte y 31 calle poniente número
                        413, San Salvador
                      </p>
                    </div>
                  </div>

                  <div className="pdf-titulo">
                    <h2>COTIZACIONES</h2>

                    <strong>
                      {cotizacionDocumento.idCotizacion}
                    </strong>

                    <span className="pdf-cliente-nombre">
                      {cotizacionDocumento.idCliente?.nombre ||
                        "Sin cliente"}
                    </span>

                    <span>{fechaDocumento}</span>
                  </div>
                </div>

                <div className="pdf-linea" />

                {/* DATOS DEL CLIENTE Y PROYECTO */}

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

                {/* DETALLE DE COTIZACIÓN */}

                {opcionesDocumento.conceptos && (
                  <section className="pdf-detalle">
                    <h3>DETALLE DE LA COTIZACIÓN</h3>

                    <table className="pdf-tabla">
                      <thead>
                        <tr>
                          <th>ÍTEM</th>
                          <th>DESCRIPCIÓN</th>
                          <th>ANCHO (m)</th>
                          <th>ALTO (m)</th>

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

                              <td>
                                {formatoMedida(concepto.ancho)}
                              </td>

                              <td>
                                {formatoMedida(concepto.alto)}
                              </td>

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

                {/* CONDICIONES COMERCIALES Y TOTALES */}

                <div className="pdf-parte-inferior">

                  <section className="pdf-condiciones-comerciales">
                    <h3>CONDICIONES COMERCIALES</h3>

                    <p>
                      <strong>FORMA DE PAGO:</strong>{" "}
                      {FORMA_PAGO}
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

                {/* CONDICIONES GENERALES */}

                <section className="pdf-condiciones-generales">
                  <h3>CONDICIONES GENERALES DEL CONTRATO</h3>

                  <div className="pdf-condiciones-columnas">

                    <div>
                      <p>
                        <strong>A)</strong> El Cliente pagará el valor
                        de este contrato de acuerdo con los términos y
                        condiciones contratadas.
                      </p>

                      <p>
                        <strong>B)</strong> El Cliente autoriza los
                        trabajos de acuerdo con lo expresado en la
                        presente cotización, con los valores y medidas
                        acordadas.
                      </p>

                      <p>
                        <strong>C)</strong> El tiempo de ejecución se
                        realizará en días y horas hábiles. Los trabajos
                        nocturnos podrán generar costos adicionales.
                      </p>

                      <p>
                        <strong>D)</strong> El cliente deberá proveer
                        un lugar seguro para el almacenamiento de
                        materiales y herramientas.
                      </p>

                      <p>
                        <strong>E)</strong> El cliente proveerá
                        alimentación eléctrica para las herramientas a
                        una distancia máxima de 25 m.
                      </p>

                      <p>
                        <strong>F)</strong> El cliente deberá mantener
                        el área de trabajo libre de materiales u objetos
                        que impidan la instalación.
                      </p>

                      <p>
                        <strong>G)</strong> La fecha de inicio se
                        confirmará después de recibido el anticipo e
                        incluido el proyecto en la programación.
                      </p>
                    </div>

                    <div>
                      <p>
                        <strong>H)</strong> Una vez cancelado el
                        anticipo, el proyecto deberá ejecutarse en un
                        plazo no mayor a 90 días o según lo negociado.
                      </p>

                      <p>
                        <strong>I)</strong> Si se requiere devolución
                        del anticipo, la empresa se reserva el derecho
                        de retener el 10 % por operaciones realizadas.
                      </p>

                      <p>
                        <strong>J)</strong> El material será propiedad
                        de ACABADOS Y SERVICIOS S.A. DE C.V. mientras
                        no haya sido cancelado en su totalidad.
                      </p>

                      <p>
                        <strong>K)</strong> Se brinda garantía de un
                        año en instalaciones y 10 años en materiales,
                        excluyendo vidrio, bajo las condiciones
                        establecidas.
                      </p>

                      <p>
                        <strong>L)</strong> Los materiales cuentan con
                        garantía contra desperfectos de fabricación
                        según las políticas del fabricante.
                      </p>

                      <p>
                        <strong>M)</strong> La empresa se reserva el
                        dominio de lo vendido mientras no esté
                        totalmente pagado.
                      </p>

                      <p>
                        <strong>N)</strong> La validez de esta oferta
                        será la indicada en las condiciones comerciales
                        de esta cotización.
                      </p>
                    </div>

                  </div>
                </section>

                {/* FIRMAS */}

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

            {/* BOTONES DEL MODAL */}

            <footer className="cotizacion-modal-footer no-imprimir">

              <button
                type="button"
                className="cotizacion-btn-secundario"
                onClick={() => setCotizacionDocumento(null)}
                disabled={generandoPDF}
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

    </main>
  );
}

export default Cotizaciones;
