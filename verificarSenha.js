const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('./models/UserModel');
const Usuario = mongoose.model('usuarios');

mongoose.connect('mongodb://msmadureira:pfGoP65qVZOa29h8@ac-i8wrumx-shard-00-00.wsk8ldo.mongodb.net:27017,ac-i8wrumx-shard-00-01.wsk8ldo.mongodb.net:27017,ac-i8wrumx-shard-00-02.wsk8ldo.mongodb.net:27017/autorizz?ssl=true&replicaSet=atlas-ousvn5-shard-0&authSource=admin&retryWrites=true&w=majority',{
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const usuario = await Usuario.findOne({ email: 'admin@admin.com' });
  if (!usuario) {
    console.log('❌ Usuário não encontrado!');
  } else {
    const senhaCorreta = await bcrypt.compare('123456', usuario.senha);
    console.log('🔐 Senha correta?', senhaCorreta);
  }
  mongoose.disconnect();
}).catch((err) => {
  console.error('❌ Erro ao conectar ao MongoDB:', err);
});
