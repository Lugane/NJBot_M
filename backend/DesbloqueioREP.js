const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const puppeteer = require('puppeteer');
const { getCredenciaisRHID } = require('./rhidLogins');

// ✅ CONTROLE DE INSTÂNCIAS ATIVAS
const instanciasAtivas = new Map();
const MAX_INSTANCIAS_PARALELAS = 15;

// ✅ GERENCIADOR DE CALLBACKS POR SESSÃO
const callbacksPorSessao = new Map();

// ✅ GERENCIADOR DE RECURSOS
class GerenciadorInstancias {
  static async obterInstancia(idUsuario) {
    this.limparInstanciasAntigas();
    
    if (instanciasAtivas.size >= MAX_INSTANCIAS_PARALELAS) {
      throw new Error('⚠️ Sistema ocupado. Tente novamente em alguns segundos.');
    }
    
    console.log(`🔄 Criando nova instância para: ${idUsuario}`);
    
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
    
    instanciasAtivas.set(idUsuario, instancia);
    console.log(`✅ Instância criada. Total ativo: ${instanciasAtivas.size}`);
    return instancia;
  }
  
  static async liberarInstancia(idUsuario) {
    const instancia = instanciasAtivas.get(idUsuario);
    if (instancia) {
      try {
        console.log(`🔒 Fechando instância: ${idUsuario}`);
        await instancia.browser.close();
        console.log(`✅ Instância fechada: ${idUsuario}`);
      } catch (error) {
        console.error(`❌ Erro ao fechar browser ${idUsuario}:`, error.message);
      }
      instanciasAtivas.delete(idUsuario);
      
      // ✅ LIMPA O CALLBACK DA SESSÃO TAMBÉM
      callbacksPorSessao.delete(idUsuario);
      console.log(`📊 Instâncias restantes: ${instanciasAtivas.size}`);
    }
  }
  
  static limparInstanciasAntigas() {
    const agora = Date.now();
    const TIMEOUT_INSTANCIA = 120000; // 2 minutos
    
    for (const [idUsuario, instancia] of instanciasAtivas.entries()) {
      if (agora - instancia.timestamp > TIMEOUT_INSTANCIA) {
        console.log(`🧹 Limpando instância antiga: ${idUsuario}`);
        this.liberarInstancia(idUsuario);
      }
    }
  }
  
  static getStatus() {
    return {
      ativas: instanciasAtivas.size,
      maximo: MAX_INSTANCIAS_PARALELAS,
      ids: Array.from(instanciasAtivas.keys())
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

// FUNÇÃO PARA FAZER LOGIN NO RHID
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

    let emailField, passwordField;

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

    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        submitButton = await page.$(selector);
        if (submitButton) {
          console.log(`✅ Botão login encontrado: ${selector}`);
          await submitButton.click();
          console.log('✅ Login realizado!');

          await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
          await new Promise(resolve => setTimeout(resolve, 3000));
          break;
        }
      } catch (e) { }
    }

  } catch (error) {
    console.log('⚠️ Erro no login:', error.message);
    throw error;
  }
}

// FUNÇÃO PARA CLICAR NO MENU UTILITÁRIOS
async function clicarMenuUtilitarios(page) {
  try {
    console.log('🔍 Buscando menu Utilitários...');

    const utilitiesMenuSelectors = [
      'span.m-menu__link-text:contains("Utilitários")',
      '//span[contains(text(), "Utilitários")]',
      '.m-menu__link-text:contains("Utilitários")'
    ];

    for (const selector of utilitiesMenuSelectors) {
      try {
        if (selector.startsWith('//')) {
          const elements = await page.$x(selector);
          if (elements.length > 0) {
            await elements[0].click();
            console.log('✅ Menu Utilitários clicado!');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
          }
        } else {
          const element = await page.evaluateHandle((sel) => {
            const elements = Array.from(document.querySelectorAll('span.m-menu__link-text'));
            return elements.find(el => el.textContent.includes('Utilitários'));
          });
          if (element && (await element.evaluate(el => el !== null))) {
            await element.click();
            console.log('✅ Menu Utilitários clicado!');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
          }
        }
      } catch (error) { }
    }
    console.log('⚠️ Menu Utilitários não encontrado');
    return false;
  } catch (error) {
    console.log('⚠️ Erro ao clicar menu Utilitários:', error.message);
    return false;
  }
}

