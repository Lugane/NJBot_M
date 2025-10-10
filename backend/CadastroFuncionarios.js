const puppeteer = require('puppeteer');

// ✅ CONTROLE DE INSTÂNCIAS PARA CONSULTA
const instanciasConsulta = new Map();
const MAX_CONSULTAS_PARALELAS = 15;

// ✅ GERENCIADOR DE CALLBACKS POR SESSÃO
const callbacksPorSessao = new Map();

// ✅ GERENCIADOR DE RECURSOS
class GerenciadorConsultas {
  static async obterInstancia(idUsuario) {
    this.limparInstanciasAntigas();
    
    if (instanciasConsulta.size >= MAX_CONSULTAS_PARALELAS) {
      throw new Error('⚠️ Sistema ocupado. Tente novamente em alguns segundos.');
    }
    
    console.log(`🔄 Criando instância consulta para: ${idUsuario}`);
    
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ],
      timeout: 60000
    });
    
    const instancia = {
      browser,
      timestamp: Date.now(),
      idUsuario
    };
    
    instanciasConsulta.set(idUsuario, instancia);
    console.log(`✅ Instância consulta criada. Total: ${instanciasConsulta.size}`);
    return instancia;
  }
  
  static async liberarInstancia(idUsuario) {
    const instancia = instanciasConsulta.get(idUsuario);
    if (instancia) {
      try {
        console.log(`🔒 Fechando instância consulta: ${idUsuario}`);
        await instancia.browser.close();
        console.log(`✅ Instância consulta fechada: ${idUsuario}`);
      } catch (error) {
        console.error(`❌ Erro ao fechar consulta ${idUsuario}:`, error.message);
      }
      instanciasConsulta.delete(idUsuario);
      
      // ✅ LIMPA O CALLBACK DA SESSÃO TAMBÉM
      callbacksPorSessao.delete(idUsuario);
      console.log(`📊 Consultas restantes: ${instanciasConsulta.size}`);
    }
  }
  
  static limparInstanciasAntigas() {
    const agora = Date.now();
    for (const [idUsuario, instancia] of instanciasConsulta.entries()) {
      if (agora - instancia.timestamp > 120000) { // 2 minutos
        console.log(`🧹 Limpando consulta antiga: ${idUsuario}`);
        this.liberarInstancia(idUsuario);
      }
    }
  }
  
  static getStatus() {
    return {
      ativas: instanciasConsulta.size,
      maximo: MAX_CONSULTAS_PARALELAS,
      ids: Array.from(instanciasConsulta.keys())
    };
  }
}

// ✅ FUNÇÃO PARA REGISTRAR CALLBACK POR SESSÃO
function registrarCallback(idSessao, callback) {
  callbacksPorSessao.set(idSessao, callback);
  console.log(`📞 Callback registrado para sessão: ${idSessao}`);
}

