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
  
  // TODAS AS PALAVRAS-CHAVE QUE ATIVAM A NAVEGAÇÃO:
  const palavrasPesquisa = [
    // Pesquisa básica
    // 'pesquisar', 'pesquise', 'buscar', 'procure', 'encontre', 'ache',
    // 'search', 'find', 'lookup',
    
    // Navegadores/sites
    'google', 'navegador', 'chrome', 'internet', 'web', 'site',
    'safari', 'firefox', 'edge', 'explorer',
    
    // Ações de navegação
    // 'abrir', 'acessar', 'navegar', 'visitar', 'ir para', 'vá para',
    // 'mostrar', 'ver', 'exibir', 'mostre', 'veja',
    
    // Tipos de conteúdo
    // 'site', 'página', 'página web', 'website', 'endereço', 'url',
    // 'link', 'online', 'na web'
  ];
  
  const devePesquisar = palavrasPesquisa.some(palavra => texto.includes(palavra));
  
  if (!devePesquisar || !searchInChrome) {
    return { deveResponder: false };
  }
  
  // Extrai o termo de pesquisa
  let query = extrairQueryDePesquisa(mensagem, palavrasPesquisa);
  
  if (!query) {
    return { 
      deveResponder: true, 
      resposta: '🔍 Por favor, especifique o que você gostaria que eu pesquise.\n\nExemplo: "pesquisar receitas de bolo" ou "abrir site do YouTube"' 
    };
  }
  
  console.log(`🔍 Query extraída: "${query}"`);
  
  try {
    console.log(`🔍 Iniciando pesquisa no Chrome VISUAL para: "${query}"`);
    
    // Executa a pesquisa em segundo plano - COM CHROME VISUAL
    if (searchInChrome) {
      executarPesquisaEmSegundoPlano(query, sender, false); // false = Chrome VISUAL
    }
    
    return { 
      deveResponder: true, 
      resposta: `🔍 **Abrindo Chrome VISUAL:**\n"${query}"\n\n📝 Estou abrindo o navegador e buscando as informações para você...\n\n_Verifique a tela do computador!_` 
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

// Função atualizada com parâmetro headless
async function executarPesquisaEmSegundoPlano(query, sender, headless = false) {
  try {
    const resultado = await searchInChrome(query, headless);
    
    if (resultado.success) {
      console.log(`✅ Pesquisa no Chrome VISUAL concluída: ${resultado.title}`);
      console.log(`📋 Resultado:\nTítulo: ${resultado.title}\nURL: ${resultado.url}`);
    } else {
      console.error(`❌ Falha na pesquisa: ${resultado.error}`);
    }
    
  } catch (error) {
    console.error('❌ Erro na pesquisa em segundo plano:', error);
  }
}

module.exports = handleMensagem;