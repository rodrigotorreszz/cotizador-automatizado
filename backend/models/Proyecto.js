
const mongoose = require("mongoose");

const proyectoSchema = new mongoose.Schema(
  {
    idProyecto: {
      type: String,
      unique: true,
      required: [true, "El código del proyecto es obligatorio"],
      trim: true,
    },

    idCliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
      required: [true, "Debes seleccionar un cliente"],
    },

    proyecto: {
      type: String,
      required: [true, "El nombre del proyecto es obligatorio"],
      trim: true,
      minlength: [3, "El proyecto debe tener al menos 3 caracteres"],
      maxlength: [120, "El proyecto no puede superar los 120 caracteres"],
    },

    ubicacion: {
      type: String,
      required: [true, "La ubicación es obligatoria"],
      trim: true,
      minlength: [3, "La ubicación debe tener al menos 3 caracteres"],
      maxlength: [150, "La ubicación no puede superar los 150 caracteres"],
    },

    montoContratado: {
      type: Number,
      min: [0, "El monto no puede ser negativo"],
      default: 0,
    },

    estado: {
      type: String,
      enum: {
        values: ["Pendiente", "Aprobado", "Perdido"],
        message: "El estado seleccionado no es válido",
      },
      default: "Pendiente",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Proyecto", proyectoSchema);
