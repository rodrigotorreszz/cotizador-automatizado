
import Swal from "sweetalert2";
import "./notificaciones.css";

const configuracion = {
  confirmButtonColor: "#0C133F",
  cancelButtonColor: "#E5E7EB",
  buttonsStyling: false,
  customClass: {
    popup: "as-alerta-popup",
    title: "as-alerta-titulo",
    htmlContainer: "as-alerta-texto",
    confirmButton: "as-alerta-confirmar",
    cancelButton: "as-alerta-cancelar",
    denyButton: "as-alerta-denegar",
    icon: "as-alerta-icono",
  },
};

const notificaciones = {
  exito: (mensaje, titulo = "¡Operación exitosa!") =>
    Swal.fire({
      ...configuracion,
      icon: "success",
      title: titulo,
      text: mensaje,
      confirmButtonText: "Aceptar",
    }),

  success: (mensaje, titulo) =>
    notificaciones.exito(mensaje, titulo),

  error: (mensaje, titulo = "Ha ocurrido un error") =>
    Swal.fire({
      ...configuracion,
      icon: "error",
      title: titulo,
      text: mensaje,
      confirmButtonText: "Entendido",
    }),

  informacion: (mensaje, titulo = "Información") =>
    Swal.fire({
      ...configuracion,
      icon: "info",
      title: titulo,
      text: mensaje,
      confirmButtonText: "Aceptar",
    }),

  info: (mensaje, titulo) =>
    notificaciones.informacion(mensaje, titulo),

  advertencia: (mensaje, titulo = "Atención") =>
    Swal.fire({
      ...configuracion,
      icon: "warning",
      title: titulo,
      text: mensaje,
      confirmButtonText: "Entendido",
    }),

  confirmar: async (
    mensaje,
    titulo = "¿Estás seguro?",
    textoConfirmar = "Sí, continuar"
  ) => {
    const resultado = await Swal.fire({
      ...configuracion,
      icon: "warning",
      title: titulo,
      text: mensaje,
      showCancelButton: true,
      confirmButtonText: textoConfirmar,
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusCancel: true,
    });

    return resultado.isConfirmed;
  },

  carga: (mensaje = "Procesando, por favor espera...") =>
    Swal.fire({
      ...configuracion,
      title: "Un momento",
      text: mensaje,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    }),

  loading: (mensaje) => notificaciones.carga(mensaje),

  cerrar: () => Swal.close(),

  dismiss: () => Swal.close(),

  promesa: async (operacion, mensajes = {}) => {
    notificaciones.carga(
      mensajes.loading || "Procesando, por favor espera..."
    );

    try {
      const resultado = await operacion;

      Swal.close();

      await notificaciones.exito(
        mensajes.success || "La operación se completó correctamente."
      );

      return resultado;
    } catch (error) {
      Swal.close();

      await notificaciones.error(
        mensajes.error || "No fue posible completar la operación."
      );

      throw error;
    }
  },
};

notificaciones.promise = notificaciones.promesa;

export default notificaciones;
