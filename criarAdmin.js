const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('./models/UserModel');
const Usuario = mongoose.model('usuarios');

mongoose.connect('mongodb://msmadureira:pfGoP65qVZOa29h8@ac-i8wrumx-shard-00-00.wsk8ldo.mongodb.net:27017,ac-i8wrumx-shard-00-01.wsk8ldo.mongodb.net:27017,ac-i8wrumx-shard-00-02.wsk8ldo.mongodb.net:27017/autorizz?ssl=true&replicaSet=atlas-ousvn5-shard-0&authSource=admin&retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  await Usuario.deleteOne({ email: 'admin@admin.com' }); // exclui qualquer admin anterior

  const novoUsuario = new Usuario({
    nome: 'Admin',
    email: 'admin@admin.com',
    senha: await bcrypt.hash('123456', 10)
  });

  await novoUsuario.save();
  console.log('✅ Novo admin criado com sucesso!');
  mongoose.disconnect();
}).catch(err => console.error('❌ Erro ao criar admin:', err));
