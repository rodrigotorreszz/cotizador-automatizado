
import { NavLink, useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Wallet,
  UserRound,
  Receipt,
  CalendarDays,
  CalendarRange,
  ArrowLeftRight,
} from "lucide-react";

function SidebarControl() {
  const navigate = useNavigate();

  const opciones = [
    {
      nombre: "Resumen",
      ruta: "/control/resumen",
      icono: LayoutDashboard,
    },
    {
      nombre: "Clientes",
      ruta: "/control/clientes",
      icono: Users,
    },
    {
      nombre: "Proyectos",
      ruta: "/control/proyectos",
      icono: FolderKanban,
    },
    {
      nombre: "Abonos",
      ruta: "/control/abonos",
      icono: Wallet,
    },
    {
      nombre: "Estado cliente",
      ruta: "/control/estado-cliente",
      icono: UserRound,
    },
    {
      nombre: "Estado de cuenta",
      ruta: "/control/estado-cuenta",
      icono: Receipt,
    },
    {
      nombre: "Resumen mensual",
      ruta: "/control/resumen-mensual",
      icono: CalendarDays,
    },
    {
      nombre: "Resumen anual",
      ruta: "/control/resumen-anual",
      icono: CalendarRange,
    },
  ];

  return (
    <aside className="sidebar sidebar-control">
      <div className="sidebar-brand">
        <img
          src="/Imagen%201.png"
          alt="Logo A&S"
          className="sidebar-logo"
        />

        <div>
          <h2>CONTROL</h2>
          <span>Cuentas por Cobrar</span>
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
          onClick={() => navigate("/")}
        >
          <ArrowLeftRight size={19} />
          <span>Cambiar a A&S</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <span>Sistema de Control</span>
        <small>A&S Aluminio y Vidrio</small>
      </div>
    </aside>
  );
}

export default SidebarControl;
