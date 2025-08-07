require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');

const app = express();

// ======================
// 🧪 Verificação da URI do MongoDB
// ======================
console.log('✅ URI carregada do .env:', process.env.MONGO_URI);
if (!process.env.MONGO_URI.startsWith('mongodb+srv://')) {
    console.error('❌ URI inválida detectada! Use mongodb+srv:// no .env');
    process.exit(1);
}

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
    layoutsDir: path.join(__dirname, 'views/layouts'),
    helpers: {
        gt: (a, b) => a > b,
        subtract: (a, b) => a - b,
        eq: (a, b) => a === b,
        divide: (a, b) => a / b,
        range: (start, end) => {
            const arr = [];
            for (let i = start; i >= end; i--) arr.push(i);
            return arr;
        },
        lookup: (obj, field) => obj[field],
        add: (a, b) => a + b
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
const financing = require('./routes/financing');

app.use('/admin', admin);
app.use('/', usuarios);
app.use('/gas', gas);
app.use('/electric', electric);
app.use('/', financing);

// ======================
// 🚀 Exportação
// ======================
module.exports = app;
