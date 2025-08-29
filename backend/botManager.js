// const fs = require('fs');
// const path = require('path');
// const qrcode = require('qrcode');
// const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
// const empresaDB = require('./models/Empresa');

// const bots = {};  // cache { nomeEmpresa: sock }
// const atendimentosManuais = {};  // { chaveEmpresa_remetente: { ativo, ultimoContato, nomeEmpresa } }
// const qrCodesGerados = {}; // { nomeEmpresa: base64QR }

// async function iniciarBot(empresa) {
//   const pasta = path.join(__dirname, 'bots', empresa.nome, 'auth_info_baileys');
//   if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });

//   const { state, saveCreds } = await useMultiFileAuthState(pasta);
//   const sock = makeWASocket({ auth: state });

//   let resolveQRCode;
//   const qrCodePromise = new Promise(resolve => { resolveQRCode = resolve; });

//   sock.ev.on('creds.update', saveCreds);

//   sock.ev.on('connection.update', async (update) => {
//     const { connection, lastDisconnect, qr } = update;

//     if (qr) {
//       qrCodesGerados[empresa.nome] = await qrcode.toDataURL(qr);
//       resolveQRCode(qr);
//     }

//     if (connection === 'close') {
//       const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

//       const empresaAtualizada = await empresaDB.findById(empresa._id);
//       if (shouldReconnect && empresaAtualizada?.botAtivo) {
//         console.log(`[RECONNECT] Reconectando bot de ${empresaAtualizada.nome}...`);
//         iniciarBot(empresaAtualizada);
//       } else {
//         console.log(`[RECONNECT] Não reconectando: botAtivo=${empresaAtualizada?.botAtivo}`);
//       }
//     }

//     if (connection === 'open') {
//       console.log(`🤖 Conectado com sucesso: ${empresa.nome}`);
//     }
//   });

//   const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
//   const { WritableStreamBuffer } = require('stream-buffers');
//   const handleMensagem = require('./handlers/chatbot');
//   const { transcreverAudio } = require('./transcreverAudio');

//   sock.ev.on('messages.upsert', async (m) => {
//     try {
//       const msg = m.messages?.[0];
//       if (!msg || !msg.message) return;

//       const sender = msg.key.remoteJid;

//       // Extrai texto das mensagens
//       let texto =
//         msg.message?.conversation ||
//         msg.message?.extendedTextMessage?.text ||
//         msg.message?.imageMessage?.caption ||
//         msg.message?.videoMessage?.caption ||
//         msg.message?.documentMessage?.caption ||
//         msg.message?.buttonsResponseMessage?.selectedButtonId ||
//         msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
//         '';

//       // Tratamento de áudio (voz)
//       if (msg.message?.voiceMessage || msg.message?.audioMessage) {
//         const type = msg.message.voiceMessage ? 'voiceMessage' : 'audioMessage';
//         const stream = await downloadContentFromMessage(msg.message[type], type.replace('Message', ''));

//         const bufferStream = new WritableStreamBuffer();
//         for await (const chunk of stream) {
//           bufferStream.write(chunk);
//         }
//         bufferStream.end();

//         const audioBuffer = bufferStream.getContents();
//         if (audioBuffer) {
//           texto = await transcreverAudio(audioBuffer);
//         }
//       }

//       const textoLower = texto.toLowerCase().trim();

//       // Lista de comandos que podem ser usados mesmo se vierem de fromMe (atendente humano)
//       const comandosPermitidosMesmoFromMe = [
//         '#bot', '#sair', '#encerrar', 'bot',
//         '#humano', '#atendente', '#manual'
//       ];

//       if (msg.key.fromMe && !comandosPermitidosMesmoFromMe.some(c => textoLower.includes(c))) {
//         return;
//       }

//       const empresaAtualizada = await empresaDB.findById(empresa._id);
//       if (!empresaAtualizada?.botAtivo) return;

//       const chaveAtendimento = `${empresaAtualizada._id}_${sender}`;
//       const saudacoes = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'];
//       const comandosEspeciais = ['#sair', '#bot', 'bot'];