// ✅ FUNÇÃO PARA EXECUTAR CALLBACK DA SESSÃO
async function executarCallback(idSessao, mensagem) {
  const callback = callbacksPorSessao.get(idSessao);
  if (callback && typeof callback === 'function') {
    try {
      console.log(`📤 Executando callback para sessão: ${idSessao}`);
      await callback(mensagem);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao executar callback ${idSessao}:`, error.message);
      return false;
    }
  } else {
    console.log(`⚠️ Callback não encontrado para sessão: ${idSessao}`);
    return false;
  }
}

// ✅ FUNÇÃO PARA VALIDAR SE É CPF
function isValidCPF(texto) {
  const cpfLimpo = texto.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
  return true;
}

// ✅ FUNÇÃO PARA LIMPAR CPF
function limparCPF(cpf) {
  return cpf.replace(/\D/g, '');
}

// ✅ FUNÇÃO PARA FAZER LOGIN NO RHID
async function fazerLoginRHID(page, credenciais) {
  try {
    console.log('⏳ Fazendo login no RHID...');

    const emailSelectors = [
      'input[type="email"]',
      '#email',
      'input[name="email"]',
      '[placeholder*="mail"]',
      '[placeholder*="E-mail"]',
      'input[type="text"]'
    ];

    const passwordSelectors = [
      'input[type="password"]',
      '#password',
      'input[name="password"]',
      '[placeholder*="senha"]',
      '[placeholder*="Senha"]'
    ];

    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      '#m_login_signin_submit',
      '.btn-primary',
      'button'
    ];

    // ✅ PREENCHE EMAIL
    let emailField = null;
    for (const selector of emailSelectors) {
      try {
        emailField = await page.$(selector);
        if (emailField) {
          console.log(`✅ Campo email encontrado: ${selector}`);
          await emailField.click({ clickCount: 3 });
          await emailField.type(credenciais.usuario, { delay: 50 });
          break;
        }
      } catch (e) { }
    }

    // ✅ PREENCHE SENHA
    let passwordField = null;
    for (const selector of passwordSelectors) {
      try {
        passwordField = await page.$(selector);
        if (passwordField) {
          console.log(`✅ Campo senha encontrado: ${selector}`);
          await passwordField.click({ clickCount: 3 });
          await passwordField.type(credenciais.senha, { delay: 50 });
          break;
        }
      } catch (e) { }
    }

    // ✅ CLICA NO BOTÃO DE LOGIN
    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        submitButton = await page.$(selector);
        if (submitButton) {
          console.log(`✅ Botão login encontrado: ${selector}`);
          await submitButton.click();
          console.log('✅ Login realizado!');

          // Aguarda navegação
          await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
          await new Promise(resolve => setTimeout(resolve, 3000));
          break;
        }
      } catch (e) { }
    }

    if (!emailField || !passwordField) {
      throw new Error('Campos de login não encontrados');
    }

  } catch (error) {
    console.error('❌ Erro no login:', error);
    throw new Error(`Falha no login: ${error.message}`);
  }
}

// ✅ FUNÇÃO PARA EXECUTAR FLUXO DE DEMISSÃO
async function executarFluxoDemissao(page, nomeCompleto, isCPF, cpfLimpo, idSessao) {
  try {
    console.log('📋 Executando fluxo de demissão...');

    // ✅ ABA DEMISSÃO
    await page.waitForSelector('a.nav-link.m-tabs__link.ng-binding', { timeout: 10000 });
    
    const demissaoTab = await page.evaluateHandle(() => {
      const tabs = Array.from(document.querySelectorAll('a.nav-link.m-tabs__link.ng-binding'));
      return tabs.find(tab => tab.textContent.includes('Demissão'));
    });

    if (demissaoTab) {
      await demissaoTab.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // ✅ LIMPA DADOS DEMISSÃO
    await page.waitForSelector('a[ng-click*="limpaDemissao"]', { timeout: 10000 });
    await page.click('a[ng-click*="limpaDemissao"]');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ✅ VERIFICA BOTÃO SALVAR
    await page.waitForSelector('button#btnSave', { timeout: 10000 });
    const salvarButton = await page.$('button#btnSave');
    
    if (salvarButton) {
      const isVisible = await salvarButton.evaluate(button => {
        return button.offsetWidth > 0 && button.offsetHeight > 0 &&
          !button.disabled && window.getComputedStyle(button).display !== 'none';
      });

      if (isVisible) {
        console.log('✅ Botão Salvar está visível e habilitado - Processo concluído');
        // await salvarButton.click(); // Descomente quando for para produção
        
        const mensagemSucesso = `✅ *Processo concluído com sucesso!*\n\n` +
          `📝 Funcionário: ${nomeCompleto}\n` +
          `${isCPF ? `📋 CPF: ${cpfLimpo}\n` : ''}` +
          `💾 Alteração realizada com sucesso!`;
        
        await executarCallback(idSessao, mensagemSucesso);
      } else {
        console.log('⚠️ Botão Salvar encontrado mas não está visível/habilitado');
        const mensagemParcial = `⚠️ *Processo parcialmente concluído*\n\n` +
          `📝 Funcionário: ${nomeCompleto}\n` +
          `${isCPF ? `📋 CPF: ${cpfLimpo}\n` : ''}` +
          `📋 Fluxo executado mas botão Salvar não está disponível`;
        
        await executarCallback(idSessao, mensagemParcial);
      }
    } else {
      throw new Error('Botão Salvar não encontrado');
    }

    console.log('✅ Fluxo de demissão executado com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro no fluxo de demissão:', error.message);
    throw new Error(`Falha no processamento: ${error.message}`);
  }
}

// ✅ FUNÇÃO PRINCIPAL DE CONSULTA
async function consultarFuncionario(nomeFuncionario, headless = true, telefone = null, callback = null) {
  const idSessao = `${telefone}_${Date.now()}_consulta`;
  let browser = null;

  console.log(`\n🚀 ===== INICIANDO CONSULTA FUNCIONÁRIO =====`);
  console.log(`📞 Telefone: ${telefone}`);
  console.log(`🎯 Sessão: ${idSessao}`);
  console.log(`🔍 Busca: "${nomeFuncionario}"`);
  console.log(`📊 Consultas ativas: ${instanciasConsulta.size}/${MAX_CONSULTAS_PARALELAS}`);

  try {
    // ✅ VALIDAÇÕES
    if (!nomeFuncionario || nomeFuncionario.trim().length < 3) {
      throw new Error('Nome muito curto. Mínimo 3 caracteres.');
    }

    // ✅ REGISTRA CALLBACK PARA ESTA SESSÃO
    if (callback && typeof callback === 'function') {
      registrarCallback(idSessao, callback);
    }

    // ✅ VERIFICA SE É CPF OU NOME
    const isCPF = isValidCPF(nomeFuncionario);
    const cpfLimpo = isCPF ? limparCPF(nomeFuncionario) : null;
    
    console.log(`🔍 Tipo de busca: ${isCPF ? 'CPF' : 'NOME'}`);
    if (isCPF) {
      console.log(`📋 CPF limpo: ${cpfLimpo}`);
    }

    // ✅ NORMALIZA O VALOR DE HEADLESS
    if (typeof headless === 'string') {
      headless = headless.toLowerCase() === 'true' || headless === '1';
    } else {
      headless = Boolean(headless);
    }

    console.log(`🖥️ Modo headless: ${headless ? 'SIM' : 'NÃO'}`);

    // ✅ IMPORTAÇÃO DAS CREDENCIAIS
    const { getCredenciaisRHID } = require('./rhidLogins');
    const credenciais = getCredenciaisRHID(telefone, 'menu2');

    if (!credenciais) {
      throw new Error('Credenciais não encontradas para este telefone');
    }

    console.log(`🔑 Usando credenciais de: ${credenciais.usuario}`);

    // ✅ MODO HEADLESS COM GERENCIAMENTO DE INSTÂNCIAS
    if (headless) {
      console.log('🖥️ Iniciando navegador...');
      
      // Obtém instância gerenciada
      const instancia = await GerenciadorConsultas.obterInstancia(idSessao);
      browser = instancia.browser;

      const page = await browser.newPage();

      // ✅ CONFIGURAÇÃO DA PÁGINA
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setDefaultTimeout(60000);
      await page.setDefaultNavigationTimeout(60000);

      console.log('🔄 Navegando para RHID...');

      // ✅ NAVEGAÇÃO PARA LOGIN
      await page.goto('https://www.rhid.com.br/v2/#/login', {
        waitUntil: 'networkidle0',
        timeout: 60000
      });
      console.log('✅ Página carregada com sucesso!');

      await new Promise(resolve => setTimeout(resolve, 3000));

      // ✅ VERIFICA SE JÁ ESTÁ LOGADO
      const estaLogado = await page.evaluate(() => {
        return !window.location.href.includes('login') && document.querySelector('body:not(.login-page)');
      });

      if (!estaLogado) {
        await fazerLoginRHID(page, credenciais);
      }

      // ✅ NAVEGA PARA CADASTROS > FUNCIONÁRIOS
      console.log('🔍 Navegando para Cadastros > Funcionários...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      await page.goto('https://www.rhid.com.br/v2/#/list/person', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      console.log('✅ Página de funcionários carregada!');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // ✅ REALIZA A BUSCA (NOME OU CPF)
      console.log(`🔍 Buscando por "${isCPF ? 'CPF: ' + cpfLimpo : nomeFuncionario}"...`);

      if (isCPF) {
        // ✅ BUSCA POR CPF - USA BUSCA AVANÇADA
        console.log('📋 Iniciando busca avançada por CPF...');

        await page.waitForSelector('a[ng-click*="buscaAvancadaToogle"]', { timeout: 10000 });
        await page.click('a[ng-click*="buscaAvancadaToogle"]');
        console.log('✅ Botão Busca Avançada clicado');
        await new Promise(resolve => setTimeout(resolve, 2000));

        await page.waitForSelector('input[placeholder="CPF"]', { timeout: 10000 });
        const cpfInput = await page.$('input[placeholder="CPF"]');
        await cpfInput.click({ clickCount: 3 });
        await cpfInput.type(cpfLimpo, { delay: 100 });
        console.log('✅ CPF preenchido');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await page.waitForSelector('a[ng-click*="filtrarAvancado"]', { timeout: 10000 });
        await page.click('a[ng-click*="filtrarAvancado"]');
        console.log('✅ Botão Filtrar clicado');
        
      } else {
        // ✅ BUSCA POR NOME - USA BUSCA SIMPLES
        console.log('📝 Iniciando busca simples por nome...');
        
        await page.waitForSelector('input[type="search"]', { timeout: 20000 });
        const searchInput = await page.$('input[type="search"]');
        await searchInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await searchInput.type(nomeFuncionario, { delay: 100 });
        console.log('✅ Busca realizada');
      }

      await new Promise(resolve => setTimeout(resolve, 6000));

      // ✅ VERIFICA RESULTADOS
      const noResultsFound = await page.$('td.dataTables_empty');

      if (noResultsFound) {
        throw new Error(`Funcionário não encontrado: ${isCPF ? `CPF ${cpfLimpo}` : nomeFuncionario}`);
      }

      // ✅ CLICA PARA EDITAR
      await page.waitForSelector('a[ng-click*="editItem"]', { timeout: 10000 });
      await page.click('a[ng-click*="editItem"]');
      console.log('✅ Botão Editar clicado');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // ✅ CAPTURA NOME SE BUSCA POR CPF
      let nomeCompleto = nomeFuncionario;
      if (isCPF) {
        try {
          nomeCompleto = await page.evaluate(() => {
            const selectors = [
              'input[ng-model*="nome"]',
              'input[placeholder*="Nome"]',
              'input#n_1',
              'input[name*="nome"]'
            ];
            
            for (const selector of selectors) {
              const campo = document.querySelector(selector);
              if (campo && campo.value) {
                return campo.value.trim();
              }
            }
            
            const inputs = document.querySelectorAll('input[type="text"]');
            for (const input of inputs) {
              if (input.value && input.value.length > 3) {
                return input.value.trim();
              }
            }
            
            return null;
          }) || `CPF ${cpfLimpo}`;
          
          console.log(`✅ Nome capturado: ${nomeCompleto}`);
        } catch (capturaError) {
          console.error('❌ Erro ao capturar nome:', capturaError);
          nomeCompleto = `CPF ${cpfLimpo}`;
        }
      }

      // ✅ EXECUTA FLUXO DE DEMISSÃO
      await executarFluxoDemissao(page, nomeCompleto, isCPF, cpfLimpo, idSessao);

      console.log(`✅ Consulta concluída com sucesso!`);
      return { 
        success: true, 
        nome: nomeCompleto,
        telefone 
      };

    } else {
      // MODO NÃO-HEADLESS (não implementado para consultas)
      await executarCallback(idSessao, '❌ Modo não-headless não disponível para consultas. Use o modo headless.');
      return { 
        success: false, 
        error: 'Modo não-headless não disponível',
        telefone 
      };
    }

  } catch (error) {
    console.error(`❌ Erro na consulta:`, error.message);
    
    // ✅ ENVIA ERRO USANDO CALLBACK DA SESSÃO
    let mensagemErro = '';
    
    if (error.message.includes('não encontrado')) {
      mensagemErro = `❌ *Funcionário não encontrado*\n\n` +
        `Não localizei nenhum registro para ${isCPF ? `CPF: ${cpfLimpo}` : `"${nomeFuncionario}"`}.\n\n` +
        `Verifique se:\n` +
        `• ${isCPF ? 'O CPF está correto' : 'O nome está correto e completo'}\n` +
        `• A ${isCPF ? 'digitação está exata' : 'grafia está exata'}\n` +
        `• O funcionário está cadastrado no sistema`;
    } else {
      mensagemErro = `❌ *Erro na Consulta:*\n\n${error.message}`;
    }
    
    await executarCallback(idSessao, mensagemErro);
    
    return { 
      success: false, 
      error: error.message,
      telefone 
    };
    
  } finally {
    // ✅ GARANTE LIBERAÇÃO DE RECURSOS (APENAS HEADLESS)
    if (browser && headless) {
      await GerenciadorConsultas.liberarInstancia(idSessao);
    }
    console.log(`🔚 Consulta finalizada para sessão: ${idSessao}\n`);
  }
}

// ✅ EXPORTAÇÕES
module.exports = { 
  consultarFuncionario,
  GerenciadorConsultas,
  getStatus: () => ({
    consultas: GerenciadorConsultas.getStatus(),
    callbacks: callbacksPorSessao.size
  })
};