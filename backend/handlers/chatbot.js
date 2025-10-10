// backend/handlers/chatbot.js
const Empresa = require('../models/Empresa');
const { gerarRespostaGemini } = require('../gemini');
const { processarImagemOCR, gerarRespostaOCR } = require('./ocrHandler');
const { enviarMensagemParaContato } = require('../botManager');

// Importação condicional dos módulos
let searchInChrome;
let consultarFuncionario;

try {
  const chromeModule = require('../DesbloqueioREP');
  searchInChrome = chromeModule.searchInChrome;
} catch (error) {
  console.log('⚠️ Módulo DesbloqueioREP não encontrado');
  searchInChrome = null;
}

try {
  const funcionarioModule = require('../CadastroFuncionarios');
  consultarFuncionario = funcionarioModule.consultarFuncionario;
  console.log('✅ Módulo CadastroFuncionarios carregado.');
} catch (err) {
  console.error('❌ Erro ao carregar CadastroFuncionarios:', err.message);
  consultarFuncionario = null;
}

// Variáveis para controle de estado da conversa
const usuariosEmFluxoREP = new Map();
const usuariosEmConsultaFuncionario = new Map();

/**
 * FUNÇÃO PRINCIPAL - Processa todas as mensagens recebidas
 */
async function handleMensagem(empresaId, mensagemUsuario, sender = null, isMedia = false, mediaBuffer = null) {
  try {
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return { resposta: '⚠️ Empresa não encontrada.' };
    }

    // ✅ 1. VERIFICA SE É UMA IMAGEM DO REP
    if (isMedia && mediaBuffer) {
      return await processarImagemREP(mediaBuffer, sender, empresaId);
    }

    // ✅ 2. VERIFICA SE USUÁRIO ESTÁ EM FLUXO DE CONSULTA DE FUNCIONÁRIO
    if (usuariosEmConsultaFuncionario.has(sender)) {
      return await processarConsultaFuncionario(mensagemUsuario, sender, empresa);
    }

    // ✅ 3. VERIFICA SE USUÁRIO ESTÁ EM FLUXO DE DESBLOQUEIO REP
    if (usuariosEmFluxoREP.has(sender)) {
      return await processarFluxoREP(mensagemUsuario, sender);
    }

    // ✅ 4. VERIFICA SE É PROBLEMA NO PONTO (ativa fluxo)
    const resultadoProblemaPonto = await verificarProblemaPonto(mensagemUsuario, sender);
    if (resultadoProblemaPonto.deveResponder) {
      return { resposta: resultadoProblemaPonto.resposta };
    }

    // ✅ 5. VERIFICA SE É CONSULTA DE FUNCIONÁRIO (ativa fluxo)
    const resultadoConsultaFuncionario = await verificarConsultaFuncionario(mensagemUsuario, sender);
    if (resultadoConsultaFuncionario.deveResponder) {
      return { resposta: resultadoConsultaFuncionario.resposta };
    }

    // ✅ 6. USA IA GEMINI PARA OUTRAS MENSAGENS
    return await processarMensagemIA(mensagemUsuario, empresa);

  } catch (error) {
    console.error('❌ Erro no handleMensagem:', error);
    return { resposta: '⚠️ Ocorreu um erro ao processar sua mensagem.' };
  }
}

/**
 * PROCESSAR IMAGEM DO REP
 */
async function processarImagemREP(mediaBuffer, sender, empresaId) {
  try {
    console.log('📸 Processando imagem do REP...');

    const resultadoOCR = await processarImagemOCR(mediaBuffer);

    if (resultadoOCR.sucesso && resultadoOCR.dadosREP.numeroREP && resultadoOCR.dadosREP.senha) {
      // ✅ DADOS COMPLETOS - EXECUTA DESBLOQUEIO
      const telefoneLimpo = sender ? sender.replace('@s.whatsapp.net', '').replace(/\D/g, '') : null;
      const empresa = await Empresa.findById(empresaId);
      const nomeEmpresa = empresa ? empresa.nome : null;

      usuariosEmFluxoREP.delete(sender);

      if (searchInChrome && nomeEmpresa) {
        executarDesbloqueioREP(sender, telefoneLimpo, resultadoOCR.dadosREP, nomeEmpresa);
      }

      return {
        resposta: `✅ *Dados identificados com sucesso!*\n\n` +
          `🔢 *REP:* ${resultadoOCR.dadosREP.numeroREP}\n` +
          `🔑 *Senha:* ${resultadoOCR.dadosREP.senha}\n\n` +
          `🔄 *Processando desbloqueio...*\n` +
          `_Aguarde aproximadamente 1 minuto_`
      };
    } else {
      // ❌ DADOS INCOMPLETOS - MANTÉM NO FLUXO
      return await processarImagemIncompleta(resultadoOCR, sender);
    }

  } catch (error) {
    console.error('❌ Erro ao processar imagem REP:', error);
    return await processarErroImagem(sender);
  }
}

