import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  Users,
  FolderKanban,
  FileText,
  Wallet,
  CalendarDays,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  Info,
} from "lucide-react";

import api from "../services/api";
import notificaciones from "../utils/notificaciones";

import "../styles/dashboard.css";

// ======================================
// CONFIGURACIÓN
// ======================================

// Cada indicador usa el mismo endpoint y la misma lectura (data.total)
// que el Dashboard anterior. No se calcula ni se inventa ningún valor.
const INDICADORES = [
  {
    clave: "clientes",
    nombre: "Clientes",
    etiqueta: "Clientes registrados",
    endpoint: "/clientes",
    ruta: "/clientes",
    icono: Users,
    tono: "blue",
  },
  {
    clave: "proyectos",
    nombre: "Proyectos",
    etiqueta: "Proyectos registrados",
    endpoint: "/proyectos",
    ruta: "/proyectos",
    icono: FolderKanban,
    tono: "navy",
  },
  {
    clave: "cotizaciones",
    nombre: "Cotizaciones",
    etiqueta: "Cotizaciones registradas",
    endpoint: "/cotizaciones",
    ruta: "/cotizaciones",
    icono: FileText,
    tono: "sky",
  },
];

// Rutas que ya existen en App.jsx
const ACCESOS = [
  {
    titulo: "Clientes",
    descripcion: "Administra la información de tus clientes.",
    ruta: "/clientes",
    icono: Users,
  },
  {
    titulo: "Proyectos",
    descripcion: "Da seguimiento a los proyectos de cada cliente.",
    ruta: "/proyectos",
    icono: FolderKanban,
  },
  {
    titulo: "Cotizaciones",
    descripcion: "Elabora y consulta tus cotizaciones.",
    ruta: "/cotizaciones",
    icono: FileText,
  },
  {
    titulo: "Abonos",
    descripcion: "Registra y revisa los pagos de tus clientes.",
    ruta: "/control/abonos",
    icono: Wallet,
  },
];

// ======================================
// UTILIDADES
// ======================================

function obtenerSaludo(fecha) {
  const hora = fecha.getHours();

  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";

  return "Buenas noches";
}

function formatearFecha(fecha) {
  const texto = new Intl.DateTimeFormat("es-SV", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Cuenta de 0 al valor real. Si la persona prefiere menos movimiento,
// muestra el valor directamente.
function useContador(objetivo) {
  const [valor, setValor] = useState(0);

  const sinAnimacion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (typeof objetivo !== "number" || sinAnimacion) return undefined;

    const duracion = 700;
    const inicio = performance.now();
    let cuadro;

    const paso = (ahora) => {
      const progreso = Math.min((ahora - inicio) / duracion, 1);
      const suavizado = 1 - Math.pow(1 - progreso, 3);

      setValor(Math.round(objetivo * suavizado));

      if (progreso < 1) {
        cuadro = requestAnimationFrame(paso);
      }
    };

    cuadro = requestAnimationFrame(paso);

    return () => cancelAnimationFrame(cuadro);
  }, [objetivo, sinAnimacion]);

  if (typeof objetivo !== "number") return null;

  return sinAnimacion ? objetivo : valor;
}

// ======================================
// TARJETA DE INDICADOR
// ======================================

