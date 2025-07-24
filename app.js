const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const exphbs = require('express-handlebars'); // Importação do express-handlebars
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');

const app = express();

// ======================
// 🔗 Conexão com MongoDB Atlas
// ======================
mongoose.connect('mongodb://msmadureira:pfGoP65qVZOa29h8@ac-i8wrumx-shard-00-00.wsk8ldo.mongodb.net:27017,ac-i8wrumx-shard-00-01.wsk8ldo.mongodb.net:27017,ac-i8wrumx-shard-00-02.wsk8ldo.mongodb.net:27017/autorizz?ssl=true&replicaSet=atlas-ousvn5-shard-0&authSource=admin&retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('🟢 Conectado ao MongoDB Atlas!'))
.catch(err => console.error('❌ Erro ao conectar ao MongoDB Atlas:\n', err));

// ======================
// 🔧 Configuração do Handlebars
// ======================
app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: __dirname + '/views/layouts/',
    // Adição dos helpers personalizados aqui
    helpers: {
        // Helper para verificar se 'a' é maior que 'b' (Greater Than)
        gt: function(a, b) {
            return a > b;
        },
        // Helper para subtração
        subtract: function(a, b) {
            return a - b;
        },
        // Helper para verificar igualdade
        eq: function(a, b) {
            return a === b;
        },
        // Helper para divisão (usado nos ranges de preço/milhagem)
        divide: function(a, b) {
            return a / b;
        },
        // Helper para gerar um array de números (usado para anos no select)
        range: function(start, end) {
            const arr = [];
            for (let i = start; i >= end; i--) { // Conta de trás para frente para anos mais novos primeiro
                arr.push(i);
            }
            return arr;
        },
        // NOVO HELPER: para acessar propriedades dinamicamente (usado para modelsByBrand[selectedMake])
        lookup: function(obj, field) {
            return obj[field];
        },
        // NOVO HELPER: para adição
        add: function(a, b) {
            return a + b;
        }
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));


// ======================
// 🔧 Middlewares principais
// ======================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method')); // Middleware para permitir DELETE/PUT em formulários HTML
app.use(express.static(path.join(__dirname, 'public'))); // Serve HTML, CSS, imagens, vídeos etc.

// ======================
// 🧠 Sessão e Flash Messages
// ======================
app.use(session({
    secret: 'seusegredo', // Altere para uma string mais complexa em produção
    resave: true,
    saveUninitialized: true
}));
app.use(flash());

// ======================
// 🔐 Passport
// ======================
require('./config/auth')(passport); // Certifique-se de que o ficheiro auth.js está configurado corretamente
app.use(passport.initialize());
app.use(passport.session());

// ======================
// 🌍 Variáveis Globais (para aceder a flash messages e utilizador em qualquer template)
// ======================
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// ======================
// 🌐 Rotas
// ======================
const admin = require('./routes/admin');
const usuarios = require('./routes/usuarios');
const gas = require('./routes/gas_index');
const electric = require('./routes/electric_index');

app.use('/admin', admin);
app.use('/', usuarios);
app.use('/gas', gas);
app.use('/electric', electric);


// ======================
// 🚀 Exportação
// ======================
module.exports = app;