/**
 * PROCESSAR IMAGEM COM DADOS INCOMPLETOS
 */
async function processarImagemIncompleta(resultadoOCR, sender) {
  let usuarioFluxo = usuariosEmFluxoREP.get(sender) || {
    etapa: 'aguardando_imagem',
    tentativas: 0,
    dados: {}
  };

  usuarioFluxo.tentativas += 1;
  usuariosEmFluxoREP.set(sender, usuarioFluxo);

  let resposta = '';
  const temDadosParciais = resultadoOCR.dadosREP.numeroREP || resultadoOCR.dadosREP.senha;

  if (temDadosParciais) {
    resposta = `📋 *Dados parciais identificados:*\n\n`;
    if (resultadoOCR.dadosREP.numeroREP) {
      resposta += `✅ REP: ${resultadoOCR.dadosREP.numeroREP}\n`;
    } else {
      resposta += `❌ REP: Não identificado\n`;
    }

    if (resultadoOCR.dadosREP.senha) {
      resposta += `✅ Senha: ${resultadoOCR.dadosREP.senha}\n`;
    } else {
      resposta += `❌ Senha: Não identificada\n`;
    }

    resposta += `\n📸 *Envie outra foto mais nítida* para completar os dados.`;
  } else {
    resposta = `❌ *Não consegui identificar os dados do REP*\n\n` +
      `📸 *Por favor, envie outra foto mais nítida* mostrando:\n` +
      `• Número do REP (15-18 dígitos)\n` +
      `• Senha/Contra Senha (10 dígitos)\n\n` +
      `💡 *Dica:* Garanta boa iluminação e foco na área dos números.`;
  }

  // ✅ VERIFICA MÁXIMO DE TENTATIVAS
  if (usuarioFluxo.tentativas >= 3) {
    usuariosEmFluxoREP.delete(sender);
    resposta += `\n\n⚠️ *Máximo de tentativas atingido (3).*\n` +
      `_Entre em contato com o suporte técnico para assistência personalizada._`;
  } else {
    resposta += `\n\n🔄 _Tentativa ${usuarioFluxo.tentativas} de 3_`;
  }

  return { resposta };
}

/**
 * PROCESSAR ERRO NA IMAGEM
 */
async function processarErroImagem(sender) {
  let usuarioFluxo = usuariosEmFluxoREP.get(sender) || {
    etapa: 'aguardando_imagem',
    tentativas: 0,
    dados: {}
  };

  usuarioFluxo.tentativas += 1;
  usuariosEmFluxoREP.set(sender, usuarioFluxo);

  let resposta = '❌ *Erro ao processar a imagem*\n\n';

  if (usuarioFluxo.tentativas < 3) {
    resposta += `📸 *Envie outra foto mais nítida* do REP.\n\n` +
      `🔄 _Tentativa ${usuarioFluxo.tentativas} de 3_`;
  } else {
    usuariosEmFluxoREP.delete(sender);
    resposta += `⚠️ *Máximo de tentativas atingido.*\n` +
      `_Entre em contato com o suporte técnico para assistência adicional._`;
  }

  return { resposta };
}

/**
 * VERIFICAR PROBLEMAS NO PONTO
 */
