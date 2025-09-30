// backend/handlers/chatbot.js
const Empresa = require('../models/Empresa');
const { gerarRespostaGemini } = require('../gemini');

// Importação condicional para evitar erro de módulo
let searchInChrome;
try {
  const chromeModule = require('../chromeAutomation');
  searchInChrome = chromeModule.searchInChrome;
} catch (error) {
  console.log('⚠️ Módulo chromeAutomation não encontrado, funcionalidade de pesquisa desativada');
  searchInChrome = null;
}

async function handleMensagem(empresaId, mensagemUsuario, sender = null) {
  try {
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return { resposta: '⚠️ Empresa não encontrada.' };

    // Primeiro verifica se é um comando de pesquisa
    const resultadoPesquisa = await processarComandoPesquisa(mensagemUsuario, sender);
    if (resultadoPesquisa.deveResponder) {
      return { resposta: resultadoPesquisa.resposta };
    }

    // Se não for pesquisa, usa a IA normal
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

// Função para processar comandos de pesquisa
async function processarComandoPesquisa(mensagem, sender) {
  const texto = mensagem.toLowerCase().trim();
  
  // PALAVRAS-CHAVE QUE ATIVAM A NAVEGAÇÃO:
  const palavrasPesquisa = [
    'pesquisar', 'pesquise', 'buscar', 'procure', 'encontre', 'ache',
    'search', 'google', 'navegador', 'chrome', 'internet', 'web', 'site',
    'rhid', 'login', 'acessar', 'entrar', 'sistema', 'portal'
  ];
  
  const devePesquisar = palavrasPesquisa.some(palavra => texto.includes(palavra));
  
  if (!devePesquisar || !searchInChrome) {
    return { deveResponder: false };
  }
  
  // Extrai o termo de pesquisa
  let query = extrairQueryDePesquisa(mensagem, palavrasPesquisa);
  
  // Extrai o telefone do sender para RHID
  const telefone = sender ? sender.replace('@s.whatsapp.net', '') : null;
  const telefoneFormatado = telefone ? `+${telefone.substring(0, 2)} ${telefone.substring(2, 4)} ${telefone.substring(4, 8)}-${telefone.substring(8)}` : 'N/A';
  
  console.log(`📱 Telefone detectado: ${telefoneFormatado}`);
  
  if (!query && !texto.includes('rhid') && !texto.includes('login')) {
    return { 
      deveResponder: true, 
      resposta: '🔍 Por favor, especifique o que você gostaria que eu pesquise.\n\nExemplo: "pesquisar receitas de bolo" ou "rhid login"' 
    };
  }
  
  console.log(`🔍 Query extraída: "${query}"`);
  
  try {
    console.log(`🔍 Iniciando navegação para: "${query || 'RHID'}"`);
    
    // Executa a pesquisa em segundo plano passando o telefone
    if (searchInChrome) {
      executarPesquisaEmSegundoPlano(query || 'rhid login', sender, false, telefone);
    }
    
    // Para RHID, busca credenciais
    let resposta = `🔍 **Abrindo Navegador:**\n\n`;
    
    if (texto.includes('rhid') || texto.includes('login')) {
      const { getCredenciaisRHID } = require('../rhidLogins');
      const credenciais = telefone ? getCredenciaisRHID(telefone) : null;
      
      resposta += `📱 Baseado no telefone: ${telefoneFormatado}\n\n`;
      
      if (credenciais) {
        resposta += `✅ **Credenciais encontradas!**\n`;
        resposta += `👤 Usuário: ${credenciais.usuario}\n`;
        resposta += `🔒 Senha: ${'*'.repeat(credenciais.senha.length)}\n\n`;
        resposta += `🔄 **Login automático ativado!**\n`;
        resposta += `O sistema vai preencher automaticamente os campos de login.`;
      } else {
        resposta += `⚠️ **Credenciais não encontradas**\n`;
        resposta += `Entre em contato com o administrador para cadastrar seu telefone.`;
      }
    } else {
      resposta += `🌐 Pesquisando: "${query}"\n\n`;
      resposta += `📝 Estou abrindo o navegador com sua pesquisa...`;
    }
    
    return { 
      deveResponder: true, 
      resposta: resposta
    };
    
  } catch (error) {
    console.error('❌ Erro ao processar pesquisa:', error);
    return { 
      deveResponder: true, 
      resposta: `⚠️ Erro ao abrir navegador: ${error.message}` 
    };
  }
}

// Função para extrair a query
function extrairQueryDePesquisa(mensagem, palavrasPesquisa) {
  let query = mensagem.trim();
  
  // Remove palavras de comando
  palavrasPesquisa.forEach(palavra => {
    const regex = new RegExp(`\\b${palavra}\\b`, 'gi');
    query = query.replace(regex, '');
  });
  
  // Remove palavras comuns
  const palavrasParaRemover = ['por', 'sobre', 'no', 'na', 'sobre o', 'sobre a', 'o site', 'a página'];
  palavrasParaRemover.forEach(palavra => {
    if (query.toLowerCase().startsWith(palavra + ' ')) {
      query = query.substring(palavra.length).trim();
    }
  });
  
  // Limpa a query
  query = query.replace(/["']/g, '').trim();
  query = query.replace(/[.,!?;:]+$/, '').trim();
  
  return query;
}

// Função para executar pesquisa
async function executarPesquisaEmSegundoPlano(query, sender, headless = false, telefone = null) {
  try {
    const resultado = await searchInChrome(query, headless, telefone);
    
    if (resultado.success) {
      console.log(`✅ Navegação concluída para: ${telefone || 'N/A'}`);
      if (resultado.credenciais) {
        console.log(`🔑 Credenciais carregadas: ${resultado.credenciais.usuario}`);
      }
    } else {
      console.error(`❌ Falha na navegação: ${resultado.error}`);
    }
    
  } catch (error) {
    console.error('❌ Erro na navegação em segundo plano:', error);
  }
}

// EXPORTE CORRETO - SEM PARÊNTESES, SEM CHAVES
module.exports = handleMensagem;