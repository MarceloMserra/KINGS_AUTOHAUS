const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Agora isso vai funcionar:
const Usuario = require('../models/UserModel');

module.exports = function(passport) {
  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'senha' },
      (email, senha, done) => {
        Usuario.findOne({ email: email })
          .then((usuario) => {
            if (!usuario) {
              return done(null, false, { message: 'Essa conta não existe' });
            }

            bcrypt.compare(senha, usuario.senha, (erro, batem) => {
              if (batem) {
                return done(null, usuario);
              } else {
                return done(null, false, { message: 'Senha incorreta' });
              }
            });
          })
          .catch((err) => {
            return done(err);
          });
      }
    )
  );

  passport.serializeUser((usuario, done) => {
    done(null, usuario.id);
  });

  // CORRIGIDO: Utilizando async/await para lidar com a Promise retornada por findById
  passport.deserializeUser(async (id, done) => {
    try {
      const usuario = await Usuario.findById(id); // findById agora retorna uma Promise
      done(null, usuario);
    } catch (err) {
      done(err, null); // Passa o erro para o Passport
    }
  });
};