// FUNÇÃO PARA CLICAR NO SUBMENU DESBLOQ. REP
async function clicarSubmenuDesbloqREP(page) {
  try {
    console.log('🔍 Buscando submenu Desbloq. REP...');

    const desbloqRepSelectors = [
      'span.m-menu__link-text:contains("Desbloq. REP")',
      '//span[contains(text(), "Desbloq. REP")]'
    ];

    for (const selector of desbloqRepSelectors) {
      try {
        if (selector.startsWith('//')) {
          const elements = await page.$x(selector);
          if (elements.length > 0) {
            await elements[0].click();
            console.log('✅ Submenu Desbloq. REP clicado!');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
          }
        } else {
          const element = await page.evaluateHandle((sel) => {
            const elements = Array.from(document.querySelectorAll('span.m-menu__link-text'));
            return elements.find(el => el.textContent.includes('Desbloq. REP'));
          });
          if (element && (await element.evaluate(el => el !== null))) {
            await element.click();
            console.log('✅ Submenu Desbloq. REP clicado!');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
          }
        }
      } catch (error) { }
    }
    console.log('⚠️ Submenu Desbloq. REP não encontrado');
    return false;
  } catch (error) {
    console.log('⚠️ Erro ao clicar submenu:', error.message);
    return false;
  }
}

// FUNÇÃO PARA NAVEGAR PARA DESBLOQUEIO REP
async function navegarParaDesbloqueioREP(page, dadosREP, idSessao) {
  try {
    console.log('🧭 Navegando para Desbloqueio REP...');

    const menuClicado = await clicarMenuUtilitarios(page);
    if (!menuClicado) {
      throw new Error('Não foi possível clicar no menu Utilitários');
    }

    const submenuClicado = await clicarSubmenuDesbloqREP(page);
    if (!submenuClicado) {
      throw new Error('Não foi possível clicar no submenu Desbloq. REP');
    }

    if (dadosREP && dadosREP.numeroREP && dadosREP.senha) {
      await preencherFormularioDesbloqueio(page, dadosREP, idSessao);
    }

    return true;
  } catch (error) {
    console.log('⚠️ Erro na navegação:', error.message);
    throw error;
  }
}

