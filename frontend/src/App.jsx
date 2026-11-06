
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import { useEffect, useState } from "react";
import {
  Users,
  FolderKanban,
  FileText,
} from "lucide-react";

import { Toaster } from "react-hot-toast";

import Sidebar from "./components/Sidebar";
import SidebarControl from "./components/SidebarControl";

import Clientes from "./pages/Clientes";
import Proyectos from "./pages/Proyectos";
import Cotizaciones from "./pages/Cotizaciones";
import Historial from "./pages/Historial";
import ResumenControl from "./pages/ResumenControl";

import api from "./services/api";
import notificaciones from "./utils/notificaciones";

import "./styles/global.css";

// ======================================
// DASHBOARD A&S
// ======================================

function Dashboard() {
  const [clientes, setClientes] = useState(0);
  const [proyectos, setProyectos] = useState(0);
  const [cotizaciones, setCotizaciones] = useState(0);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [
          resClientes,
          resProyectos,
          resCotizaciones,
        ] = await Promise.all([
          api.get("/clientes"),
          api.get("/proyectos"),
          api.get("/cotizaciones"),
        ]);

        setClientes(resClientes.data.total);
        setProyectos(resProyectos.data.total);
        setCotizaciones(resCotizaciones.data.total);
      } catch (error) {
        console.error("Error al cargar el dashboard:", error);

        notificaciones.error(
          "No fue posible cargar los datos del dashboard."
        );
      }
    };

    cargarDatos();
  }, []);

  return (
    <>
      <header className="topbar">
        <div>
          <h2>Dashboard</h2>
          <p>Bienvenido al sistema administrativo de A&S</p>
        </div>

        <div className="user-info">
          <div className="user-avatar">A</div>
          <span>Administrador</span>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="welcome-section">
          <h1>¡Bienvenido a A&S!</h1>

          <p>
            Administra tus clientes, proyectos y cotizaciones
            desde un solo lugar.
          </p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <Users size={25} />
            </div>

            <div>
              <span>Clientes registrados</span>
              <h2>{clientes}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon cyan">
              <FolderKanban size={25} />
            </div>

            <div>
              <span>Proyectos registrados</span>
              <h2>{proyectos}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">
              <FileText size={25} />
            </div>

            <div>
              <span>Cotizaciones registradas</span>
              <h2>{cotizaciones}</h2>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ======================================
// PÁGINAS PROVISIONALES DE CONTROL
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
// ESTRUCTURA PRINCIPAL
// ======================================

function ContenidoApp() {
  const location = useLocation();

  const esControl = location.pathname.startsWith("/control");

  return (
    <div className="app-container">

      {/* SIDEBAR SEGÚN EL PROGRAMA */}
      {esControl ? <SidebarControl /> : <Sidebar />}

      <main className="main-content">
        <Routes>

          {/* ==================================
              PROGRAMA A&S
          ================================== */}

          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/clientes"
            element={<Clientes />}
          />

          <Route
            path="/proyectos"
            element={<Proyectos />}
          />

          <Route
            path="/cotizaciones"
            element={<Cotizaciones />}
          />

          <Route
            path="/cotizador"
            element={
              <PaginaControl
                titulo="Cotizador"
                descripcion="Este módulo estará disponible próximamente."
              />
            }
          />

          <Route
            path="/historial"
            element={<Historial />}
          />

          {/* ==================================
              PROGRAMA CONTROL
          ================================== */}

          <Route
            path="/control"
            element={
              <Navigate
                to="/control/resumen"
                replace
              />
            }
          />

          {/* RESUMEN GENERAL */}
          <Route
            path="/control/resumen"
            element={<ResumenControl />}
          />

          {/* CLIENTES COMPARTIDOS */}
          <Route
            path="/control/clientes"
            element={<Clientes />}
          />

          {/* PROYECTOS COMPARTIDOS */}
          <Route
            path="/control/proyectos"
            element={<Proyectos />}
          />

          {/* ABONOS */}
          <Route
            path="/control/abonos"
            element={
              <PaginaControl
                titulo="Abonos"
                descripcion="Aquí podrás registrar y consultar los abonos realizados por los clientes."
              />
            }
          />

          {/* ESTADO DEL CLIENTE */}
          <Route
            path="/control/estado-cliente"
            element={
              <PaginaControl
                titulo="Estado del cliente"
                descripcion="Consulta los saldos y movimientos de cada cliente."
              />
            }
          />

          {/* ESTADO DE CUENTA */}
          <Route
            path="/control/estado-cuenta"
            element={
              <PaginaControl
                titulo="Estado de cuenta"
                descripcion="Consulta el detalle de las cuentas por cobrar."
              />
            }
          />

          {/* RESUMEN MENSUAL */}
          <Route
            path="/control/resumen-mensual"
            element={
              <PaginaControl
                titulo="Resumen mensual"
                descripcion="Visualiza los movimientos y cobros de cada mes."
              />
            }
          />

          {/* RESUMEN ANUAL */}
          <Route
            path="/control/resumen-anual"
            element={
              <PaginaControl
                titulo="Resumen anual"
                descripcion="Visualiza el comportamiento anual de las cuentas por cobrar."
              />
            }
          />

          {/* RUTA NO ENCONTRADA */}
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
      </main>

      {/* NOTIFICACIONES GLOBALES */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        containerStyle={{
          top: 25,
          right: 25,
        }}
        toastOptions={{
          duration: 3500,
          className: "as-toast",

          success: {
            duration: 3500,
            iconTheme: {
              primary: "#22C55E",
              secondary: "#FFFFFF",
            },
          },

          error: {
            duration: 4500,
            iconTheme: {
              primary: "#EF4444",
              secondary: "#FFFFFF",
            },
          },

          loading: {
            iconTheme: {
              primary: "#38BDF8",
              secondary: "#FFFFFF",
            },
          },
        }}
      />
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