function TarjetaIndicador({ item, valor, cargando, fallo, indice }) {
  const Icono = item.icono;
  const animado = useContador(valor);

  const mostrarValor = !cargando && !fallo && animado !== null;

  return (
    <Link
      to={item.ruta}
      className={`dash-kpi dash-kpi--${item.tono} dash-anim`}
      style={{ "--i": indice }}
    >
      <span className="dash-kpi-icon" aria-hidden="true">
        <Icono size={24} />
      </span>

      <span className="dash-kpi-label">{item.etiqueta}</span>

      <span className="dash-kpi-value" aria-busy={cargando}>
        {cargando && (
          <>
            <span className="dash-skeleton" aria-hidden="true" />
            <span className="dash-sr">Cargando…</span>
          </>
        )}

        {!cargando && fallo && (
          <>
            <span aria-hidden="true">—</span>
            <span className="dash-sr">No disponible</span>
          </>
        )}

        {mostrarValor && animado.toLocaleString("es-SV")}
      </span>

      <span className="dash-kpi-link">
        Ver {item.nombre.toLowerCase()}
        <ArrowRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}

// ======================================
// DASHBOARD
// ======================================

function Dashboard() {
  const [ahora] = useState(() => new Date());

  const [valores, setValores] = useState({
    clientes: null,
    proyectos: null,
    cotizaciones: null,
  });
  const [cargando, setCargando] = useState(true);
  const [fallos, setFallos] = useState([]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);

    // allSettled: si falla un endpoint, los demás indicadores se siguen mostrando.
    const resultados = await Promise.allSettled(
      INDICADORES.map((item) => api.get(item.endpoint))
    );

    const nuevos = {};
    const errores = [];

    resultados.forEach((resultado, posicion) => {
      const { clave } = INDICADORES[posicion];

      if (resultado.status === "fulfilled") {
        nuevos[clave] = resultado.value.data.total || 0;
      } else {
        nuevos[clave] = null;
        errores.push(clave);

        console.error(
          `Error al cargar ${clave} en el panel de control:`,
          resultado.reason
        );
      }
    });

    setValores(nuevos);
    setFallos(errores);
    setCargando(false);

    if (errores.length > 0) {
      notificaciones.error(
        "No fue posible cargar los datos del dashboard."
      );
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const nombresFallidos = INDICADORES.filter((item) =>
    fallos.includes(item.clave)
  )
    .map((item) => item.nombre.toLowerCase())
    .join(", ");

  return (
    <div className="dash">
      {/* ===== ENCABEZADO ===== */}
      <header className="dash-header dash-anim">
        <div>
          <p className="dash-date">
            <CalendarDays size={16} aria-hidden="true" />
            {formatearFecha(ahora)}
          </p>

          <h1 className="dash-title">Panel de control</h1>

          <p className="dash-subtitle">
            Visión general de la actividad administrativa de A&S
            Aluminio y Vidrio.
          </p>
        </div>

        <div className="dash-user">
          <span className="dash-avatar" aria-hidden="true">
            A
          </span>
          <span>Administrador</span>
        </div>
      </header>

      {/* ===== BIENVENIDA ===== */}
      <section
        className="dash-banner dash-anim"
        style={{ "--i": 1 }}
        aria-labelledby="dash-bienvenida"
      >
        <div className="dash-banner-text">
          <h2 id="dash-bienvenida">
            {obtenerSaludo(ahora)}, bienvenido a A&S
          </h2>

          <p>
            Administra tus clientes, proyectos y cotizaciones desde un
            solo lugar.
          </p>

          <div className="dash-banner-actions">
            <Link to="/cotizaciones" className="dash-btn dash-btn--light">
              Ir a cotizaciones
              <ArrowRight size={18} aria-hidden="true" />
            </Link>

            <Link to="/control/abonos" className="dash-btn dash-btn--ghost">
              Control de abonos
            </Link>
          </div>
        </div>

        <svg
          className="dash-banner-art"
          viewBox="0 0 220 220"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="30" y="30" width="160" height="160" rx="14"></rect>
          <path d="M110 30v160"></path>
          <path d="M30 110h160"></path>
          <path d="M52 78l26-26"></path>
          <path d="M52 100l48-48"></path>
          <path d="M132 168l22-22"></path>
          <path d="M132 188l42-42"></path>
        </svg>
      </section>

      {/* ===== AVISO DE ERROR ===== */}
      {!cargando && fallos.length > 0 && (
        <div className="dash-alert" role="alert">
          <Info size={18} aria-hidden="true" />

          <span>No se pudo cargar: {nombresFallidos}.</span>

          <button type="button" className="dash-retry" onClick={cargarDatos}>
            <RefreshCw size={16} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}

      {/* ===== INDICADORES ===== */}
      <section aria-labelledby="dash-kpi-titulo">
        <h2 id="dash-kpi-titulo" className="dash-section-title">
          Indicadores generales
        </h2>

        <div className="dash-kpis">
          {INDICADORES.map((item, posicion) => (
            <TarjetaIndicador
              key={item.clave}
              item={item}
              valor={valores[item.clave]}
              cargando={cargando}
              fallo={fallos.includes(item.clave)}
              indice={posicion + 2}
            />
          ))}
        </div>
      </section>

      {/* ===== ACCESOS RÁPIDOS ===== */}
      <section aria-labelledby="dash-accesos-titulo">
        <h2 id="dash-accesos-titulo" className="dash-section-title">
          Accesos rápidos
        </h2>

        <div className="dash-accesos">
          {ACCESOS.map((acceso, posicion) => {
            const Icono = acceso.icono;

            return (
              <Link
                key={acceso.ruta}
                to={acceso.ruta}
                className="dash-acceso dash-anim"
                style={{ "--i": posicion + 5 }}
              >
                <span className="dash-acceso-icon" aria-hidden="true">
                  <Icono size={22} />
                </span>

                <span className="dash-acceso-text">
                  <strong>{acceso.titulo}</strong>
                  <span>{acceso.descripcion}</span>
                </span>

                <ArrowUpRight
                  className="dash-acceso-arrow"
                  size={18}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;