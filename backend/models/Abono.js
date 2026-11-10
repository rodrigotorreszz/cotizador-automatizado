
const mongoose = require("mongoose");

const abonoSchema = new mongoose.Schema(
  {
    idAbono: {
      type: String,
      unique: true,
      required: true,
    },

    idProyecto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proyecto",
      required: [true, "Debes seleccionar un proyecto"],
    },

    idCliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
      required: true,
    },

    fecha: {
      type: Date,
      required: true,
      default: Date.now,
    },

    monto: {
      type: Number,
      required: [true, "El monto del abono es obligatorio"],
      min: [0.01, "El monto debe ser mayor que cero"],
    },

    // Clasificación del pago
    tipoPago: {
      type: String,
      enum: ["Anticipo", "Abono"],
      default: "Abono",
      required: true,
    },

    formaPago: {
      type: String,
      required: [true, "La forma de pago es obligatoria"],
      trim: true,
    },

    referencia: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Abono", abonoSchema);
