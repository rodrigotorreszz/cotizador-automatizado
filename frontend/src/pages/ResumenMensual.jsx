
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  TrendingUp,
  Wallet,
  FileText,
  FolderKanban,
  AlertCircle,
} from "lucide-react";

import api from "../services/api";
import "../styles/resumenMensual.css";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const dinero = (valor = 0) =>
  new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(Number(valor) || 0);

const redondear = (valor) =>
  Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;

const obtenerLista = (respuesta, posiblesCampos) => {
  if (Array.isArray(respuesta.data)) return respuesta.data;

  for (const campo of posiblesCampos) {
    if (Array.isArray(respuesta.data?.[campo])) {
      return respuesta.data[campo];
    }
  }

  return [];
};

const obtenerFecha = (fecha) => {
  if (!fecha) return null;

  const resultado = new Date(fecha);

  return Number.isNaN(resultado.getTime()) ? null : resultado;
};

const esAceptada = (estado) =>
  String(estado || "").trim().toLowerCase() === "aceptada";

function ResumenMensual() {
  const [proyectos, setProyectos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [abonos, setAbonos] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // El año se obtiene automáticamente del calendario.
  const [anio] = useState(() => new Date().getFullYear());

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const [resProyectos, resCotizaciones, resAbonos] =
        await Promise.all([
          api.get("/proyectos"),
          api.get("/cotizaciones"),
          api.get("/abonos"),
        ]);

      setProyectos(
        obtenerLista(resProyectos, ["proyectos"])
      );

      setCotizaciones(
        obtenerLista(resCotizaciones, ["cotizaciones"])
      );

      setAbonos(
        obtenerLista(resAbonos, ["abonos"])
      );
    } catch (err) {
      console.error("Error al cargar resumen mensual:", err);

      setError(
        err.response?.data?.message ||
          "No fue posible cargar los movimientos financieros."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const resumen = useMemo(() => {
    const inicioAnio = new Date(anio, 0, 1);
    const finAnio = new Date(anio + 1, 0, 1);

    // Obtener la cotización aceptada más reciente de cada proyecto.
    const cotizacionesOrdenadas = [...cotizaciones].sort(
      (a, b) => {
        const fechaA = obtenerFecha(a.fecha || a.createdAt)?.getTime() || 0;
        const fechaB = obtenerFecha(b.fecha || b.createdAt)?.getTime() || 0;
        return fechaB - fechaA;
      }
    );

    const cotizacionPorProyecto = new Map();

    cotizacionesOrdenadas.forEach((cotizacion) => {
      if (!esAceptada(cotizacion.estado)) return;

      const idProyecto =
        typeof cotizacion.idProyecto === "object"
          ? cotizacion.idProyecto?._id
          : cotizacion.idProyecto;

      if (!idProyecto) return;

      const clave = String(idProyecto);

      if (!cotizacionPorProyecto.has(clave)) {
        cotizacionPorProyecto.set(clave, cotizacion);
      }
    });

    // Preparar contratos para no contar dos veces un proyecto.
    const contratos = [];

    proyectos.forEach((proyecto) => {
      if (
        String(proyecto.estado || "").toLowerCase() === "cancelado"
      ) {
        return;
      }

      const cotizacion =
        cotizacionPorProyecto.get(String(proyecto._id)) ||
        cotizacionPorProyecto.get(String(proyecto.idProyecto));

      const montoCotizacion = Number(cotizacion?.totalGeneral || 0);
      const montoProyecto = Number(proyecto.montoContratado || 0);

      const monto =
        montoCotizacion > 0 ? montoCotizacion : montoProyecto;

      const fechaContrato = obtenerFecha(
        cotizacion?.fecha ||
          cotizacion?.createdAt ||
          proyecto.createdAt
      );

      if (!fechaContrato || monto <= 0) return;

      contratos.push({
        fecha: fechaContrato,
        monto: redondear(monto),
      });
    });

    // Las cotizaciones aceptadas sin proyecto también son contratos.
    cotizaciones.forEach((cotizacion) => {
      if (!esAceptada(cotizacion.estado)) return;

      const idProyecto =
        typeof cotizacion.idProyecto === "object"
          ? cotizacion.idProyecto?._id
          : cotizacion.idProyecto;

      if (idProyecto) return;

      const fecha = obtenerFecha(
        cotizacion.fecha || cotizacion.createdAt
      );

      const monto = Number(cotizacion.totalGeneral || 0);

      if (!fecha || monto <= 0) return;

      contratos.push({
        fecha,
        monto: redondear(monto),
      });
    });

    const pagos = abonos
      .map((abono) => ({
        fecha: obtenerFecha(abono.fecha),
        monto: redondear(abono.monto),
        tipo: String(abono.tipoPago || "").toLowerCase(),
      }))
      .filter((pago) => pago.fecha && pago.monto > 0);

    // Saldo acumulado anterior al año consultado.
    const contratosAnteriores = contratos
      .filter((contrato) => contrato.fecha < inicioAnio)
      .reduce((total, contrato) => total + contrato.monto, 0);

    const pagosAnteriores = pagos
      .filter((pago) => pago.fecha < inicioAnio)
      .reduce((total, pago) => total + pago.monto, 0);

    let saldoAcumulado = redondear(
      contratosAnteriores - pagosAnteriores
    );

    const filas = MESES.map((nombre, indice) => {
      const inicioMes = new Date(anio, indice, 1);
      const finMes = new Date(anio, indice + 1, 1);

      const contratosMes = contratos.filter(
        (contrato) =>
          contrato.fecha >= inicioMes &&
          contrato.fecha < finMes
      );

      const pagosMes = pagos.filter(
        (pago) =>
          pago.fecha >= inicioMes &&
          pago.fecha < finMes
      );

      const proyectosMes = proyectos.filter((proyecto) => {
        const fechaIngreso = obtenerFecha(proyecto.createdAt);

        return (
          fechaIngreso &&
          fechaIngreso >= inicioMes &&
          fechaIngreso < finMes
        );
      });

      const saldoInicial = redondear(saldoAcumulado);

      const nuevosContratos = redondear(
        contratosMes.reduce(
          (total, contrato) => total + contrato.monto,
          0
        )
      );

      const anticipos = redondear(
        pagosMes
          .filter((pago) => pago.tipo === "anticipo")
          .reduce((total, pago) => total + pago.monto, 0)
      );

      const abonosMes = redondear(
        pagosMes
          .filter((pago) => pago.tipo === "abono")
          .reduce((total, pago) => total + pago.monto, 0)
      );

      const totalCobrado = redondear(anticipos + abonosMes);

      const saldoCierre = redondear(
        saldoInicial + nuevosContratos - totalCobrado
      );

      saldoAcumulado = saldoCierre;

      return {
        mes: nombre,
        saldoInicial,
        nuevosContratos,
        anticipos,
        abonos: abonosMes,
        totalCobrado,
        saldoCierre,
        proyectosIngresados: proyectosMes.length,
      };
    });

    const total = filas.reduce(
      (acumulado, fila) => ({
        nuevosContratos: redondear(
          acumulado.nuevosContratos + fila.nuevosContratos
        ),
        anticipos: redondear(
          acumulado.anticipos + fila.anticipos
        ),
        abonos: redondear(
          acumulado.abonos + fila.abonos
        ),
        totalCobrado: redondear(
          acumulado.totalCobrado + fila.totalCobrado
        ),
        proyectosIngresados:
          acumulado.proyectosIngresados +
          fila.proyectosIngresados,
      }),
      {
        nuevosContratos: 0,
        anticipos: 0,
        abonos: 0,
        totalCobrado: 0,
        proyectosIngresados: 0,
      }
    );

    return {
      filas,
      total,
      saldoInicialAnio: redondear(
        contratosAnteriores - pagosAnteriores
      ),
      saldoCierreAnio: saldoAcumulado,
    };
  }, [anio, proyectos, cotizaciones, abonos]);

  const fechaActual = new Date();

  const totalContratos = resumen.total.nuevosContratos;
  const totalCobrado = resumen.total.totalCobrado;

  return (
    <main className="resumen-mensual-page">
      <header className="resumen-mensual-header">
        <div>
          <span className="resumen-mensual-eyebrow">
            CONTROL FINANCIERO
          </span>

          <h1>Resumen mensual</h1>

          <p>
            Control de contratos, anticipos, abonos y saldos
            mensuales.
          </p>
        </div>

        <button
          className="resumen-mensual-refresh"
          onClick={cargarDatos}
          disabled={cargando}
          type="button"
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </header>

      <section className="resumen-anio-card">
        <div className="resumen-anio-icon">
          <CalendarDays size={23} />
        </div>

        <div>
          <span>AÑO A CONSULTAR</span>
          <h2>{anio}</h2>
          <p>
            Año determinado automáticamente según la fecha actual.
          </p>
        </div>

        <div className="resumen-fecha-actual">
          <span>Última consulta</span>
          <strong>
            {fechaActual.toLocaleDateString("es-SV")}
          </strong>
        </div>
      </section>

      {error && (
        <div className="resumen-mensual-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <section className="resumen-mensual-indicadores">
        <article className="indicador-mensual">
          <div className="indicador-mensual-icono azul">
            <FileText size={21} />
          </div>
          <div>
            <span>Nuevos contratos del año</span>
            <strong>{dinero(totalContratos)}</strong>
          </div>
        </article>

        <article className="indicador-mensual">
          <div className="indicador-mensual-icono verde">
            <Wallet size={21} />
          </div>
          <div>
            <span>Total cobrado del año</span>
            <strong>{dinero(totalCobrado)}</strong>
          </div>
        </article>

        <article className="indicador-mensual">
          <div className="indicador-mensual-icono cyan">
            <FolderKanban size={21} />
          </div>
          <div>
            <span>Proyectos ingresados</span>
            <strong>{resumen.total.proyectosIngresados}</strong>
          </div>
        </article>

        <article className="indicador-mensual">
          <div className="indicador-mensual-icono naranja">
            <TrendingUp size={21} />
          </div>
          <div>
            <span>Saldo al cierre del año</span>
            <strong>{dinero(resumen.saldoCierreAnio)}</strong>
          </div>
        </article>
      </section>

      <section className="resumen-mensual-tabla-card">
        <div className="resumen-tabla-header">
          <div>
            <h2>Movimientos por mes</h2>
            <p>
              Resumen financiero correspondiente al año {anio}.
            </p>
          </div>

          <span className="resumen-anio-etiqueta">{anio}</span>
        </div>

        {cargando ? (
          <div className="resumen-mensual-cargando">
            <RefreshCw size={23} />
            <span>Cargando movimientos financieros...</span>
          </div>
        ) : (
          <div className="resumen-mensual-tabla-scroll">
            <table className="resumen-mensual-tabla">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Saldo inicial</th>
                  <th>Nuevos contratos</th>
                  <th>Anticipos</th>
                  <th>Abonos</th>
                  <th>Total cobrado</th>
                  <th>Saldo al cierre</th>
                  <th>Proyectos ingresados</th>
                </tr>
              </thead>

              <tbody>
                {resumen.filas.map((fila, index) => (
                  <tr key={fila.mes}>
                    <td className="mes-nombre">{fila.mes}</td>
                    <td>{dinero(fila.saldoInicial)}</td>
                    <td>{dinero(fila.nuevosContratos)}</td>
                    <td>{dinero(fila.anticipos)}</td>
                    <td>{dinero(fila.abonos)}</td>
                    <td className="cobrado-celda">
                      {dinero(fila.totalCobrado)}
                    </td>
                    <td className="saldo-celda">
                      {dinero(fila.saldoCierre)}
                    </td>
                    <td className="proyectos-celda">
                      {fila.proyectosIngresados}
                    </td>
                  </tr>
                ))}

                <tr className="fila-total">
                  <td>TOTALES</td>
                  <td>{dinero(resumen.saldoInicialAnio)}</td>
                  <td>{dinero(resumen.total.nuevosContratos)}</td>
                  <td>{dinero(resumen.total.anticipos)}</td>
                  <td>{dinero(resumen.total.abonos)}</td>
                  <td>{dinero(resumen.total.totalCobrado)}</td>
                  <td>{dinero(resumen.saldoCierreAnio)}</td>
                  <td>{resumen.total.proyectosIngresados}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="resumen-mensual-nota">
          <AlertCircle size={16} />
          <p>
            El saldo al cierre de cada mes se utiliza como saldo inicial
            del mes siguiente. Los meses sin movimientos conservan el
            saldo acumulado.
          </p>
        </div>
      </section>
    </main>
  );
}

export default ResumenMensual;
