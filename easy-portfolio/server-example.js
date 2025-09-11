// Este é um exemplo de como o backend poderia ser.
// Você precisará instalar o Express, Nodemailer e CORS:
// npm install express nodemailer cors dotenv

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

const app = express();
app.use(cors()); // Permite requisições do seu frontend
app.use(express.json()); // Permite que o servidor entenda o corpo da requisição em JSON

const PORT = process.env.PORT || 3000; // Usa a porta do ambiente ou 3000 como padrão

// --- Configuração do Serviço de E-mail ---
// ATENÇÃO: Em produção, use variáveis de ambiente para suas credenciais, não as coloque diretamente no código.
// Exemplo usando Gmail. Para isso, você precisa gerar uma "Senha de App" na sua conta Google.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Carregado do arquivo .env
        pass: process.env.EMAIL_PASS      // Carregado do arquivo .env
    }
});

// --- Endpoint para Enviar a Notificação ---
app.post('/send-notification', (req, res) => {
    console.log('Recebida requisição para /send-notification com os dados:', req.body);

    const { nf, stage, user } = req.body;

    if (!nf || !stage || !user) {
        return res.status(400).json({ message: 'Dados insuficientes para enviar notificação.' });
    }

    const mailOptions = {
        from: `"Sirius - Controle de Processos" <${process.env.EMAIL_USER}>`,
        to: 'rangnerluiz107@gmail.com', // E-mail de destino atualizado
        subject: `Novo Post na Etapa: ${stage.toUpperCase()}`,
        html: `
            <h1>Novo Post Criado no Sistema</h1>
            <p>Um novo post foi adicionado ao sistema por <strong>${user}</strong>.</p>
            <hr>
            <h3>Detalhes:</h3>
            <ul>
                <li><strong>Nota Fiscal (NF):</strong> ${nf}</li>
                <li><strong>Etapa:</strong> ${stage}</li>
                <li><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</li>
            </ul>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Erro ao enviar email:', error);
            return res.status(500).json({ message: 'Erro interno ao enviar o e-mail.' });
        }
        console.log('Notificação por e-mail enviada com sucesso: ' + info.response);
        res.status(200).json({ message: 'Notificação enviada com sucesso.' });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor de notificações rodando em http://localhost:${PORT}`);
});