async function verificarProblemaPonto(mensagem, sender) {
  const texto = mensagem.toLowerCase().trim();

  const palavrasProblemaPonto = [
    'não acessa', 'ponto não acessa', 'ponto parou', 'ponto bloqueado',
    'problema no ponto', 'problema ponto', 'ponto com erro', 'erro no ponto',
    'rep bloqueado', 'rep não funciona', '1602', '1603', 'desbloquear rep',
    'rep travado', 'ponto travado', 'desbloqueio'
  ];

  const deveAtivarFluxo = palavrasProblemaPonto.some(palavra => texto.includes(palavra));

  if (!deveAtivarFluxo) {
    return { deveResponder: false };
  }

  // ✅ ATIVA O FLUXO DE DESBLOQUEIO
  usuariosEmFluxoREP.set(sender, {
    etapa: 'aguardando_imagem',
    tentativas: 0,
    dados: {}
  });

  return {
    deveResponder: true,
    resposta: `🔧 **Identifiquei um problema no ponto!**\n\n` +
      `📸 **Para ajudar, preciso que você envie uma FOTO do REP** mostrando:\n\n` +
      `• **Número do REP** (15-18 dígitos)\n` +
      `• **Senha/Contra Senha** (10 dígitos)\n\n` +
      `_Com essas informações, posso acessar o sistema e ajudar no desbloqueio!_`
  };
}

/**
 * VERIFICAR CONSULTA DE FUNCIONÁRIO
 */
async function verificarConsultaFuncionario(mensagem, sender) {
  const texto = mensagem.toLowerCase().trim();

  const palavrasConsultaFuncionario = [
    'consultar funcionário', 'dados do funcionário', 'matrícula',
    'cargo', 'dados cadastrais', 'informações do funcionário',
    'funcionário', 'colaborador', 'ficha do funcionário'
  ];

  const deveAtivarFluxo = palavrasConsultaFuncionario.some(palavra => texto.includes(palavra));

  if (!deveAtivarFluxo) {
    return { deveResponder: false };
  }

  // ✅ ATIVA O FLUXO DE CONSULTA
  usuariosEmConsultaFuncionario.set(sender, {
    etapa: 'aguardando_nome',
    tentativas: 0
  });

  return {
    deveResponder: true,
    resposta: `👤 **Consulta de Funcionário**\n\n` +
      `📝 Por favor, digite o *nome completo* do funcionário que deseja consultar:`
  };
}

/**
 * PROCESSAR CONSULTA DE FUNCIONÁRIO
 */
async function processarConsultaFuncionario(mensagem, sender, empresa) {
  const fluxoUsuario = usuariosEmConsultaFuncionario.get(sender);

  if (fluxoUsuario.etapa === 'aguardando_nome') {
    const nomeFuncionario = mensagem.trim();

    if (nomeFuncionario.length < 3) {
      fluxoUsuario.tentativas += 1;

      if (fluxoUsuario.tentativas >= 3) {
        usuariosEmConsultaFuncionario.delete(sender);
        return {
          resposta: `❌ *Máximo de tentativas atingido*\n\n` +
            `Por favor, use o menu para tentar novamente.`
        };
      }

      return {
        resposta: `❌ *Nome muito curto*\n\n` +
          `Digite o *nome completo* do funcionário (mínimo 3 caracteres):\n` +
          `_Tentativa ${fluxoUsuario.tentativas} de 3_`
      };
    }

    // ✅ REMOVE DO FLUXO E EXECUTA CONSULTA
    usuariosEmConsultaFuncionario.delete(sender);

    const telefoneLimpo = sender ? sender.replace('@s.whatsapp.net', '').replace(/\D/g, '') : null;

    if (consultarFuncionario && empresa.nome && telefoneLimpo) {
      executarConsultaFuncionario(sender, telefoneLimpo, nomeFuncionario, empresa.nome);
    }

    return {
      resposta: `🔍 **Consultando dados de:** ${nomeFuncionario}\n\n` +
        `📊 Estou buscando as informações no sistema...\n` +
        `⏳ _Aguarde 1 minuto e lhe retorno da realização do processo_`
    };
  }

  // ✅ LIMPA FLUXO SE NÃO RECONHECIDO
  usuariosEmConsultaFuncionario.delete(sender);
  return { deveResponder: false };
}

/**
 * PROCESSAR FLUXO REP ATIVO
 */
async function processarFluxoREP(mensagem, sender) {
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

  // ✅ LIMPA FLUXO SE NÃO RECONHECIDO
  usuariosEmFluxoREP.delete(sender);
  return { deveResponder: false };
}

/**
 * PROCESSAR MENSAGEM COM IA GEMINI
 */