// FUNÇÃO PARA PREENCHER FORMULÁRIO DE DESBLOQUEIO
async function preencherFormularioDesbloqueio(page, dadosREP, idSessao) {
  try {
    console.log('📝 Preenchendo formulário com dados do OCR...');

    // Aguarda o formulário carregar
    await new Promise(resolve => setTimeout(resolve, 3000));

    const serialSelectors = [
      'input[name="n_0"]',
      'input[id="n_0"]',
      'input[placeholder*="Serial"]',
      'input[ng-model*="model"][placeholder*="Serial"]'
    ];

    const senhaSelectors = [
      'input[name="n_1"]',
      'input[id="n_1"]',
      'input[placeholder*="Senha"]',
      'input[ng-model*="model"][placeholder*="Senha"]'
    ];

    const botaoSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button.btn-primary'
    ];

    // ✅ PREENCHE CAMPO SERIAL
    let serialField = null;
    for (const selector of serialSelectors) {
      try {
        serialField = await page.$(selector);
        if (serialField) {
          console.log(`✅ Campo Serial encontrado: ${selector}`);
          await serialField.click({ clickCount: 3 });
          await serialField.type(dadosREP.numeroREP, { delay: 100 });
          console.log(`🔢 Serial preenchido: ${dadosREP.numeroREP}`);
          break;
        }
      } catch (e) { }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // ✅ PREENCHE CAMPO SENHA
    let senhaField = null;
    for (const selector of senhaSelectors) {
      try {
        senhaField = await page.$(selector);
        if (senhaField) {
          console.log(`✅ Campo Senha encontrado: ${selector}`);
          await senhaField.click({ clickCount: 3 });
          await senhaField.type(dadosREP.senha, { delay: 100 });
          console.log(`🔐 Senha preenchida: ${dadosREP.senha}`);
          break;
        }
      } catch (e) { }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // ✅ CLICA NO BOTÃO E AGUARDA RESULTADO
    let botaoConfirmar = null;
    for (const selector of botaoSelectors) {
      try {
        botaoConfirmar = await page.$(selector);
        if (botaoConfirmar) {
          console.log(`✅ Botão encontrado: ${selector}`);
          await botaoConfirmar.click();
          console.log('✅ Formulário submetido! Aguardando resultado...');

          // ✅ CAPTURA O RESULTADO DO DESBLOQUEIO
          await capturarResultadoDesbloqueio(page, idSessao);
          break;
        }
      } catch (e) { }
    }

    if (!serialField || !senhaField) {
      throw new Error('Campos do formulário não encontrados');
    }

    return true;
  } catch (error) {
    console.log('⚠️ Erro ao preencher formulário:', error.message);
    throw error;
  }
}

// FUNÇÃO PARA CAPTURAR E ENVIAR RESULTADO
async function capturarResultadoDesbloqueio(page, idSessao) {
  try {
    console.log('📊 Aguardando resultado do desbloqueio...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    const resultados = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.col-md-12 label.form-control.ng-binding'));
      const dados = [];

      labels.forEach(label => {
        const style = label.getAttribute('style') || '';
        const texto = label.textContent.trim();

        if (texto && style.includes('background-color')) {
          let tipo = 'info';

          if (style.includes('lightgreen')) {
            tipo = 'sucesso';
          } else if (style.includes('lightcoral')) {
            tipo = 'erro';
          } else if (style.includes('yellow')) {
            tipo = 'aviso';
          }

          dados.push({
            texto: texto,
            tipo: tipo,
            style: style
          });
        }
      });

      return dados;
    });

    console.log(`📋 ${resultados.length} resultado(s) encontrado(s) para sessão: ${idSessao}`);

    if (resultados.length === 0) {
      console.log('⚠️ Nenhum resultado encontrado');
      await executarCallback(idSessao, 'Processo concluído, mas nenhum resultado foi retornado pelo sistema.');
      return null;
    }

    // 📤 MONTAGEM DA MENSAGEM
    let mensagemFinal = '';
    let tipoGeral = 'info';

    // Extrai as informações específicas
    let codigoDesbloqueio = '';
    let avisoDesbloqueio = '';
    let avisoBateria = '';

    resultados.forEach(res => {
      if (res.texto.includes('código de desbloqueio do equipamento modelo iDClass Bio Prox é')) {
        codigoDesbloqueio = res.texto;
        tipoGeral = 'sucesso';
      } else if (res.texto.includes('Este REP já foi desbloqueado em')) {
        avisoDesbloqueio = res.texto;
      } else if (res.texto.includes('ATENÇÃO: É necessária a troca imediata da bateria CR2032 deste REP')) {
        avisoBateria = res.texto;
      }
    });

    // MONTA A MENSAGEM
    if (codigoDesbloqueio) {
      const codigoMatch = codigoDesbloqueio.match(/é (\d+)/);
      const codigoNumero = codigoMatch ? codigoMatch[1] : '';
      
      mensagemFinal = `✅ *DESBLOQUEIO REALIZADO COM SUCESSO!*\n\n` +
                     `🔓 Código de desbloqueio: *${codigoNumero}*`;
      
      if (avisoDesbloqueio || avisoBateria) {
        mensagemFinal += `\n\n⚠️ ${avisoDesbloqueio} ${avisoBateria}`;
      }
    } else {
      resultados.forEach((res, index) => {
        if (res.tipo === 'sucesso') {
          mensagemFinal += `✅ ${res.texto}\n\n`;
        } else if (res.tipo === 'aviso') {
          mensagemFinal += `⚠️ ${res.texto}\n\n`;
        } else if (res.tipo === 'erro') {
          mensagemFinal += `❌ ${res.texto}\n\n`;
        }
      });
      mensagemFinal = mensagemFinal.trim();
      
      if (!mensagemFinal) {
        mensagemFinal = 'ℹ️ *Processamento concluído.*\n\nVerifique o equipamento.';
      }
    }

    // ✅ ENVIA RESULTADO USANDO CALLBACK DA SESSÃO
    await executarCallback(idSessao, mensagemFinal);

    return resultados;

  } catch (error) {
    console.log('⚠️ Erro ao capturar resultado:', error.message);
    
    // ✅ ENVIA ERRO USANDO CALLBACK DA SESSÃO
    await executarCallback(idSessao, '⚠️ Processamento concluído com observações. Verifique manualmente o sistema.');

    throw error;
  }
}

