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
  isAdmin: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String, // Novo campo para o token de redefinição de senha
  resetPasswordExpires: Date // Novo campo para a data de expiração do token
});

module.exports = mongoose.model("usuarios", UsuarioSchema);
