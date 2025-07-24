const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UsuarioSchema = new Schema({
  nome: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  senha: {
    type: String,
    required: true
  },
  data: {
    type: Date,
    default: Date.now
  }
});

// Agora exporta o model corretamente!
module.exports = mongoose.model("usuarios", UsuarioSchema);
