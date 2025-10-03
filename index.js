require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { useMultiFileAuthState } = require('@whiskeysockets/baileys/lib/Utils/index.js');
const qrcode = require('qrcode-terminal');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const P = require('pino'); // Importa pino para o logger do Baileys

// Importa as novas funcionalidades
const { connectToMongo, saveSearchLog } = require('./db');
const { interpretCommand } = require('./aiProcessor');

// useMultiFileAuthState espera um diretório, não um arquivo
const authPath = './auth_info_baileys'; // Mudado para um nome de diretório

// Cria o estado de autenticação e a função para salvar as credenciais
async function initializeAuth() {
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    return { state, saveCreds };
}

// Função principal que inicializa o bot
async function startBot() {
    const { state, saveCreds } = await initializeAuth();
    const { version } = await fetchLatestBaileysVersion();
    console.log(`using Baileys v${version.join('.')}`);

    // Cria a conexão com o WhatsApp usando o estado de autenticação
    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }), // Adiciona logger para evitar warnings do Baileys
        auth: state,
        printQRInTerminal: true, // Exibe o QR Code no terminal para autenticar
        browser: ['Chrome', 'Ubuntu', '1.0.0'] // Define o agente do navegador
    });

    // Salva automaticamente as credenciais ao se conectar
    sock.ev.on('creds.update', saveCreds);

    // Evento disparado sempre que uma nova mensagem é recebida
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0];
        // Ignora mensagens vazias ou enviadas pelo próprio bot
        if (!m.message || m.key.fromMe) return;

        const sender = m.key.remoteJid; // Número de quem enviou
        // Conteúdo da mensagem recebida, tratando diferentes tipos de mensagens
        const messageType = Object.keys(m.message)[0];
        let textMessage = '';

        if (messageType === 'conversation') {
            textMessage = m.message.conversation;
        } else if (messageType === 'extendedTextMessage') {
            textMessage = m.message.extendedTextMessage.text;
        } else {
            // Ignorar outros tipos de mensagem por enquanto
            return;
        }

        console.log(`Mensagem recebida de ${sender}: ${textMessage}`);

        // Usa o AI Processor para interpretar o comando
        const command = await interpretCommand(textMessage);

        if (command.action === 'search') {
            const query = command.query;
            await sock.sendMessage(sender, { text: `Ok, pesquisando por "${query}" no Chrome...` });
            const result = await searchInChrome(query, false); // Abrir com interface gráfica para teste

            // Salva o log da pesquisa no MongoDB
            await saveSearchLog({
                timestamp: new Date(),
                sender: sender,
                query: query,
                result: result.success ? { title: result.title, url: result.url } : { error: result.error },
                success: result.success
            });

            if (result.success) {
                await sock.sendMessage(sender, { text: `Pesquisa concluída! Título: ${result.title}, URL: ${result.url}` });
            } else {
                await sock.sendMessage(sender, { text: `Erro ao realizar a pesquisa: ${result.error}` });
            }
        } else if (command.action === 'none') {
            await sock.sendMessage(sender, { text: 'Desculpe, não entendi o seu comando. Por favor, tente algo como "pesquisar [termo]" ou "procure por [termo]"' });
        } else if (command.action === 'error') {
            await sock.sendMessage(sender, { text: `Ocorreu um erro ao processar seu comando: ${command.message}` });
        }
    });

    // Evento de conexão e reconexão
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            // Exibe o QR Code no terminal
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            // Verifica se a desconexão não foi por logout (intencional)
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔌 Conexão encerrada. Reconectar?', shouldReconnect);
            if (shouldReconnect) {
                startBot(); // Tenta reconectar
            }
        } else if (connection === 'open') {
            console.log('✅ Conexão aberta com sucesso!');
        }
    });
}

// Conecta ao MongoDB e depois inicia a conexão com o WhatsApp
connectToMongo().then(() => {
    startBot();
});