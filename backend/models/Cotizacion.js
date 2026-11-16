
const mongoose = require("mongoose");

const conceptoSchema = new mongoose.Schema(
  {
    descripcion: {
      type: String,
      required: [true, "La descripción del concepto es obligatoria."],
      trim: true,
      minlength: [3, "La descripción debe tener al menos 3 caracteres."],
      maxlength: [200, "La descripción no puede superar 200 caracteres."],
    },
    cantidad: {
      type: Number,
      required: [true, "La cantidad es obligatoria."],
      min: [0.01, "La cantidad debe ser mayor que cero."],
      max: [1000000, "La cantidad supera el límite permitido."],
    },
    precioUnitario: {
      type: Number,
      required: [true, "El precio unitario es obligatorio."],
      min: [0, "El precio no puede ser negativo."],
      max: [100000000, "El precio supera el límite permitido."],
    },
    total: {
      type: Number,
      required: true,
      min: [0, "El total del concepto no puede ser negativo."],
    },
  },
  { _id: true }
);

const cotizacionSchema = new mongoose.Schema(
  {
    idCotizacion: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    esCopia: {
      type: Boolean,
      default: false,
    },

    cotizacionOrigen: {
      type: String,
      trim: true,
      default: null,
    },

    idCliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
      required: [true, "Debes seleccionar un cliente."],
    },

    idProyecto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proyecto",
      default: null,
    },

    fecha: {
      type: Date,
      default: Date.now,
      required: true,
    },

    conceptos: {
      type: [conceptoSchema],
      required: true,
      validate: {
        validator: (conceptos) =>
          Array.isArray(conceptos) && conceptos.length > 0,
        message: "La cotización debe tener al menos un concepto.",
      },
    },

    anticipo: {
      type: String,
      trim: true,
      maxlength: [500, "El anticipo no puede superar 500 caracteres."],
      default: "",
    },

    entrega: {
      type: String,
      trim: true,
      maxlength: [200, "El tiempo de entrega no puede superar 200 caracteres."],
      default: "",
    },

    validez: {
      type: String,
      trim: true,
      maxlength: [100, "La validez no puede superar 100 caracteres."],
      default: "",
    },

    subtotal: {
      type: Number,
      required: true,
      min: [0, "El subtotal no puede ser negativo."],
    },

    porcentajeIVA: {
      type: Number,
      default: 13,
      min: [0, "El IVA no puede ser negativo."],
      max: [100, "El IVA no puede superar el 100%."],
    },

    iva: {
      type: Number,
      required: true,
      min: [0, "El importe del IVA no puede ser negativo."],
    },

    totalGeneral: {
      type: Number,
      required: true,
      min: [0, "El total general no puede ser negativo."],
    },

    estado: {
      type: String,
      enum: {
        values: ["Borrador", "Enviada", "Aceptada", "Rechazada"],
        message: "El estado de la cotización no es válido.",
      },
      default: "Borrador",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Cotizacion", cotizacionSchema);
