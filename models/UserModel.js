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
  },
  isAdmin: { // Adicionando o campo isAdmin
    type: Boolean,
    default: false // Por padrão, um usuário não é admin
  }
});

// Agora exporta o model corretamente!
module.exports = mongoose.model("usuarios", UsuarioSchema);
