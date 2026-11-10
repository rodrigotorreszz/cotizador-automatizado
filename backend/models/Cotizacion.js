const mongoose = require("mongoose");

const conceptoSchema = new mongoose.Schema(
  {
    descripcion: {
      type: String,
      required: true,
      trim: true,
    },
    cantidad: {
      type: Number,
      required: true,
      min: 0.01,
    },
    precioUnitario: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
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
    },
    idCliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
      required: true,
    },
    idProyecto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proyecto",
      default: null,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    conceptos: {
      type: [conceptoSchema],
      validate: {
        validator: (conceptos) => conceptos.length > 0,
        message: "La cotización debe tener al menos un concepto.",
      },
    },

    // Condiciones particulares de cada cotización
    anticipo: {
      type: String,
      trim: true,
      default: "",
    },
    entrega: {
      type: String,
      trim: true,
      default: "",
    },
    validez: {
      type: String,
      trim: true,
      default: "",
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    porcentajeIVA: {
      type: Number,
      default: 13,
      min: 0,
    },
    iva: {
      type: Number,
      required: true,
      min: 0,
    },
    totalGeneral: {
      type: Number,
      required: true,
      min: 0,
    },
    estado: {
      type: String,
      enum: ["Borrador", "Enviada", "Aceptada", "Rechazada"],
      default: "Borrador",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Cotizacion", cotizacionSchema);