
const mongoose = require("mongoose");

const clienteSchema = new mongoose.Schema(
  {
    idCliente: {
      type: String,
      unique: true,
      required: true
    },

    nombre: {
      type: String,
      required: [true, "El nombre o empresa es obligatorio"],
      trim: true
    },

    direccion: {
      type: String,
      required: [true, "El departamento es obligatorio"],
      enum: [
        "Ahuachapán",
        "Santa Ana",
        "Sonsonate",
        "Chalatenango",
        "La Libertad",
        "San Salvador",
        "Cuscatlán",
        "La Paz",
        "Cabañas",
        "San Vicente",
        "Usulután",
        "San Miguel",
        "Morazán",
        "La Unión"
      ]
    },

    subdireccion: {
      type: String,
      trim: true,
      default: ""
    },

    registroFiscal: {
      type: String,
      trim: true,
      default: ""
    },

    nit: {
      type: String,
      trim: true,
      default: ""
    },

    telefono: {
      type: String,
      required: [true, "El teléfono es obligatorio"],
      trim: true
    },

    correo: {
      type: String,
      required: [true, "El correo es obligatorio"],
      trim: true,
      lowercase: true
    },

    atencionA: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model("Cliente", clienteSchema);
