
const mongoose = require("mongoose");

const proyectoSchema = new mongoose.Schema(
  {
    idProyecto: {
      type: String,
      unique: true,
      required: true
    },

    idCliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
      required: [true, "Debes seleccionar un cliente"]
    },

    proyecto: {
      type: String,
      required: [true, "El nombre del proyecto es obligatorio"],
      trim: true
    },

    ubicacion: {
      type: String,
      required: [true, "La ubicación es obligatoria"],
      trim: true
    },

    montoContratado: {
      type: Number,
      min: [0, "El monto no puede ser negativo"],
      default: 0
    },

    estado: {
      type: String,
      enum: [
        "Pendiente",
        "En proceso",
        "Finalizado",
        "Cancelado"
      ],
      default: "Pendiente"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model("Proyecto", proyectoSchema);
