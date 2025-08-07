const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
require('./models/UserModel');
const Usuario = mongoose.model('usuarios');

// Conexão segura usando o .env
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const usuarioExistente = await Usuario.findOne({ email: 'admin@admin.com' });

  if (usuarioExistente) {
    console.log('⚠️ Usuário admin já existe!');
  } else {
    const novoUsuario = new Usuario({
      nome: 'Administrador',
      email: 'admin@admin.com',
      senha: await bcrypt.hash('123456', 10),
      isAdmin: true
    });

    await novoUsuario.save();
    console.log('✅ Usuário admin criado com sucesso!');
  }

  mongoose.disconnect();
}).catch((err) => {
  console.error('❌ Erro ao conectar ao MongoDB:', err);
});
