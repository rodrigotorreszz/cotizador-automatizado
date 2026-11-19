
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
  Download,
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import api from "../services/api";
import "../styles/estadoCuentaCliente.css";

// ==========================================
// FORMATO DE DINERO
// ==========================================

const formatoDinero = (cantidad = 0) => {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(Number(cantidad) || 0);
};

// ==========================================
// FORMATO DE FECHAS
// ==========================================

const formatoFecha = (fecha) => {
  if (!fecha) return "Sin registro";

  const fechaValida = new Date(fecha);

  if (Number.isNaN(fechaValida.getTime())) {
    return "Sin registro";
  }

  return fechaValida.toLocaleDateString("es-SV");
};

// ==========================================
// VERIFICAR ESTADO APROBADO
// ==========================================

const estaAprobado = (item) => {
  return (
    item?.estado?.trim().toLowerCase() === "aprobado"
  );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

function EstadoCuentaCliente() {
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ========================================
  // CARGAR INFORMACIÓN
  // ========================================

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const respuesta = await api.get("/estado-cliente");

      if (!respuesta.data?.success) {
        throw new Error(
          respuesta.data?.message ||
            "No se pudo obtener el estado de cuenta."
        );
      }

      setClientes(respuesta.data.clientes || []);

    } catch (err) {
      console.error(
        "Error al cargar estados de cuenta:",
        err
      );

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

  // ========================================
  // FILTRAR CLIENTES
  // ========================================

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

  // ========================================
  // CLIENTE SELECCIONADO
  // ========================================

  const cliente = useMemo(() => {
    return clientes.find(
      (item) => item.idCliente === clienteSeleccionado
    );
  }, [clientes, clienteSeleccionado]);

  // ========================================
  // MOSTRAR SOLAMENTE PROYECTOS APROBADOS
  // ========================================

  const proyectos = useMemo(() => {
    return (cliente?.proyectos || []).filter(estaAprobado);
  }, [cliente]);

  // ========================================
  // MOSTRAR SOLAMENTE COTIZACIONES APROBADAS
  // ========================================

  const cotizacionesSinProyecto = useMemo(() => {
    return (cliente?.cotizacionesSinProyecto || []).filter(
      estaAprobado
    );
  }, [cliente]);

  // ========================================
  // OBTENER PAGOS
  // ========================================

  const obtenerPagos = (proyecto) => {
    return proyecto.pagos || proyecto.historial || [];
  };

  // ========================================
  // OBTENER SALDO
  // ========================================

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

  // ========================================
  // OBTENER EXCEDENTE
  // ========================================

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

  // ========================================
  // IMPRIMIR ESTADO DE CUENTA
  // ========================================

  const imprimirEstado = () => {
    if (!cliente) return;

    window.print();
  };

  // ========================================
  // DESCARGAR ESTADO DE CUENTA EN PDF
  // ========================================

  const descargarPDF = () => {
    if (!cliente) return;

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const ancho = doc.internal.pageSize.getWidth();
      const alto = doc.internal.pageSize.getHeight();

      const margen = 14;

      const azul = [7, 27, 61];
      const celeste = [8, 120, 209];
      const gris = [100, 116, 139];

      const texto = (valor) => {
        return valor === undefined ||
          valor === null ||
          valor === ""
          ? "—"
          : String(valor);
      };

      let y = 16;

      // ====================================
      // ENCABEZADO DEL DOCUMENTO
      // ====================================

      doc.setFillColor(...azul);
      doc.rect(0, 0, ancho, 39, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);

      doc.text("A&S", margen, 14);

      doc.setFontSize(15);

      doc.text("ESTADO DE CUENTA", margen, 25);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      doc.text(
        "Documento financiero individual del cliente",
        margen,
        32
      );

      doc.setFontSize(9);

      doc.text(
        `Fecha de consulta: ${formatoFecha(new Date())}`,
        ancho - margen,
        19,
        { align: "right" }
      );

      doc.setFontSize(8);

      doc.text(
        "Sistema de control financiero",
        ancho - margen,
        26,
        { align: "right" }
      );

      y = 47;

      // ====================================
      // INFORMACIÓN DEL CLIENTE
      // ====================================

      doc.setTextColor(...azul);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);

      doc.text(
        "1. INFORMACIÓN DEL CLIENTE",
        margen,
        y
      );

      y += 5;

      autoTable(doc, {
        startY: y,
        margin: {
          left: margen,
          right: margen,
        },
        theme: "grid",

        head: [[
          "Código",
          "Nombre completo",
          "Teléfono",
          "Correo electrónico",
        ]],

        body: [[
          texto(cliente.idCliente),
          texto(cliente.nombre),
          texto(cliente.telefono),
          texto(cliente.correo),
        ]],

        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 3,
          textColor: azul,
          overflow: "linebreak",
        },

        headStyles: {
          fillColor: celeste,
          textColor: 255,
          fontStyle: "bold",
        },

        alternateRowStyles: {
          fillColor: [245, 248, 252],
        },
      });

      y = doc.lastAutoTable.finalY + 10;

      // ====================================
      // RESUMEN FINANCIERO
      // ====================================

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...azul);

      doc.text(
        "2. RESUMEN FINANCIERO",
        margen,
        y
      );

      y += 5;

      autoTable(doc, {
        startY: y,
        margin: {
          left: margen,
          right: margen,
        },
        theme: "grid",

        head: [[
          "Total contratado",
          "Anticipos",
          "Abonos",
          "Total recibido",
          "Saldo pendiente",
          "Excedente",
        ]],

        body: [[
          formatoDinero(cliente.totalContratado),
          formatoDinero(cliente.anticipos),
          formatoDinero(cliente.abonos),
          formatoDinero(cliente.totalRecibido),
          formatoDinero(obtenerSaldo(cliente)),
          formatoDinero(obtenerExcedente(cliente)),
        ]],

        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 4,
          halign: "center",
          textColor: azul,
        },

        headStyles: {
          fillColor: celeste,
          textColor: 255,
          fontStyle: "bold",
        },

        bodyStyles: {
          fontStyle: "bold",
        },

        columnStyles: {
          3: {
            textColor: [22, 134, 83],
          },
          4: {
            textColor: [183, 121, 31],
          },
          5: {
            textColor: celeste,
          },
        },
      });

      y = doc.lastAutoTable.finalY + 10;

      // ====================================
      // DETALLE DE PROYECTOS
      // ====================================

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...azul);

      doc.text(
        `3. DETALLE DE PROYECTOS (${proyectos.length})`,
        margen,
        y
      );

      y += 7;

      if (proyectos.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...gris);

        doc.text(
          "Este cliente no tiene proyectos aprobados registrados.",
          margen,
          y
        );

        y += 8;
      }

      proyectos.forEach((proyecto, index) => {
        const pagos = obtenerPagos(proyecto);

        const anticipo = pagos.find(
          (pago) => pago.tipoPago === "Anticipo"
        );

        // VERIFICAR ESPACIO PARA EL PROYECTO

        if (y > alto - 48) {
          doc.addPage();
          y = 18;
        }

        // ENCABEZADO DEL PROYECTO

        doc.setFillColor(239, 246, 255);

        doc.roundedRect(
          margen,
          y - 4,
          ancho - margen * 2,
          13,
          2,
          2,
          "F"
        );

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...celeste);

        doc.text(
          `PROYECTO ${index + 1}: ${texto(proyecto.proyecto)}`,
          margen + 3,
          y + 1
        );

        doc.setFontSize(8);
        doc.setTextColor(...azul);

        doc.text(
          `Código: ${texto(proyecto.idProyecto)} | Estado: ${texto(proyecto.estado)}`,
          margen + 3,
          y + 6
        );

        y += 14;

        // DATOS FINANCIEROS DEL PROYECTO

        autoTable(doc, {
          startY: y,

          margin: {
            left: margen,
            right: margen,
          },

          theme: "grid",

          head: [[
            "Fecha de ingreso",
            "Ubicación",
            "Monto contratado",
            "Anticipos",
            "Fecha primer anticipo",
            "Abonos",
            "Total recibido",
            "Saldo pendiente",
            "Excedente",
          ]],

          body: [[
            formatoFecha(
              proyecto.createdAt || proyecto.fechaIngreso
            ),
            texto(proyecto.ubicacion),
            formatoDinero(proyecto.montoContratado),
            formatoDinero(proyecto.anticipos),
            formatoFecha(anticipo?.fecha),
            formatoDinero(proyecto.abonos),
            formatoDinero(proyecto.totalRecibido),
            formatoDinero(obtenerSaldo(proyecto)),
            formatoDinero(obtenerExcedente(proyecto)),
          ]],

          styles: {
            font: "helvetica",
            fontSize: 7,
            cellPadding: 2.5,
            overflow: "linebreak",
            textColor: azul,
          },

          headStyles: {
            fillColor: celeste,
            textColor: 255,
            fontStyle: "bold",
          },

          columnStyles: {
            1: {
              cellWidth: 28,
            },
          },
        });

        y = doc.lastAutoTable.finalY + 5;

        // HISTORIAL DE PAGOS

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...azul);

        doc.text(
          "Historial de pagos",
          margen,
          y
        );

        y += 3;

        if (pagos.length === 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...gris);

          doc.text(
            "No hay pagos registrados para este proyecto.",
            margen,
            y + 5
          );

          y += 11;

        } else {
          autoTable(doc, {
            startY: y,

            margin: {
              left: margen,
              right: margen,
            },

            theme: "striped",

            head: [[
              "Código",
              "Fecha",
              "Tipo de pago",
              "Forma de pago",
              "Referencia",
              "Monto",
            ]],

            body: pagos.map((pago) => [
              texto(pago.idAbono),
              formatoFecha(pago.fecha),
              texto(pago.tipoPago),
              texto(pago.formaPago),
              texto(pago.referencia),
              formatoDinero(pago.monto),
            ]),

            styles: {
              font: "helvetica",
              fontSize: 8,
              cellPadding: 2.5,
              textColor: azul,
              overflow: "linebreak",
            },

            headStyles: {
              fillColor: [230, 238, 248],
              textColor: azul,
              fontStyle: "bold",
            },

            columnStyles: {
              5: {
                halign: "right",
                fontStyle: "bold",
                textColor: [22, 134, 83],
              },
            },

            rowPageBreak: "avoid",
          });

          y = doc.lastAutoTable.finalY + 9;
        }
      });

      // ====================================
      // COTIZACIONES APROBADAS SIN PROYECTO
      // ====================================

      if (cotizacionesSinProyecto.length > 0) {
        if (y > alto - 40) {
          doc.addPage();
          y = 18;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...azul);

        doc.text(
          `4. COTIZACIONES APROBADAS SIN PROYECTO (${cotizacionesSinProyecto.length})`,
          margen,
          y
        );

        y += 5;

        autoTable(doc, {
          startY: y,

          margin: {
            left: margen,
            right: margen,
          },

          theme: "striped",

          head: [[
            "Código de cotización",
            "Fecha",
            "Total cotizado",
          ]],

          body: cotizacionesSinProyecto.map((cotizacion) => [
            texto(cotizacion.idCotizacion),
            formatoFecha(cotizacion.fecha),
            formatoDinero(cotizacion.totalGeneral),
          ]),

          styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
            textColor: azul,
          },

          headStyles: {
            fillColor: celeste,
            textColor: 255,
            fontStyle: "bold",
          },

          columnStyles: {
            2: {
              halign: "right",
              fontStyle: "bold",
            },
          },
        });
      }

      // ====================================
      // PIE DE PÁGINA
      // ====================================

      const totalPaginas =
        doc.internal.getNumberOfPages();

      for (
        let pagina = 1;
        pagina <= totalPaginas;
        pagina++
      ) {
        doc.setPage(pagina);

        doc.setDrawColor(220, 228, 238);

        doc.line(
          margen,
          alto - 12,
          ancho - margen,
          alto - 12
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...gris);

        doc.text(
          "A&S | Sistema de control financiero",
          margen,
          alto - 7
        );

        doc.text(
          `Página ${pagina} de ${totalPaginas}`,
          ancho - margen,
          alto - 7,
          { align: "right" }
        );
      }

      // ====================================
      // NOMBRE DEL ARCHIVO
      // ====================================

      const nombreArchivo = (
        cliente.nombre || "cliente"
      )
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_");

      doc.save(
        `Estado_Cuenta_${nombreArchivo}.pdf`
      );

    } catch (error) {
      console.error(
        "Error al generar el PDF:",
        error
      );

      alert(
        "No se pudo generar el PDF. Intenta nuevamente."
      );
    }
  };

  // ========================================
  // INTERFAZ
  // ========================================

  return (
    <main className="estado-cuenta-page">

      {/* ENCABEZADO */}

      <header className="estado-cuenta-header">

        <div>
          <span className="estado-cuenta-eyebrow">
            CONTROL FINANCIERO
          </span>

          <h1>Estado de cuenta por cliente</h1>

          <p>
            Consulta los proyectos, pagos y saldos correspondientes
            a cada cliente.
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
            className="btn-estado-cuenta btn-descargar-pdf"
            onClick={descargarPDF}
            disabled={!cliente}
          >
            <Download size={17} />
            Descargar PDF
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

      {/* SELECTOR DE CLIENTES */}

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
              onChange={(e) =>
                setClienteSeleccionado(e.target.value)
              }
            >

              <option value="">
                Selecciona un cliente
              </option>

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

      {/* CARGANDO */}

      {cargando && (
        <div className="estado-cuenta-mensaje">

          <RefreshCw
            className="icono-cargando"
            size={24}
          />

          <p>
            Cargando información financiera...
          </p>

        </div>
      )}

      {/* ERROR */}

      {!cargando && error && (
        <div className="estado-cuenta-error">

          <AlertCircle size={22} />

          <div>
            <strong>
              No se pudo cargar la información
            </strong>

            <p>{error}</p>
          </div>

        </div>
      )}

      {/* SIN CLIENTES */}

      {!cargando && !error && clientes.length === 0 && (
        <div className="estado-cuenta-vacio">

          <UserRound size={35} />

          <h3>No hay clientes registrados</h3>

          <p>
            Cuando registres clientes, aparecerán en esta sección.
          </p>

        </div>
      )}

      {/* SIN SELECCIÓN */}

      {!cargando && !error && clientes.length > 0 && !cliente && (
        <div className="estado-cuenta-vacio">

          <FolderKanban size={35} />

          <h3>Selecciona un cliente</h3>

          <p>
            Elige un cliente para consultar su estado de cuenta
            y sus movimientos financieros.
          </p>

        </div>
      )}

      {/* DOCUMENTO DEL CLIENTE */}

      {!cargando && cliente && (

        <div className="estado-cuenta-contenido">

          <section className="estado-cuenta-documento">

            {/* ENCABEZADO DEL DOCUMENTO */}

            <div className="documento-encabezado">

              <div>
                <span>DOCUMENTO FINANCIERO</span>

                <h2>ESTADO DE CUENTA</h2>

                <p>
                  Detalle individual de operaciones del cliente
                </p>
              </div>

              <div className="documento-fecha">

                <span>Fecha de consulta</span>

                <strong>
                  {formatoFecha(new Date())}
                </strong>

              </div>

            </div>

            {/* INFORMACIÓN DEL CLIENTE */}

            <section className="ficha-cliente">

              <div className="ficha-cliente-titulo">

                <UserRound size={20} />

                <h3>
                  Información del cliente
                </h3>

              </div>

              <div className="ficha-cliente-grid">

                <div>
                  <span>Código de cliente</span>

                  <strong>
                    {cliente.idCliente || "Sin código"}
                  </strong>
                </div>

                <div>
                  <span>Nombre completo</span>

                  <strong>
                    {cliente.nombre || "Sin nombre"}
                  </strong>
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

            {/* RESUMEN FINANCIERO */}

            <section className="resumen-financiero-cliente">

              <div className="resumen-financiero-titulo">

                <Wallet size={20} />

                <h3>
                  Resumen financiero
                </h3>

              </div>

              <div className="resumen-financiero-grid">

                <article className="financiero-card">

                  <span>Total contratado</span>

                  <strong>
                    {formatoDinero(cliente.totalContratado)}
                  </strong>

                  <small>
                    Proyectos y cotizaciones aceptadas
                  </small>

                </article>

                <article className="financiero-card">

                  <span>Anticipos</span>

                  <strong>
                    {formatoDinero(cliente.anticipos)}
                  </strong>

                  <small>
                    Pagos registrados como anticipo
                  </small>

                </article>

                <article className="financiero-card">

                  <span>Abonos</span>

                  <strong>
                    {formatoDinero(cliente.abonos)}
                  </strong>

                  <small>
                    Pagos posteriores al anticipo
                  </small>

                </article>

                <article className="financiero-card recibido">

                  <span>Total recibido</span>

                  <strong>
                    {formatoDinero(cliente.totalRecibido)}
                  </strong>

                  <small>
                    Anticipos más abonos
                  </small>

                </article>

                <article className="financiero-card pendiente">

                  <span>Saldo pendiente</span>

                  <strong>
                    {formatoDinero(obtenerSaldo(cliente))}
                  </strong>

                  <small>
                    Monto pendiente de pago
                  </small>

                </article>

                <article className="financiero-card excedente">

                  <span>Excedente</span>

                  <strong>
                    {formatoDinero(obtenerExcedente(cliente))}
                  </strong>

                  <small>
                    Pagos superiores al monto contratado
                  </small>

                </article>

              </div>

            </section>

            {/* DETALLE DE PROYECTOS */}

            <section className="detalle-proyectos">

              <div className="seccion-titulo">

                <div>
                  <FolderKanban size={20} />

                  <h3>
                    Proyectos aprobados
                  </h3>
                </div>

                <span>
                  {proyectos.length} proyecto(s)
                </span>

              </div>

              {proyectos.length === 0 ? (

                <div className="tabla-vacia">
                  Este cliente no tiene proyectos aprobados registrados.
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
                      key={
                        proyecto._id ||
                        proyecto.idProyecto ||
                        index
                      }
                    >

                      <div className="proyecto-card-header">

                        <div>

                          <span>
                            PROYECTO {index + 1}
                          </span>

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

                      {/* DATOS DEL PROYECTO */}

                      <div className="proyecto-datos-grid">

                        <div>
                          <span>Fecha de ingreso</span>

                          <strong>
                            {formatoFecha(
                              proyecto.createdAt ||
                                proyecto.fechaIngreso
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Ubicación</span>

                          <strong>
                            <MapPin size={14} />

                            {proyecto.ubicacion ||
                              "Sin ubicación registrada"}
                          </strong>
                        </div>

                        <div>
                          <span>Monto contratado</span>

                          <strong>
                            {formatoDinero(
                              proyecto.montoContratado
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Anticipos</span>

                          <strong>
                            {formatoDinero(proyecto.anticipos)}
                          </strong>
                        </div>

                        <div>
                          <span>Fecha del primer anticipo</span>

                          <strong>
                            {formatoFecha(anticipo?.fecha)}
                          </strong>
                        </div>

                        <div>
                          <span>Abonos</span>

                          <strong>
                            {formatoDinero(proyecto.abonos)}
                          </strong>
                        </div>

                        <div>
                          <span>Total recibido</span>

                          <strong className="texto-recibido">
                            {formatoDinero(
                              proyecto.totalRecibido
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Saldo pendiente</span>

                          <strong className="texto-pendiente">
                            {formatoDinero(
                              obtenerSaldo(proyecto)
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Excedente</span>

                          <strong>
                            {formatoDinero(
                              obtenerExcedente(proyecto)
                            )}
                          </strong>
                        </div>

                      </div>

                      {/* HISTORIAL DE PAGOS */}

                      <div className="historial-pagos">

                        <div className="historial-pagos-titulo">

                          <Clock size={17} />

                          <h5>
                            Historial de pagos
                          </h5>

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
                                    key={
                                      pago._id ||
                                      pago.idAbono ||
                                      pagoIndex
                                    }
                                  >

                                    <td>
                                      {pago.idAbono || "—"}
                                    </td>

                                    <td>
                                      {formatoFecha(pago.fecha)}
                                    </td>

                                    <td>
                                      {pago.tipoPago || "—"}
                                    </td>

                                    <td>
                                      {pago.formaPago || "—"}
                                    </td>

                                    <td>
                                      {pago.referencia || "—"}
                                    </td>

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

            {/* COTIZACIONES INDEPENDIENTES APROBADAS */}

            {cotizacionesSinProyecto.length > 0 && (

              <section className="cotizaciones-independientes">

                <div className="seccion-titulo">

                  <div>
                    <FileText size={20} />

                    <h3>
                      Cotizaciones aprobadas sin proyecto
                    </h3>
                  </div>

                  <span>
                    {cotizacionesSinProyecto.length} cotización(es)
                  </span>

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

                      {cotizacionesSinProyecto.map(
                        (cotizacion, index) => (

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

                            <td>
                              {formatoFecha(cotizacion.fecha)}
                            </td>

                            <td className="monto-pago">
                              {formatoDinero(
                                cotizacion.totalGeneral
                              )}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </section>

            )}

            {/* PIE DEL DOCUMENTO */}

            <footer className="estado-cuenta-footer">

              <TrendingUp size={17} />

              <p>
                Documento generado desde el sistema de control
                financiero A&amp;S.
              </p>

            </footer>

          </section>

        </div>

      )}

    </main>
  );
}

export default EstadoCuentaCliente;
