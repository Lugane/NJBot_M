// backend/handlers/chatbot.js
const Empresa = require('../models/Empresa');
const { gerarRespostaGemini } = require('../gemini');
const { processarImagemOCR, gerarRespostaOCR } = require('./ocrHandler');
const { enviarMensagemParaContato } = require('../botManager');

// Importação condicional para evitar erro de módulo
let searchInChrome;
try {
  const chromeModule = require('../DesbloqueioREP');
  searchInChrome = chromeModule.searchInChrome;
} catch (error) {
  console.log('⚠️ Módulo DesbloqueioREP não encontrado, funcionalidade de pesquisa desativada');
  searchInChrome = null;
}

// Variável para controlar estado da conversa
const usuariosEmFluxoREP = new Map();

async function handleMensagem(empresaId, mensagemUsuario, sender = null, isMedia = false, mediaBuffer = null) {
  try {
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return { resposta: '⚠️ Empresa não encontrada.' };

    // ✅ 1. PRIMEIRO: Verifica se é uma IMAGEM do REP
    if (isMedia && mediaBuffer) {
      return await processarImagemREP(mediaBuffer, sender, empresaId); // ✅ Passa empresaId
    }

    // ✅ 2. SEGUNDO: Verifica se usuário está em fluxo ativo
    if (usuariosEmFluxoREP.has(sender)) {
      return await continuarFluxoREP(mensagemUsuario, sender);
    }

    // ✅ 3. TERCEIRO: Verifica se é problema no ponto (ativa fluxo)
    const resultadoProblemaPonto = await verificarProblemaPonto(mensagemUsuario, sender);
    if (resultadoProblemaPonto.deveResponder) {
      return { resposta: resultadoProblemaPonto.resposta };
    }

    // ✅ 4. QUARTO: Usa IA normal para outras mensagens
    const promptCompleto = `${empresa.promptIA}\nUsuário: ${mensagemUsuario}\nIA:`;
    const respostaIA = await gerarRespostaGemini(promptCompleto, mensagemUsuario);

    return {
      resposta: respostaIA
    };
  } catch (error) {
    console.error('❌ Erro no handleMensagem:', error);
    return { resposta: '⚠️ Ocorreu um erro ao processar sua mensagem.' };
  }
}

// ✅ FUNÇÃO PARA VERIFICAR PROBLEMAS NO PONTO
async function verificarProblemaPonto(mensagem, sender) {
  const texto = mensagem.toLowerCase().trim();

  // PALAVRAS-CHAVE QUE ATIVAM O FLUXO DE PROBLEMAS NO PONTO
  const palavrasProblemaPonto = [
    'não acessa', 'ponto não acessa', 'ponto parou', 'ponto bloqueado',
    'problema no ponto', 'problema ponto', 'ponto com erro', 'erro no ponto',
    'rep bloqueado', 'rep não funciona', '1602', '1603', 'desbloquear rep',
    'rep travado', 'ponto travado'
  ];

  const deveAtivarFluxo = palavrasProblemaPonto.some(palavra => texto.includes(palavra));

  if (!deveAtivarFluxo) {
    return { deveResponder: false };
  }

  // ATIVA O FLUXO PARA ESTE USUÁRIO
  usuariosEmFluxoREP.set(sender, {
    etapa: 'aguardando_imagem',
    tentativas: 0,
    dados: {}
  });

  return {
    deveResponder: true,
    resposta: `🔧 **Identifiquei um problema no ponto!**\n\n` +
      `📸 **Para ajudar, preciso que você envie uma FOTO do REP** mostrando:\n\n` +
      `• **Número do REP**\n` +
      `• **Senha/Contra Senha**\n\n` +
      `_Com essas informações, posso acessar o sistema e ajudar no desbloqueio!_`
  };
}