// FUNÇÃO PARA ABRIR CHROME SIMPLES (MODO NÃO-HEADLESS SEM PUPPETEER)
async function justOpenInChromeBrowser(rhidUrl, query, telefone, dadosREP = null) {
  try {
    let command;
    if (process.platform === 'win32') {
      command = `start chrome "${rhidUrl}"`;
    } else if (process.platform === 'darwin') {
      command = `open -a "Google Chrome" "${rhidUrl}"`;
    } else {
      command = `google-chrome "${rhidUrl}"`;
    }

    console.log(`🌐 Executando: ${command}`);
    await execAsync(command, { timeout: 10000 });

    console.log(`✅ Chrome aberto com RHID!`);

    if (dadosREP) {
      console.log(`📝 Dados do REP para preenchimento manual:`);
      console.log(`   Serial: ${dadosREP.numeroREP}`);
      console.log(`   Senha: ${dadosREP.senha}`);
    }

    return {
      success: true,
      title: `RHID Login`,
      url: rhidUrl,
      query: query,
      credenciais: telefone ? getCredenciaisRHID(telefone) : null,
      telefone: telefone,
      headless: false,
      dadosREP: dadosREP
    };

  } catch (error) {
    console.error("❌ Erro ao abrir navegador:", error);
    return {
      success: false,
      error: 'Não foi possível abrir o navegador',
      query: query,
      telefone: telefone,
      headless: false,
      dadosREP: dadosREP
    };
  }
}

