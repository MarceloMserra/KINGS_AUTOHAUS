require('dotenv').config();

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
mongoose.connect(process.env.MONGO_URI, {
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
    helpers: {
        gt: function(a, b) {
            return a > b;
        },
        subtract: function(a, b) {
            return a - b;
        },
        eq: function(a, b) {
            return a === b;
        },
        divide: function(a, b) {
            return a / b;
        },
        range: function(start, end) {
            const arr = [];
            for (let i = start; i >= end; i--) {
                arr.push(i);
            }
            return arr;
        },
        lookup: function(obj, field) {
            return obj[field];
        },
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
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// ======================
// 🧠 Sessão e Flash Messages
// ======================
app.use(session({
    secret: process.env.SESSION_SECRET || 'seusegredo',
    resave: true,
    saveUninitialized: true
}));
app.use(flash());

// ======================
// 🔐 Passport
// ======================
require('./config/auth')(passport);
app.use(passport.initialize());
app.use(passport.session());

// ======================
// 🌍 Variáveis Globais
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
const financing = require('./routes/financing'); // Adicionado: Importa o novo router de financiamento

app.use('/admin', admin);
app.use('/', usuarios);
app.use('/gas', gas); // Rotas de gás agora funcionam *apenas* com prefixo /gas
app.use('/electric', electric);
app.use('/', financing); // Rotas de financiamento agora funcionam na raiz (ex: /financing)

// ======================
// 🚀 Exportação
// ======================
module.exports = app;
