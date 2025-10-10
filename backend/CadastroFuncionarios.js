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

// ✅ FUNÇÃO PARA VALIDAR CPF
function isValidCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  let resto;

  for (let i = 1; i <= 9; i++) {
    soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

// ✅ FUNÇÃO PARA DETECTAR TIPO DE BUSCA
function detectarTipoBusca(texto) {
  const textoLimpo = texto.replace(/\D/g, '');

  if (textoLimpo.length === 11 && isValidCPF(texto)) {
    return 'cpf';
  }

  if (textoLimpo.length >= 11 || (/^\d+$/.test(texto) && texto.length >= 11)) {
    return 'cpf_possivel';
  }

  return 'nome';
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

// ✅ FUNÇÃO PARA TENTATIVA DE BUSCA COM 3 TENTATIVAS
async function tentarBuscarFuncionario(page, tipoBusca, valorBusca, idSessao) {
  let tentativas = 0;
  const MAX_TENTATIVAS = 3;

  while (tentativas < MAX_TENTATIVAS) {
    tentativas++;
    console.log(`🔄 Tentativa ${tentativas}/${MAX_TENTATIVAS} para: ${valorBusca}`);

    try {
      // ✅ LIMPA BUSCA ANTERIOR
      try {
        await page.waitForSelector('input[type="search"]', { timeout: 5000 });
        const searchInput = await page.$('input[type="search"]');
        if (searchInput) {
          await searchInput.click({ clickCount: 3 });
          await page.keyboard.press('Backspace');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (e) {
        // Ignora erro se não encontrar campo de busca
      }

      if (tipoBusca === 'cpf' || tipoBusca === 'cpf_possivel') {
        // ✅ BUSCA POR CPF
        console.log('📋 Buscando por CPF...');

        // Tenta abrir busca avançada
        try {
          await page.waitForSelector('a[ng-click*="buscaAvancadaToogle"]', { timeout: 5000 });
          await page.click('a[ng-click*="buscaAvancadaToogle"]');
          console.log('✅ Busca Avançada aberta');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
          console.log('⚠️ Busca avançada não disponível');
        }

        // Preenche CPF
        const cpfSelectors = [
          'input[placeholder="CPF"]',
          'input[ng-model*="cpf"]',
          'input[name*="cpf"]'
        ];

        let cpfPreenchido = false;
        for (const selector of cpfSelectors) {
          try {
            const cpfInput = await page.$(selector);
            if (cpfInput) {
              await cpfInput.click({ clickCount: 3 });
              await cpfInput.type(valorBusca, { delay: 100 });
              console.log(`✅ CPF preenchido: ${selector}`);
              cpfPreenchido = true;
              await new Promise(resolve => setTimeout(resolve, 1000));
              break;
            }
          } catch (e) { }
        }

        if (!cpfPreenchido) {
          throw new Error('Campo CPF não encontrado');
        }

        // Aplica filtro
        const filtrarSelectors = [
          'a[ng-click*="filtrarAvancado"]',
          'button[type="submit"]',
          '.btn-primary'
        ];

        let filtrado = false;
        for (const selector of filtrarSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            await page.click(selector);
            console.log(`✅ Filtro aplicado: ${selector}`);
            filtrado = true;
            break;
          } catch (e) { }
        }

        if (!filtrado) {
          await page.keyboard.press('Enter');
          console.log('✅ Filtro aplicado com Enter');
        }

      } else {
        // ✅ BUSCA POR NOME
        console.log('📝 Buscando por nome...');

        await page.waitForSelector('input[type="search"]', { timeout: 10000 });
        const searchInput = await page.$('input[type="search"]');
        await searchInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await searchInput.type(valorBusca, { delay: 100 });
        console.log('✅ Nome preenchido');

        await page.keyboard.press('Enter');
      }

      // ✅ AGUARDA RESULTADOS
      await new Promise(resolve => setTimeout(resolve, 5000));

      // ✅ VERIFICA SE ENCONTROU RESULTADOS
      const noResultsFound = await page.evaluate(() => {
        const emptyElement = document.querySelector('td.dataTables_empty');
        return emptyElement && emptyElement.textContent.includes('Nenhum dado encontrado');
      });

      if (noResultsFound) {
        console.log(`❌ Nenhum resultado na tentativa ${tentativas}`);

        if (tentativas < MAX_TENTATIVAS) {
          console.log(`🔄 Tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        } else {
          // ÚLTIMA TENTATIVA FALHOU
          let mensagemErro = '';

          if (tipoBusca === 'cpf' || tipoBusca === 'cpf_possivel') {
            mensagemErro = `❌ *CPF não encontrado após ${MAX_TENTATIVAS} tentativas*\n\n` +
              `Não localizei nenhum registro para o CPF: *${valorBusca}*\n\n` +
              `Verifique se:\n` +
              `• O CPF está correto\n` +
              `• A digitação está exata\n` +
              `• O funcionário está cadastrado no sistema\n\n` +
              `*Digite o número 0 (zero) para retornar ao menu.*`;
          } else {
            mensagemErro = `❌ *Nome não encontrado após ${MAX_TENTATIVAS} tentativas*\n\n` +
              `Não localizei nenhum registro para: *"${valorBusca}"*\n\n` +
              `Verifique se:\n` +
              `• O nome está correto e completo\n` +
              `• A grafia está exata\n` +
              `• O funcionário está cadastrado no sistema\n\n` +
              `*Digite o número 0 (zero) para retornar ao menu.*`;
          }

          await executarCallback(idSessao, mensagemErro);
          throw new Error(`Funcionário não encontrado após ${MAX_TENTATIVAS} tentativas`);
        }
      } else {
        // ✅ ENCONTROU RESULTADOS - VERIFICA BOTÃO EDITAR
        console.log('✅ Resultados encontrados! Verificando botão editar...');

        const editarButton = await page.$('a[ng-click*="editItem"]');
        if (!editarButton) {
          console.log(`❌ Botão editar não encontrado na tentativa ${tentativas}`);

          if (tentativas < MAX_TENTATIVAS) {
            console.log(`🔄 Tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          } else {
            let mensagemErro = '';

            if (tipoBusca === 'cpf' || tipoBusca === 'cpf_possivel') {
              mensagemErro = `❌ *CPF encontrado mas não é possível editar*\n\n` +
                `Encontrei o CPF: *${valorBusca}* mas não consigo acessar os dados.\n\n` +
                `Possíveis causas:\n` +
                `• Permissões insuficientes\n` +
                `• Problema técnico no sistema`;
            } else {
              mensagemErro = `❌ *Nome encontrado mas não é possível editar*\n\n` +
                `Encontrei: *"${valorBusca}"* mas não consigo acessar os dados.\n\n` +
                `Possíveis causas:\n` +
                `• Permissões insuficientes\n` +
                `• Problema técnico no sistema`;
            }

            await executarCallback(idSessao, mensagemErro);
            throw new Error(`Botão editar não encontrado após ${MAX_TENTATIVAS} tentativas`);
          }
        }

        console.log(`✅ Busca bem-sucedida na tentativa ${tentativas}!`);
        return true;
      }

    } catch (error) {
      console.error(`❌ Erro na tentativa ${tentativas}:`, error.message);

      if (tentativas < MAX_TENTATIVAS) {
        console.log(`🔄 Tentando novamente...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Todas as ${MAX_TENTATIVAS} tentativas falharam`);
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
        await salvarButton.click();

        const mensagemSucesso = `✅ *Processo concluído com sucesso!*\n\n` +
          `📝 Funcionário: ${nomeCompleto}\n` +
          `${isCPF ? `📋 CPF: ${cpfLimpo}\n` : ''}` +
          `💾 Alteração realizada com sucesso!\n\n` +
          `*Digite o número 0 (zero) para retornar ao menu.*`;
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

    // ✅ DETECTA TIPO DE BUSCA
    const tipoBusca = detectarTipoBusca(nomeFuncionario);
    const valorBusca = tipoBusca === 'cpf' || tipoBusca === 'cpf_possivel'
      ? nomeFuncionario.replace(/\D/g, '')
      : nomeFuncionario.trim();

    console.log(`🔍 Tipo de busca: ${tipoBusca}`);
    console.log(`📋 Valor para busca: ${valorBusca}`);

    // ✅ NORMALIZA HEADLESS
    if (typeof headless === 'string') {
      headless = headless.toLowerCase() === 'true' || headless === '1';
    } else {
      headless = Boolean(headless);
    }

    console.log(`🖥️ Modo headless: ${headless ? 'SIM' : 'NÃO'}`);

    // ✅ CREDENCIAIS
    const { getCredenciaisRHID } = require('./rhidLogins');
    const credenciais = getCredenciaisRHID(telefone, 'menu2');

    if (!credenciais) {
      throw new Error('Credenciais não encontradas para este telefone');
    }

    console.log(`🔑 Usando credenciais de: ${credenciais.usuario}`);

    // ✅ MODO HEADLESS
    if (headless) {
      console.log('🖥️ Iniciando navegador...');

      const instancia = await GerenciadorConsultas.obterInstancia(idSessao);
      browser = instancia.browser;

      const page = await browser.newPage();

      // ✅ CONFIGURAÇÃO DA PÁGINA
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setDefaultTimeout(60000);
      await page.setDefaultNavigationTimeout(60000);

      console.log('🔄 Navegando para RHID...');
      await page.goto('https://www.rhid.com.br/v2/#/login', {
        waitUntil: 'networkidle0',
        timeout: 60000
      });
      console.log('✅ Página carregada!');

      await new Promise(resolve => setTimeout(resolve, 3000));

      // ✅ VERIFICA SE JÁ ESTÁ LOGADO
      const estaLogado = await page.evaluate(() => {
        return !window.location.href.includes('login') && document.querySelector('body:not(.login-page)');
      });

      if (!estaLogado) {
        await fazerLoginRHID(page, credenciais);
      }

      // ✅ NAVEGA PARA FUNCIONÁRIOS
      console.log('🔍 Navegando para Funcionários...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      await page.goto('https://www.rhid.com.br/v2/#/list/person', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      console.log('✅ Página de funcionários carregada!');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // ✅ REALIZA BUSCA COM TENTATIVAS
      console.log(`🔍 Iniciando busca por "${valorBusca}"...`);
      await tentarBuscarFuncionario(page, tipoBusca, valorBusca, idSessao);

      // ✅ CLICA PARA EDITAR
      await page.waitForSelector('a[ng-click*="editItem"]', { timeout: 10000 });
      await page.click('a[ng-click*="editItem"]');
      console.log('✅ Botão Editar clicado');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // ✅ CAPTURA NOME SE BUSCA POR CPF
      let nomeCompleto = nomeFuncionario;
      if (tipoBusca === 'cpf' || tipoBusca === 'cpf_possivel') {
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

            return null;
          }) || `CPF ${valorBusca}`;

          console.log(`✅ Nome capturado: ${nomeCompleto}`);
        } catch (capturaError) {
          console.error('❌ Erro ao capturar nome:', capturaError);
          nomeCompleto = `CPF ${valorBusca}`;
        }
      }

      // ✅ EXECUTA FLUXO DE DEMISSÃO
      await executarFluxoDemissao(page, nomeCompleto, (tipoBusca === 'cpf' || tipoBusca === 'cpf_possivel'), valorBusca, idSessao);

      console.log(`✅ Consulta concluída com sucesso!`);
      return {
        success: true,
        nome: nomeCompleto,
        telefone
      };

    } else {
      // MODO NÃO-HEADLESS
      await executarCallback(idSessao, '❌ Modo não-headless não disponível para consultas.');
      return {
        success: false,
        error: 'Modo não-headless não disponível',
        telefone
      };
    }

  } catch (error) {
    console.error(`❌ Erro na consulta:`, error.message);

    // ✅ ENVIA ERRO SE AINDA NÃO FOI ENVIADO
    if (!error.message.includes('não encontrado após') &&
      !error.message.includes('não é possível editar')) {

      let mensagemErro = `❌ *Erro na Consulta:*\n\n${error.message}`;
      await executarCallback(idSessao, mensagemErro);
    }

    return {
      success: false,
      error: error.message,
      telefone
    };

  } finally {
    // ✅ LIBERA RECURSOS
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