//       // Comandos especiais
//       if (comandosEspeciais.includes(textoLower)) {
//         if (textoLower === '#sair') {
//           delete atendimentosManuais[chaveAtendimento];
//           await sock.sendMessage(sender, { text: '✅ Conversa reiniciada. Digite "oi" para começar.' });
//           return;
//         }
//         if (textoLower === '#bot' || textoLower === 'bot') {
//           atendimentosManuais[chaveAtendimento] = { ativo: false, nomeEmpresa: empresaAtualizada.nome };
//           await sock.sendMessage(sender, { text: '🤖 Atendimento automático ativado.' });
//           return;
//         }
//       }

//       // Palavras-chave para atendimento humano (cliente OU atendente)
//       const palavrasChaveAtendente = [
//         'atendente', 'humano', 'pessoa', 'falar com atendente', 'falar com humano',
//         'quero atendimento humano', 'quero falar com alguém', 'ajuda de um atendente',
//         'quero um atendente', 'preciso de ajuda humana',
//         '#humano', '#atendente', '#manual'
//       ];

//       if (palavrasChaveAtendente.some(p => textoLower.includes(p))) {
//         atendimentosManuais[chaveAtendimento] = {
//           ativo: true,
//           ultimoContato: new Date(),
//           nomeEmpresa: empresaAtualizada.nome
//         };

//         // Só confirma para o cliente, não para o atendente humano
//         if (!msg.key.fromMe) {
//           await sock.sendMessage(sender, { text: '📨 Solicitação enviada ao atendente humano. Aguarde um momento.' });
//         }
//         return;
//       }

//       // Se atendimento humano ativo, apenas atualiza último contato
//       if (atendimentosManuais[chaveAtendimento]?.ativo) {
//         atendimentosManuais[chaveAtendimento].ultimoContato = new Date();
//         console.log(`👤 Atendimento humano ativo para: ${sender}`);
//         return;
//       }

//       // Saudação inicial
//       if (saudacoes.includes(textoLower)) {
//         await sock.sendMessage(sender, {
//           text: `Olá! 👋 Bem-vindo(a) à ${empresaAtualizada.nome}! Como posso te ajudar? Se quiser falar com um atendente humano, digite "atendente" ou "humano".`
//         });
//         return;
//       }

//       // Atualiza presença
//       await sock.sendPresenceUpdate('composing', sender);

//       // Integração com Gemini (IA)
//       const { gerarRespostaGemini } = require('./gemini');
//       const respostaTexto = await gerarRespostaGemini(empresaAtualizada.promptIA, texto);
//       await sock.sendMessage(sender, { text: respostaTexto });

//     } catch (err) {
//       console.error('❌ Erro no processamento da mensagem:', err);
//     }
//   });

//   bots[empresa.nome] = sock;
//   const qrCodeBase64 = await qrCodePromise.then(qr => qrcode.toDataURL(qr));
//   return qrCodeBase64;
// }

// function getQRCode(nomeEmpresa) {
//   return qrCodesGerados[nomeEmpresa] || null;
// }

// async function reiniciarBot(empresa) {
//   const authPath = path.join(__dirname, 'bots', empresa.nome, 'auth_info_baileys');
//   if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });

//   if (bots[empresa.nome]) {
//     try {
//       if (bots[empresa.nome].end) {
//         await bots[empresa.nome].end();
//       } else if (bots[empresa.nome].logout) {
//         await bots[empresa.nome].logout();
//       }
//     } catch (err) {
//       console.error(`Erro ao encerrar bot ${empresa.nome} antes de reiniciar:`, err);
//     }
//     delete bots[empresa.nome];
//   }

//   return iniciarBot(empresa);
// }

// async function toggleBot(empresa) {
//   if (!empresa.botAtivo && bots[empresa.nome]) {
//     try {
//       if (bots[empresa.nome].end) {
//         await bots[empresa.nome].end();
//       } else if (bots[empresa.nome].logout) {
//         await bots[empresa.nome].logout();
//       }
//       delete bots[empresa.nome];
//       console.log(`[TOGGLE] Bot de ${empresa.nome} desligado.`);
//     } catch (err) {
//       console.error(`[TOGGLE] Erro ao desligar bot de ${empresa.nome}:`, err);
//     }
//   }