async function processarMensagemIA(mensagemUsuario, empresa) {
  try {
    const promptCompleto = `${empresa.promptIA}\nUsuário: ${mensagemUsuario}\nIA:`;
    const respostaIA = await gerarRespostaGemini(promptCompleto, mensagemUsuario);

    return {
      resposta: respostaIA
    };
  } catch (error) {
    console.error('❌ Erro ao gerar resposta IA:', error);
    return {
      resposta: `🤖 **Assistente Lugane AI**\n\n` +
        `No momento, estou com dificuldades técnicas.\n` +
        `Por favor, tente novamente ou entre em contato com o suporte.`
    };
  }
}

/**
 * EXECUTAR DESBLOQUEIO REP
 */
// ✅ FUNÇÕES DE EXECUÇÃO OTIMIZADAS
async function executarDesbloqueioREP(sender, telefoneLimpo, dadosREP, nomeEmpresa) {
  try {
    if (searchInChrome) {
      console.log(`🌐 Iniciando desbloqueio REP em background: ${telefoneLimpo}`);

      const callbackResultado = async (mensagem) => {
        try {
          console.log(`📤 Enviando resultado desbloqueio: ${telefoneLimpo}`);
          await enviarMensagemWhatsApp(sender, mensagem, null, nomeEmpresa);
        } catch (error) {
          console.error('❌ Erro callback desbloqueio:', error);
          // Fallback
          await enviarMensagemWhatsApp(
            sender,
            '✅ Processo de desbloqueio concluído. Verifique o sistema.',
            null,
            nomeEmpresa
          );
        }
      };

      // ✅ EXECUTA EM BACKGROUND SEM BLOQUEAR
      searchInChrome('desbloqueio rep', true, telefoneLimpo, dadosREP, callbackResultado)
        .then(resultado => {
          console.log(`✅ Desbloqueio finalizado: ${telefoneLimpo}`, resultado.success);
        })
        .catch(async (error) => {
          console.error('❌ Erro execução desbloqueio:', error);
          await enviarMensagemWhatsApp(
            sender,
            '❌ Erro no processamento do desbloqueio. Tente novamente.',
            null,
            nomeEmpresa
          );
        });

    } else {
      throw new Error('Módulo DesbloqueioREP não disponível');
    }

  } catch (error) {
    console.error('❌ Erro desbloqueio REP:', error);
    await enviarMensagemWhatsApp(
      sender,
      '❌ Serviço temporariamente indisponível. Tente novamente em alguns minutos.',
      null,
      nomeEmpresa
    );
  }
}

async function executarConsultaFuncionario(sender, telefoneLimpo, nomeFuncionario, nomeEmpresa) {
  try {
    if (consultarFuncionario) {
      console.log(`👤 Iniciando consulta funcionário em background: ${telefoneLimpo}`);

      const callbackResultado = async (mensagem) => {
        try {
          console.log(`📤 Enviando resultado consulta: ${telefoneLimpo}`);
          await enviarMensagemWhatsApp(sender, mensagem, null, nomeEmpresa);
        } catch (error) {
          console.error('❌ Erro callback consulta:', error);
          await enviarMensagemWhatsApp(
            sender,
            '✅ Processo de consulta concluído.',
            null,
            nomeEmpresa
          );
        }
      };

      // ✅ EXECUTA EM BACKGROUND
      consultarFuncionario(nomeFuncionario, true, telefoneLimpo, callbackResultado)
        .then(resultado => {
          console.log(`✅ Consulta finalizada: ${telefoneLimpo}`, resultado.success);
        })
        .catch(async (error) => {
          console.error('❌ Erro execução consulta:', error);
          await enviarMensagemWhatsApp(
            sender,
            '❌ Erro na consulta. Tente novamente.',
            null,
            nomeEmpresa
          );
        });

    } else {
      throw new Error('Módulo CadastroFuncionarios não disponível');
    }

  } catch (error) {
    console.error('❌ Erro consulta funcionário:', error);
    await enviarMensagemWhatsApp(
      sender,
      '❌ Serviço de consulta indisponível. Tente novamente em alguns minutos.',
      null,
      nomeEmpresa
    );
  }
}

/**
 * ENVIAR MENSAGEM VIA WHATSAPP
 */
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

// ✅ EXPORTAÇÕES PARA INTEGRAÇÃO COM BOTMANAGER
module.exports = handleMensagem;
module.exports.usuariosEmFluxoREP = usuariosEmFluxoREP;
module.exports.usuariosEmConsultaFuncionario = usuariosEmConsultaFuncionario;