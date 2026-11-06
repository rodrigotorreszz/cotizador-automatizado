
import toast from "react-hot-toast";

const notificaciones = {
  exito: (mensaje) =>
    toast.success(mensaje, { duration: 3500 }),

  error: (mensaje) =>
    toast.error(mensaje, { duration: 4500 }),

  informacion: (mensaje) =>
    toast(mensaje, { duration: 3500 }),

  carga: (mensaje) =>
    toast.loading(mensaje),

  cerrar: (id) =>
    toast.dismiss(id),

  promesa: (promesa, mensajes) =>
    toast.promise(promesa, mensajes),
};

export default notificaciones;
