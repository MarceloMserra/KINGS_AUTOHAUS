const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
require('./models/UserModel');

const Usuario = mongoose.model('usuarios');

// Conectar usando a URI do .env
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  const usuario = await Usuario.findOne({ email: 'admin@admin.com' });
  if (!usuario) {
    console.log('❌ Usuário não encontrado!');
  } else {
    const senhaCorreta = await bcrypt.compare('123456', usuario.senha);
    console.log('🔐 Senha correta?', senhaCorreta);
  }
  mongoose.disconnect();
})
.catch((err) => {
  console.error('❌ Erro ao conectar ao MongoDB:', err);
});
