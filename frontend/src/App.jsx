import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import { AnimatePresence, motion } from "framer-motion";

// ======================================
// COMPONENTES
// ======================================

import Sidebar from "./components/Sidebar";
import SidebarControl from "./components/SidebarControl";

// ======================================
// PÁGINAS
// ======================================

import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Proyectos from "./pages/Proyectos";
import Cotizaciones from "./pages/Cotizaciones";
import Historial from "./pages/Historial";
import ResumenControl from "./pages/ResumenControl";
import Abonos from "./pages/Abonos";
import EstadoCliente from "./pages/EstadoCliente";
import EstadoCuentaCliente from "./pages/EstadoCuentaCliente";
import ResumenMensual from "./pages/ResumenMensual";
import ResumenAnual from "./pages/ResumenAnual";

// ======================================
// ESTILOS
// ======================================

import "./styles/global.css";

// ======================================
// PÁGINAS PROVISIONALES
// ======================================

function PaginaControl({ titulo, descripcion }) {
  return (
    <section className="dashboard-content">
      <div className="welcome-section">
        <h1>{titulo}</h1>
        <p>{descripcion}</p>
      </div>
    </section>
  );
}

// ======================================
// TRANSICIÓN DE PÁGINAS
// ======================================

function RutasAnimadas() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />

          <Route path="/clientes" element={<Clientes />} />
          <Route path="/proyectos" element={<Proyectos />} />
          <Route path="/cotizaciones" element={<Cotizaciones />} />

          <Route
            path="/cotizador"
            element={
              <PaginaControl
                titulo="Cotizador"
                descripcion="Este módulo estará disponible próximamente."
              />
            }
          />

          <Route path="/historial" element={<Historial />} />

          <Route
            path="/control"
            element={<Navigate to="/control/resumen" replace />}
          />

          <Route path="/control/resumen" element={<ResumenControl />} />
          <Route path="/control/clientes" element={<Clientes />} />
          <Route path="/control/proyectos" element={<Proyectos />} />
          <Route path="/control/abonos" element={<Abonos />} />

          <Route
            path="/control/estado-cliente"
            element={<EstadoCliente />}
          />

          <Route
            path="/control/estado-cuenta"
            element={<EstadoCuentaCliente />}
          />

          <Route
            path="/control/resumen-mensual"
            element={<ResumenMensual />}
          />

          <Route
            path="/control/resumen-anual"
            element={<ResumenAnual />}
          />

          <Route
            path="*"
            element={
              <PaginaControl
                titulo="Página no encontrada"
                descripcion="La sección que buscas no existe."
              />
            }
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

// ======================================
// ESTRUCTURA PRINCIPAL
// ======================================

function ContenidoApp() {
  const location = useLocation();

  const esControl = location.pathname.startsWith("/control");

  return (
    <div className="app-container">

      {esControl ? <SidebarControl /> : <Sidebar />}

      <main className="main-content">
        <RutasAnimadas />
      </main>

    </div>
  );
}

// ======================================
// APP
// ======================================

function App() {
  return (
    <BrowserRouter>
      <ContenidoApp />
    </BrowserRouter>
  );
}

export default App;