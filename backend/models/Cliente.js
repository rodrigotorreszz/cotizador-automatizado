const mongoose = require("mongoose");

const clienteSchema = new mongoose.Schema(
  {
    idCliente: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    nombre: {
      type: String,
      trim: true,
      default: "",
    },

    // Dirección completa del cliente
    direccion: {
      type: String,
      trim: true,
      default: "",
    },

    // Referencia adicional de ubicación
    subdireccion: {
      type: String,
      trim: true,
      default: "",
    },

    registroFiscal: {
      type: String,
      trim: true,
      default: "",
    },

    nit: {
      type: String,
      trim: true,
      default: "",
    },

    telefono: {
      type: String,
      trim: true,
      default: "",
    },

    correo: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    atencionA: {
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

module.exports = mongoose.model("Cliente", clienteSchema);