//   if (empresa.botAtivo && !bots[empresa.nome]) {
//     try {
//       await iniciarBot(empresa);
//       console.log(`[TOGGLE] Bot de ${empresa.nome} iniciado.`);
//     } catch (err) {
//       console.error(`[TOGGLE] Erro ao iniciar bot de ${empresa.nome}:`, err);
//     }
//   }
// }

// function deletarEmpresa(nomeEmpresa) {
//   delete qrCodesGerados[nomeEmpresa];

//   if (bots[nomeEmpresa]) {
//     try {
//       bots[nomeEmpresa].end ? bots[nomeEmpresa].end() : bots[nomeEmpresa].logout();
//     } catch (err) {
//       console.error(`Erro ao encerrar bot ${nomeEmpresa} durante exclusão:`, err);
//     }
//     delete bots[nomeEmpresa];
//   }
// }

// // Intervalo para encerrar atendimentos inativos
// setInterval(() => {
//   const agora = new Date();

//   for (const chave in atendimentosManuais) {
//     const atendimento = atendimentosManuais[chave];
//     if (atendimento.ativo && atendimento.ultimoContato) {
//       const diffMinutos = (agora - atendimento.ultimoContato) / 1000 / 60;
//       if (diffMinutos >= 10) {
//         atendimento.ativo = false;
//         atendimento.ultimoContato = null;

//         const sender = chave.split('_')[1];
//         const botSock = bots[atendimento.nomeEmpresa];

//         if (botSock) {
//           botSock.sendMessage(sender, {
//             text: '🤖 Atendimento humano encerrado por inatividade. Agora você está falando com o assistente virtual novamente.'
//           }).catch(console.error);
//         }
//       }
//     }
//   }
// }, 60 * 1000);

// module.exports = {
//   iniciarBot,
//   getQRCode,
//   reiniciarBot,
//   toggleBot,
//   deletarEmpresa
// };

const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const empresaDB = require('./models/Empresa');

const bots = {};  // cache { nomeEmpresa: sock }
const atendimentosManuais = {};  // { chaveEmpresa_remetente: { ativo, ultimoContato, iniciado, nomeEmpresa } }
const qrCodesGerados = {}; // { nomeEmpresa: base64QR }

