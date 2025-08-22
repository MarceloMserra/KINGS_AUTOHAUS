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
    // Se o usuário admin já existe, podemos até verificar e atualizar o isAdmin se for o caso
    if (!usuarioExistente.isAdmin) {
      usuarioExistente.isAdmin = true;
      await usuarioExistente.save();
      console.log('✅ Usuário admin existente atualizado para isAdmin: true!');
    } else {
      console.log('⚠️ Usuário admin já existe e já é administrador!');
    }
  } else {
    const novoUsuario = new Usuario({
      nome: 'Administrador',
      email: 'admin@admin.com',
      senha: await bcrypt.hash('123456', 10),
      isAdmin: true // GARANTINDO QUE O USUÁRIO CRIADO É ADMIN
    });

    await novoUsuario.save();
    console.log('✅ Usuário admin criado com sucesso!');
  }

  mongoose.disconnect();
}).catch((err) => {
  console.error('❌ Erro ao conectar ao MongoDB:', err);
});