// ✅ FUNÇÃO PRINCIPAL OTIMIZADA COM CALLBACKS POR SESSÃO
async function openInChrome(query, headless = true, telefone = null, dadosREP = null, callback = null) {
  const idSessao = `${telefone}_${Date.now()}`;
  let browser = null;

  try {
    console.log(`\n🚀 ===== INICIANDO DESBLOQUEIO REP =====`);
    console.log(`📞 Telefone: ${telefone}`);
    console.log(`🎯 Sessão: ${idSessao}`);
    console.log(`🔢 REP: ${dadosREP?.numeroREP || 'N/A'}`);
    console.log(`👥 Instâncias ativas: ${instanciasAtivas.size}/${MAX_INSTANCIAS_PARALELAS}`);

    // ✅ REGISTRA CALLBACK PARA ESTA SESSÃO
    if (callback && typeof callback === 'function') {
      registrarCallback(idSessao, callback);
    }

    // ✅ NORMALIZA O VALOR DE HEADLESS
    if (typeof headless === 'string') {
      headless = headless.toLowerCase() === 'true' || headless === '1';
    } else {
      headless = Boolean(headless);
    }
    
    console.log(`💻 Modo headless: ${headless ? 'SIM' : 'NÃO'}`);

    if (dadosREP) {
      console.log(`📋 Dados do REP recebidos do OCR:`, dadosREP);
    } else {
      console.log('⚠️ Nenhum dado do REP recebido do OCR');
    }

    const rhidUrl = `https://www.rhid.com.br/v2/#/login`;

    // Busca credenciais baseadas no telefone
    let credenciais = null;
    if (telefone) {
      credenciais = getCredenciaisRHID(telefone, 'menu1');
      if (credenciais) {
        console.log(`🔑 Credenciais encontradas para: ${credenciais.usuario}`);
      } else {
        console.log('⚠️ Nenhuma credencial encontrada para este telefone');
        
        // Se não tem credenciais, só abre o browser normalmente
        if (!headless) {
          return await justOpenInChromeBrowser(rhidUrl, query, telefone, dadosREP);
        } else {
          throw new Error('Credenciais não encontradas - impossível executar em modo headless');
        }
      }
    } else {
      // Sem telefone, sem credenciais
      if (!headless) {
        return await justOpenInChromeBrowser(rhidUrl, query, telefone, dadosREP);
      } else {
        throw new Error('Telefone não fornecido - impossível executar em modo headless');
      }
    }

    // ✅ MODO HEADLESS COM GERENCIAMENTO DE INSTÂNCIAS
    if (headless) {
      console.log(`🌐 Iniciando automação com Puppeteer...`);
      
      // Obtém instância gerenciada
      const instancia = await GerenciadorInstancias.obterInstancia(idSessao);
      browser = instancia.browser;

      const page = await browser.newPage();
      
      // Configuração da página
      await page.setDefaultNavigationTimeout(60000);
      await page.setDefaultTimeout(30000);

      console.log('📄 Navegando para RHID...');
      await page.goto(rhidUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // Aguarda a página carregar
      await new Promise(resolve => setTimeout(resolve, 3000));

      // FAZ LOGIN NO RHID
      await fazerLoginRHID(page, credenciais);

      // NAVEGA E PREENCHE FORMULÁRIO DE DESBLOQUEIO
      if (dadosREP && dadosREP.numeroREP && dadosREP.senha) {
        await navegarParaDesbloqueioREP(page, dadosREP, idSessao);
      } else {
        console.log('⚠️ Dados do REP incompletos, navegando sem preenchimento automático');
        await navegarParaDesbloqueioREP(page, null, idSessao);
      }

      console.log('✅ Automação concluída!');

    } else {
      // MODO NÃO-HEADLESS (com interface)
      return await justOpenInChromeBrowser(rhidUrl, query, telefone, dadosREP);
    }

    return {
      success: true,
      title: `RHID Login`,
      url: rhidUrl,
      query: query,
      credenciais: credenciais,
      telefone: telefone,
      headless: headless,
      dadosREP: dadosREP
    };

  } catch (error) {
    console.error("❌ Erro na automação:", error.message);

    // ✅ ENVIA ERRO USANDO CALLBACK DA SESSÃO
    await executarCallback(idSessao, `❌ Erro no desbloqueio: ${error.message}`);

    // ✅ SEMPRE FECHA O BROWSER EM CASO DE ERRO (HEADLESS)
    if (browser && headless) {
      try {
        await GerenciadorInstancias.liberarInstancia(idSessao);
      } catch (e) {
        console.log('⚠️ Erro ao fechar browser:', e.message);
      }
    }

    return {
      success: false,
      error: error.message,
      query: query,
      telefone: telefone,
      headless: headless,
      dadosREP: dadosREP
    };
    
  } finally {
    // ✅ GARANTE LIBERAÇÃO DE RECURSOS (APENAS HEADLESS)
    if (browser && headless) {
      await GerenciadorInstancias.liberarInstancia(idSessao);
    }
    console.log(`🔚 Processo finalizado para sessão: ${idSessao}\n`);
  }
}

// ✅ EXPORTAÇÕES
module.exports = { 
  searchInChrome: openInChrome,
  GerenciadorInstancias,
  getStatus: () => ({
    desbloqueio: GerenciadorInstancias.getStatus(),
    callbacks: callbacksPorSessao.size
  })
};