async function iniciarBot(empresa) {
  const pasta = path.join(__dirname, 'bots', empresa.nome, 'auth_info_baileys');
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(pasta);
  const sock = makeWASocket({ auth: state });

  let resolveQRCode;
  const qrCodePromise = new Promise(resolve => { resolveQRCode = resolve; });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodesGerados[empresa.nome] = await qrcode.toDataURL(qr);
      resolveQRCode(qr);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

      const empresaAtualizada = await empresaDB.findById(empresa._id);
      if (shouldReconnect && empresaAtualizada?.botAtivo) {
        console.log(`[RECONNECT] Reconectando bot de ${empresaAtualizada.nome}...`);
        iniciarBot(empresaAtualizada);
      } else {
        console.log(`[RECONNECT] Não reconectando: botAtivo=${empresaAtualizada?.botAtivo}`);
      }
    }

    if (connection === 'open') {
      console.log(`🤖 Conectado com sucesso: ${empresa.nome}`);
    }
  });

  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const { WritableStreamBuffer } = require('stream-buffers');
  const handleMensagem = require('./handlers/chatbot');
  const { transcreverAudio } = require('./transcreverAudio');

  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages?.[0];
      if (!msg || !msg.message) return;

      const sender = msg.key.remoteJid;

      // Extrai texto das mensagens
      let texto =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        msg.message?.documentMessage?.caption ||
        msg.message?.buttonsResponseMessage?.selectedButtonId ||
        msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        '';

      // Tratamento de áudio (voz)
      if (msg.message?.voiceMessage || msg.message?.audioMessage) {
        const type = msg.message.voiceMessage ? 'voiceMessage' : 'audioMessage';
        const stream = await downloadContentFromMessage(msg.message[type], type.replace('Message', ''));

        const bufferStream = new WritableStreamBuffer();
        for await (const chunk of stream) {
          bufferStream.write(chunk);
        }
        bufferStream.end();

        const audioBuffer = bufferStream.getContents();
        if (audioBuffer) {
          texto = await transcreverAudio(audioBuffer);
        }
      }

      const textoLower = texto.toLowerCase().trim();

      // Lista de comandos que podem ser usados mesmo se vierem de fromMe (atendente humano)
      const comandosPermitidosMesmoFromMe = [
        '#bot', '#sair', '#encerrar', 'bot',
        '#humano', '#atendente', '#manual'
      ];

      if (msg.key.fromMe && !comandosPermitidosMesmoFromMe.some(c => textoLower.includes(c))) {
        return;
      }

      const empresaAtualizada = await empresaDB.findById(empresa._id);
      if (!empresaAtualizada?.botAtivo) return;

      const chaveAtendimento = `${empresaAtualizada._id}_${sender}`;
      if (!atendimentosManuais[chaveAtendimento]) {
        atendimentosManuais[chaveAtendimento] = {
          ativo: false,
          ultimoContato: null,
          iniciado: false,
          nomeEmpresa: empresaAtualizada.nome
        };
      }

      const saudacoes = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'];
      const comandosEspeciais = ['#sair', '#bot', 'bot'];

      // Comandos especiais
      if (comandosEspeciais.includes(textoLower)) {
        if (textoLower === '#sair') {
          delete atendimentosManuais[chaveAtendimento];
          await sock.sendMessage(sender, { text: '✅ Conversa reiniciada. Digite "oi" para começar.' });
          return;
        }
        if (textoLower === '#bot' || textoLower === 'bot') {
          atendimentosManuais[chaveAtendimento] = { ativo: false, iniciado: false, nomeEmpresa: empresaAtualizada.nome };
          await sock.sendMessage(sender, { text: '🤖 Atendimento automático ativado.' });
          return;
        }
      }

      // Palavras-chave para atendimento humano (cliente OU atendente)
      const palavrasChaveAtendente = [
        'atendente', 'humano', 'pessoa', 'falar com atendente', 'falar com humano',
        'quero atendimento humano', 'quero falar com alguém', 'ajuda de um atendente',
        'quero um atendente', 'preciso de ajuda humana',
        '#humano', '#atendente', '#manual'
      ];

      if (palavrasChaveAtendente.some(p => textoLower.includes(p))) {
        atendimentosManuais[chaveAtendimento].ativo = true;
        atendimentosManuais[chaveAtendimento].ultimoContato = new Date();

        if (!msg.key.fromMe) {
          await sock.sendMessage(sender, { text: '📨 Solicitação enviada ao atendente humano. Aguarde um momento.' });
        }
        return;
      }

      // Se atendimento humano ativo, apenas atualiza último contato
      if (atendimentosManuais[chaveAtendimento]?.ativo) {
        atendimentosManuais[chaveAtendimento].ultimoContato = new Date();
        console.log(`👤 Atendimento humano ativo para: ${sender}`);
        return;
      }

      // Saudação inicial (só manda se ainda não tiver iniciado ou se resetou)
      if (saudacoes.includes(textoLower) && !atendimentosManuais[chaveAtendimento].iniciado) {
        atendimentosManuais[chaveAtendimento].iniciado = true;
        atendimentosManuais[chaveAtendimento].ultimoContato = new Date();

        await sock.sendMessage(sender, {
          text: `Olá! 👋 Bem-vindo(a) à ${empresaAtualizada.nome}! Como posso te ajudar? Se quiser falar com um atendente humano, digite "atendente" ou "humano".`
        });
        return;
      }

      // Atualiza último contato
      atendimentosManuais[chaveAtendimento].ultimoContato = new Date();

      // Atualiza presença
      await sock.sendPresenceUpdate('composing', sender);

      // Integração com Gemini (IA)
      const { gerarRespostaGemini } = require('./gemini');
      const respostaTexto = await gerarRespostaGemini(empresaAtualizada.promptIA, texto);
      await sock.sendMessage(sender, { text: respostaTexto });

    } catch (err) {
      console.error('❌ Erro no processamento da mensagem:', err);
    }
  });

  bots[empresa.nome] = sock;
  const qrCodeBase64 = await qrCodePromise.then(qr => qrcode.toDataURL(qr));
  return qrCodeBase64;
}

