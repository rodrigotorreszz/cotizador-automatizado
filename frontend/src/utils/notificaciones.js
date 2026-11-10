
import toast from "react-hot-toast";

const notificaciones = {
  // Notificación de éxito
  exito: (mensaje) =>
    toast.success(mensaje, {
      duration: 3500,
    }),

  // Alias para compatibilidad
  success: (mensaje) =>
    toast.success(mensaje, {
      duration: 3500,
    }),

  // Notificación de error
  error: (mensaje) =>
    toast.error(mensaje, {
      duration: 4500,
    }),

  // Notificación informativa
  informacion: (mensaje) =>
    toast(mensaje, {
      duration: 3500,
    }),

  // Alias para compatibilidad
  info: (mensaje) =>
    toast(mensaje, {
      duration: 3500,
    }),

  // Notificación de carga
  carga: (mensaje) =>
    toast.loading(mensaje),

  // Alias para compatibilidad
  loading: (mensaje) =>
    toast.loading(mensaje),

  // Cerrar una notificación
  cerrar: (id) =>
    toast.dismiss(id),

  // Alias para compatibilidad
  dismiss: (id) =>
    toast.dismiss(id),

  // Notificaciones basadas en promesas
  promesa: (promesa, mensajes) =>
    toast.promise(promesa, mensajes),

  promise: (promesa, mensajes) =>
    toast.promise(promesa, mensajes),
};

export default notificaciones;
