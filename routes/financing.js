const express = require('express');
const router = express.Router();
const FinancingApplication = require('../models/FinancingApplication'); // Importa o modelo de solicitação de financiamento

// Rota GET para exibir o formulário de financiamento
router.get('/financing', (req, res) => {
    const currentYear = new Date().getFullYear(); // Passa o ano atual para o Handlebars
    res.render('financing', { currentYear: currentYear });
});

// Rota POST para submissão do formulário de financiamento
router.post('/financing-submit', async (req, res) => {
    try {
        const formData = req.body; // Todos os dados do formulário estarão aqui
        console.log('Dados completos do formulário de financiamento recebidos:', formData);

        // Crie uma nova instância do modelo com os dados do formulário
        const newApplication = new FinancingApplication(formData);

        // Salve no banco de dados
        await newApplication.save();

        req.flash('success_msg', 'Sua solicitação de financiamento foi enviada com sucesso! Entraremos em contato em breve.');
        res.redirect('/'); // Redireciona para a página inicial ou para uma página de sucesso
    } catch (err) {
        console.error("❌ Erro ao salvar solicitação de financiamento:", err);
        req.flash('error_msg', 'Ocorreu um erro ao enviar sua solicitação. Por favor, tente novamente.');
        res.redirect('/financing'); // Redireciona de volta ao formulário em caso de erro
    }
});

module.exports = router;