function getQRCode(nomeEmpresa) {
  return qrCodesGerados[nomeEmpresa] || null;
}

async function reiniciarBot(empresa) {
  const authPath = path.join(__dirname, 'bots', empresa.nome, 'auth_info_baileys');
  if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });

  if (bots[empresa.nome]) {
    try {
      if (bots[empresa.nome].end) {
        await bots[empresa.nome].end();
      } else if (bots[empresa.nome].logout) {
        await bots[empresa.nome].logout();
      }
    } catch (err) {
      console.error(`Erro ao encerrar bot ${empresa.nome} antes de reiniciar:`, err);
    }
    delete bots[empresa.nome];
  }

  return iniciarBot(empresa);
}

async function toggleBot(empresa) {
  if (!empresa.botAtivo && bots[empresa.nome]) {
    try {
      if (bots[empresa.nome].end) {
        await bots[empresa.nome].end();
      } else if (bots[empresa.nome].logout) {
        await bots[empresa.nome].logout();
      }
      delete bots[empresa.nome];
      console.log(`[TOGGLE] Bot de ${empresa.nome} desligado.`);
    } catch (err) {
      console.error(`[TOGGLE] Erro ao desligar bot de ${empresa.nome}:`, err);
    }
  }

  if (empresa.botAtivo && !bots[empresa.nome]) {
    try {
      await iniciarBot(empresa);
      console.log(`[TOGGLE] Bot de ${empresa.nome} iniciado.`);
    } catch (err) {
      console.error(`[TOGGLE] Erro ao iniciar bot de ${empresa.nome}:`, err);
    }
  }
}

function deletarEmpresa(nomeEmpresa) {
  delete qrCodesGerados[nomeEmpresa];

  if (bots[nomeEmpresa]) {
    try {
      bots[nomeEmpresa].end ? bots[nomeEmpresa].end() : bots[nomeEmpresa].logout();
    } catch (err) {
      console.error(`Erro ao encerrar bot ${nomeEmpresa} durante exclusão:`, err);
    }
    delete bots[nomeEmpresa];
  }
}

// Intervalo para encerrar atendimentos inativos + resetar boas-vindas
setInterval(() => {
  const agora = new Date();

  for (const chave in atendimentosManuais) {
    const atendimento = atendimentosManuais[chave];

    // Encerrar atendimento humano após 10 min
    if (atendimento.ativo && atendimento.ultimoContato) {
      const diffMinutos = (agora - atendimento.ultimoContato) / 1000 / 60;
      if (diffMinutos >= 10) {
        atendimento.ativo = false;
        atendimento.ultimoContato = null;

        const sender = chave.split('_')[1];
        const botSock = bots[atendimento.nomeEmpresa];

        if (botSock) {
          botSock.sendMessage(sender, {
            text: '🤖 Atendimento humano encerrado por inatividade. Agora você está falando com o assistente virtual novamente.'
          }).catch(console.error);
        }
      }
    }

    // Resetar boas-vindas após 2h sem contato
    if (atendimento.iniciado && atendimento.ultimoContato) {
      const diffHoras = (agora - atendimento.ultimoContato) / 1000 / 60 / 60;
      if (diffHoras >= 2) {
        atendimento.iniciado = false;
        atendimento.ultimoContato = null;
        console.log(`🔄 Reset de saudação para ${chave} por inatividade de 2h.`);
      }
    }
  }
}, 60 * 1000);

module.exports = {
  iniciarBot,
  getQRCode,
  reiniciarBot,
  toggleBot,
  deletarEmpresa
};

