import { NavLink, useNavigate } from "react-router-dom";
import {
  Users,
  FolderKanban,
  History,
  Building2,
  FileText,
  ArrowLeftRight,
} from "lucide-react";

function Sidebar() {
  const navigate = useNavigate();

  const opciones = [
    {
      nombre: "Clientes",
      ruta: "/clientes",
      icono: Users,
    },
    {
      nombre: "Proyectos",
      ruta: "/proyectos",
      icono: FolderKanban,
    },
    {
      nombre: "Cotizaciones",
      ruta: "/cotizaciones",
      icono: FileText,
    },
    {
      nombre: "Historial",
      ruta: "/historial",
      icono: History,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Building2 size={32} />

        <div>
          <h2>A&S</h2>
          <span>Aluminio y Vidrio</span>
        </div>
      </div>

      <div className="sidebar-section">
        <span className="sidebar-label">
          MENÚ PRINCIPAL
        </span>

        <nav className="sidebar-nav">
          {opciones.map((opcion) => {
            const Icono = opcion.icono;

            return (
              <NavLink
                key={opcion.ruta}
                to={opcion.ruta}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                <Icono size={20} />
                <span>{opcion.nombre}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-program-switch">
        <button
          type="button"
          onClick={() => navigate("/control/resumen")}
        >
          <ArrowLeftRight size={19} />
          <span>Control Cuentas por Cobrar</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <span>Sistema Administrativo</span>
        <small>A&S Aluminio y Vidrio</small>
      </div>
    </aside>
  );
}

export default Sidebar;