// ✅ FUNÇÃO PARA PROCESSAR IMAGEM DO REP
async function processarImagemREP(mediaBuffer, sender, empresaId) {
  try {
    console.log('📸 Processando imagem do REP...');

    const resultadoOCR = await processarImagemOCR(mediaBuffer);

    if (resultadoOCR.sucesso && resultadoOCR.dadosREP.numeroREP && resultadoOCR.dadosREP.senha) {
      const telefoneLimpo = sender ? sender.replace('@s.whatsapp.net', '').replace(/\D/g, '') : null;

      // Busca o nome da empresa
      const empresa = await Empresa.findById(empresaId);
      const nomeEmpresa = empresa ? empresa.nome : null;

      usuariosEmFluxoREP.delete(sender);

      if (searchInChrome && nomeEmpresa) {
        executarNavegacaoRHID(sender, telefoneLimpo, resultadoOCR.dadosREP, nomeEmpresa);
      }

      return {
        resposta: `*Dados identificados:*\nREP: ${resultadoOCR.dadosREP.numeroREP}\nSenha: ${resultadoOCR.dadosREP.senha}\n\n*Processando desbloqueio, aguarde 2 minutos ...*`
        };
      } else {
      // ❌ DADOS INCOMPLETOS - MANTÉM USUÁRIO NO FLUXO
      let usuarioFluxo = usuariosEmFluxoREP.get(sender);
      
      // Se não existe fluxo, cria um novo
      if (!usuarioFluxo) {
        usuarioFluxo = {
          etapa: 'aguardando_imagem',
          tentativas: 0,
          dados: {}
        };
      }
      
      usuarioFluxo.tentativas += 1;
      usuariosEmFluxoREP.set(sender, usuarioFluxo); // ✅ MANTÉM NO FLUXO

      let resposta = '';

      if (resultadoOCR.dadosREP.numeroREP || resultadoOCR.dadosREP.senha) {
        // Dados parciais
        resposta = `*Dados parciais identificados:*\n`;
        if (resultadoOCR.dadosREP.numeroREP) resposta += `✅ REP: ${resultadoOCR.dadosREP.numeroREP}\n`;
        else resposta += `❌ REP: Não identificado\n`;

        if (resultadoOCR.dadosREP.senha) resposta += `✅ Senha: ${resultadoOCR.dadosREP.senha}\n`;
        else resposta += `❌ Senha: Não identificada\n`;

        resposta += `\n📸 *Envie outra foto mais nítida* para completar os dados.`;
      } else {
        // Nenhum dado encontrado
        resposta = `❌ *Não consegui identificar os dados do REP*\n\n` +
          `📸 *Por favor, envie outra foto mais nítida* mostrando:\n` +
          `• Número do REP (15-18 dígitos)\n` +
          `• Senha/Contra Senha (10 dígitos)\n\n` +
          `_Dica: Garanta boa iluminação e foco na área dos números._`;
      }

      // ✅ SE EXCEDEU TENTATIVAS, FINALIZA O FLUXO COM SUGESTÃO
      if (usuarioFluxo.tentativas >= 3) {
        usuariosEmFluxoREP.delete(sender);
        resposta += `\n\n⚠️ *Máximo de tentativas atingido (3).*\n` +
          `_Entre em contato com o suporte técnico para assistência personalizada._`;
      } else {
        resposta += `\n\n_Tentativa ${usuarioFluxo.tentativas} de 3_`;
      }

      return { resposta };
    }

  } catch (error) {
    console.error('❌ Erro ao processar imagem REP:', error);
    
    // ✅ MANTÉM O FLUXO MESMO EM CASO DE ERRO
    let usuarioFluxo = usuariosEmFluxoREP.get(sender);
    if (!usuarioFluxo) {
      usuarioFluxo = {
        etapa: 'aguardando_imagem',
        tentativas: 0,
        dados: {}
      };
    }
    
    usuarioFluxo.tentativas += 1;
    usuariosEmFluxoREP.set(sender, usuarioFluxo);

    let resposta = '❌ Erro ao processar a imagem. ';
    
    if (usuarioFluxo.tentativas < 3) {
      resposta += `📸 *Envie outra foto mais nítida* do REP.\n\n_Tentativa ${usuarioFluxo.tentativas} de 3_`;
    } else {
      usuariosEmFluxoREP.delete(sender);
      resposta += `\n\n⚠️ *Máximo de tentativas atingido.*\n` +
        `_Entre em contato com o suporte técnico para assistência adicional._`;
    }

    return { resposta };
  }
}

// ✅ FUNÇÃO PARA CONTINUAR FLUXO ATIVO
async function continuarFluxoREP(mensagem, sender) {
  const fluxoUsuario = usuariosEmFluxoREP.get(sender);

  if (fluxoUsuario.etapa === 'aguardando_imagem') {
    // Usuário enviou texto em vez de imagem
    usuariosEmFluxoREP.delete(sender);
    return {
      resposta: `📸 **Preciso de uma FOTO do REP**\n\n` +
        `Para ajudar com o desbloqueio, envie uma imagem mostrando:\n` +
        `• Número do REP\n` +
        `• Senha/Contra Senha\n\n` +
        `_Não consigo ler essas informações apenas pelo texto._`
    };
  }

  // Limpa fluxo se não reconhece
  usuariosEmFluxoREP.delete(sender);
  return { deveResponder: false };
}

// ✅ FUNÇÃO PARA ENVIAR MENSAGEM VIA WHATSAPP
async function enviarMensagemWhatsApp(sender, mensagem, imagemBuffer = null, nomeEmpresa) {
  try {
    console.log(`📤 Enviando mensagem para ${sender}`);

    await enviarMensagemParaContato(nomeEmpresa, sender, mensagem, imagemBuffer);

    console.log('✅ Mensagem enviada com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error);
    return false;
  }
}

// ✅ FUNÇÃO PARA EXECUTAR NAVEGAÇÃO RHID - VERSÃO COM CALLBACK
async function executarNavegacaoRHID(sender, telefoneLimpo, dadosREP, nomeEmpresa) {
  try {
    if (searchInChrome) {
      console.log(`🌐 Iniciando navegação RHID para: ${telefoneLimpo}`);

      // ✅ CALLBACK ATUALIZADO
      const callbackResultado = async (mensagem, imagemBuffer = null) => {
        try {
          console.log(`📤 Callback ativado - Enviando para WhatsApp`);
          await enviarMensagemWhatsApp(sender, mensagem, imagemBuffer, nomeEmpresa);
        } catch (error) {
          console.error('❌ Erro no callback:', error);
        }
      };

      await searchInChrome('desbloqueio rep', true, telefoneLimpo, dadosREP, callbackResultado);

      console.log('✅ Navegação RHID concluída!');
    }
  } catch (error) {
    console.error('❌ Erro na navegação RHID:', error);
  }
}

// ✅ FUNÇÃO LEGADA (mantida para compatibilidade)
async function executarPesquisaEmSegundoPlano(query, sender, headless = false, telefone = null) {
  try {
    if (searchInChrome) {
      const resultado = await searchInChrome(query, headless, telefone);
      if (resultado.success) {
        console.log(`✅ Navegação concluída para: ${telefone || 'N/A'}`);
      }
    }
  } catch (error) {
    console.error('❌ Erro na navegação:', error);
  }
}

module.exports = handleMensagem;