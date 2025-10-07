const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const empresaDB = require('./models/Empresa');

const bots = {};
const atendimentosManuais = {};
const qrCodesGerados = {};

const statusBots = {};

// ✅ FUNÇÃO PARA ENVIAR MENU INTERATIVO
async function enviarMenu(sock, sender, empresaNome) {
  const menuMessage = {
    text: `🏢 Menu Principal inteligente\n\n` +
      `Selecione uma opção que eu possa ajudar:\n\n` +
      `1️⃣ - REP bloqueado\n` +
      `2️⃣ - Horários e Folha\n` +
      `3️⃣ - Benefícios\n` +
      `4️⃣ - Documentos\n` +
      `5️⃣ - Falar com Atendente\n` +
      `0️⃣ - Reiniciar menu\n\n` +
      `*Digite o número da opção desejada*`
  };

  await sock.sendMessage(sender, menuMessage);
}

// ✅ FUNÇÃO PARA VALIDAR SE É UMA OPÇÃO VÁLIDA DO MENU
function isValidMenuOption(texto) {
  const opcoesValidas = ['1', '2', '3', '4', '5', '0'];
  return opcoesValidas.includes(texto.trim());
}

// ✅ FUNÇÃO PARA VERIFICAR SE É UMA MENSAGEM FORA DO FLUXO
function isMensagemForaDoFluxo(texto, atendimentoAtivo, fluxoREPAtivo) {
  const textoLower = texto.toLowerCase().trim();
  
  // Comandos especiais permitidos
  const comandosPermitidos = ['#sair', '#bot', '#menu', '#humano', '#atendente', '#manual'];
  if (comandosPermitidos.some(c => textoLower.includes(c))) {
    return false;
  }
  
  // Se está em atendimento humano ou fluxo REP, permite qualquer mensagem
  if (atendimentoAtivo || fluxoREPAtivo) {
    return false;
  }
  
  // Se é uma opção válida do menu, não é fora do fluxo
  if (isValidMenuOption(texto)) {
    return false;
  }
  
  // Se não é nenhum dos casos acima, é mensagem fora do fluxo
  return true;
}

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
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      const loggedOut = statusCode === DisconnectReason.loggedOut;

      const empresaAtualizada = await empresaDB.findById(empresa._id);

      if (!loggedOut && empresaAtualizada?.botAtivo) {
        console.log(`[RECONNECT] Reconectando bot de ${empresaAtualizada.nome}...`);
        iniciarBot(empresaAtualizada);

        // enquanto reconecta, marca como desconectado temporário
        statusBots[empresa._id] = { conectado: false, ultimaAtualizacao: new Date() };
      } else {
        console.log(`[RECONNECT] Não reconectando: loggedOut=${loggedOut}, botAtivo=${empresaAtualizada?.botAtivo}`);

        // se realmente foi logout, aí sim marca como desconectado permanente
        statusBots[empresa._id] = { conectado: false, ultimaAtualizacao: new Date() };
      }
    }

    if (connection === 'open') {
      statusBots[empresa._id] = { conectado: true, ultimaAtualizacao: new Date() };
      console.log(`🤖 Conectado com sucesso: ${empresa.nome}`);
    }
  });

  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const { WritableStreamBuffer } = require('stream-buffers');
  const handleMensagem = require('./handlers/chatbot');
  const { transcreverAudio } = require('./transcreverAudio');

  // ✅ IMPORTAR FLUXO REP PARA VERIFICAR SE USUÁRIO ESTÁ NO FLUXO
  let usuariosEmFluxoREP = new Map();
  try {
    const chatbotModule = require('./handlers/chatbot');
    // Se o chatbot.js exporta a variável, podemos acessá-la
    if (chatbotModule.usuariosEmFluxoREP) {
      usuariosEmFluxoREP = chatbotModule.usuariosEmFluxoREP;
    }
  } catch (error) {
    console.log('⚠️ Não foi possível acessar usuariosEmFluxoREP');
  }

  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages?.[0];
      if (!msg || !msg.message) return;

      const sender = msg.key.remoteJid;

      // Extrai telefone limpo
      const telefone = sender ? sender.replace('@s.whatsapp.net', '') : null;
      const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;

      console.log(`\n📱 ===== DEBUG COMPLETO DO TELEFONE =====`);
      console.log(`   - Sender original: ${sender}`);
      console.log(`   - Telefone limpo: ${telefoneLimpo}`);
      console.log(`==========================================\n`);

      // ✅ DETECTA SE É MÍDIA (imagem, vídeo, documento)
      let isMedia = false;
      let mediaBuffer = null;
      let mediaType = null;

      // Verifica tipos de mídia
      if (msg.message?.imageMessage) {
        isMedia = true;
        mediaType = 'image';
      } else if (msg.message?.videoMessage) {
        isMedia = true;
        mediaType = 'video';
      } else if (msg.message?.documentMessage) {
        isMedia = true;
        mediaType = 'document';
      }

      // ✅ FAZ DOWNLOAD DA MÍDIA SE NECESSÁRIO
      if (isMedia) {
        try {
          console.log(`📥 Baixando mídia do tipo: ${mediaType}`);

          const stream = await downloadContentFromMessage(
            msg.message[`${mediaType}Message`],
            mediaType
          );

          const bufferStream = new WritableStreamBuffer();
          for await (const chunk of stream) {
            bufferStream.write(chunk);
          }
          bufferStream.end();

          mediaBuffer = bufferStream.getContents();
          console.log(`✅ Mídia baixada: ${mediaBuffer ? mediaBuffer.length : 0} bytes`);
        } catch (downloadError) {
          console.error('❌ Erro ao baixar mídia:', downloadError);
          isMedia = false;
          mediaBuffer = null;
        }
      }

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

      // Lista de comandos permitidos mesmo se fromMe
      const comandosPermitidosMesmoFromMe = [
        '#bot', '#sair', '#encerrar', 'bot', '#menu',
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
      const comandosEspeciais = ['#sair', '#bot', 'bot', '#menu'];

      // Comandos especiais
      if (comandosEspeciais.includes(textoLower)) {
        if (textoLower === '#sair') {
          delete atendimentosManuais[chaveAtendimento];
          // ✅ LIMPA FLUXO REP TAMBÉM
          usuariosEmFluxoREP.delete(sender);
          await sock.sendMessage(sender, { text: '✅ Conversa reiniciada. Digite "oi" para começar.' });
          return;
        }
        if (textoLower === '#bot' || textoLower === 'bot') {
          atendimentosManuais[chaveAtendimento] = { ativo: false, iniciado: false, nomeEmpresa: empresaAtualizada.nome };
          await sock.sendMessage(sender, { text: '🤖 Atendimento automático ativado.' });
          return;
        }
        if (textoLower === '#menu') {
          await enviarMenu(sock, sender, empresaAtualizada.nome);
          return;
        }
      }

      // Palavras-chave para atendimento humano
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

      // ✅ VERIFICA SE USUÁRIO ESTÁ NO FLUXO REP
      const fluxoREPAtivo = usuariosEmFluxoREP.has(sender);

      // ✅ VERIFICA SE É MENSAGEM FORA DO FLUXO (ANTES DO MENU)
      if (isMensagemForaDoFluxo(texto, atendimentosManuais[chaveAtendimento]?.ativo, fluxoREPAtivo)) {
        console.log(`⚠️ Mensagem fora do fluxo detectada: "${texto}"`);
        
        // Se já iniciou conversa mas enviou mensagem fora do menu, solicita seleção
        if (atendimentosManuais[chaveAtendimento].iniciado) {
          await sock.sendMessage(sender, {
            text: `❌ *Opção não reconhecida*\n\n` +
              `Por favor, selecione uma das opções do menu:\n\n` +
              `1️⃣ - REP bloqueado\n` +
              `2️⃣ - Horários e Folha\n` +
              `3️⃣ - Benefícios\n` +
              `4️⃣ - Documentos\n` +
              `5️⃣ - Falar com Atendente\n` +
              `0️⃣ - Reiniciar menu\n\n` +
              `*Digite apenas o número da opção desejada*`
          });
          return;
        }
      }

      // ✅ TRATAMENTO DO MENU
      const opcoesMenu = {
        '1': 'problema_ponto',
        '2': 'horarios_folha',
        '3': 'beneficios',
        '4': 'documentos',
        '5': 'atendente_humano',
        '0': 'reiniciar'
      };

      if (opcoesMenu[texto]) {
        const opcao = opcoesMenu[texto];

        switch (opcao) {
          case 'problema_ponto':
            await sock.sendMessage(sender, {
              text: '🔧 *Problemas no Ponto/REP*\n\nPor gentileza, use o seu celular para fotografar a tela do ponto que contém o REP e a Senha, e nos envie...'
            });
            break;

          case 'horarios_folha':
            await sock.sendMessage(sender, {
              text: '⏰ *Horários e Folha*\n\nEm breve teremos informações sobre seu ponto eletrônico e folha de pagamento.'
            });
            break;

          case 'beneficios':
            await sock.sendMessage(sender, {
              text: '🎁 *Benefícios*\n\nAqui você pode consultar informações sobre vale-transporte, vale-refeição e outros benefícios.'
            });
            break;

          case 'documentos':
            await sock.sendMessage(sender, {
              text: '📄 *Documentos*\n\nEm breve você poderá solicitar holerites, declarações e outros documentos.'
            });
            break;

          case 'atendente_humano':
            atendimentosManuais[chaveAtendimento].ativo = true;
            await sock.sendMessage(sender, {
              text: '👨‍💼 *Falar com Atendente*\n\nSolicitação enviada ao atendente humano. Aguarde um momento.'
            });
            return;

          case 'reiniciar':
            // ✅ LIMPA COMPLETAMENTE O ESTADO DO USUÁRIO
            delete atendimentosManuais[chaveAtendimento];
            usuariosEmFluxoREP.delete(sender);

            await sock.sendMessage(sender, {
              text: '🔄 *Conversa Reiniciada!*\n'
            });
            // ✅ REENVIA O MENU APÓS REINICIAR
            await enviarMenu(sock, sender, empresaAtualizada.nome);
            return;
        }

        // Não chama handleMensagem para opções de menu
        return;
      }

      // Saudação inicial
      if (saudacoes.includes(textoLower) && !atendimentosManuais[chaveAtendimento].iniciado) {
        atendimentosManuais[chaveAtendimento].iniciado = true;
        atendimentosManuais[chaveAtendimento].ultimoContato = new Date();

        await sock.sendMessage(sender, {
          text: `Olá! 👋 Bem-vindo(a) à Lugane AI!`
        });

        // ✅ ENVIA O MENU APÓS SAUDAÇÃO
        await enviarMenu(sock, sender, empresaAtualizada.nome);
        return;
      }

      // Atualiza último contato
      atendimentosManuais[chaveAtendimento].ultimoContato = new Date();

      // Atualiza presença
      await sock.sendPresenceUpdate('composing', sender);

      // ✅ CHAMA handleMensagem COM OS PARÂMETROS CORRETOS
      const resposta = await handleMensagem(
        empresaAtualizada._id,
        texto,
        sender,
        isMedia,
        mediaBuffer
      );

      if (resposta.resposta) {
        await sock.sendMessage(sender, { text: resposta.resposta });
      }

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

function enviarMensagemParaContato(nomeEmpresa, destinatario, mensagem, imagemBuffer = null) {
  const sock = bots[nomeEmpresa];

  if (!sock) {
    console.error(`❌ Bot não encontrado para empresa: ${nomeEmpresa}`);
    return false;
  }

  try {
    // Envia apenas texto, ignorando imagemBuffer
    return sock.sendMessage(destinatario, {
      text: mensagem
    });
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    return false;
  }
}

module.exports = {
  iniciarBot,
  getQRCode,
  reiniciarBot,
  toggleBot,
  deletarEmpresa,
  statusBots,
  enviarMensagemParaContato
};