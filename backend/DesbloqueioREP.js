const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const puppeteer = require('puppeteer');
const { getCredenciaisRHID } = require('./rhidLogins');
const axios = require("axios");
const FormData = require("form-data");
const fs = require('fs').promises;
const path = require('path');

// Variável para armazenar a função de callback do WhatsApp
let callbackWhatsApp = null;

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
    throw error; // Propaga o erro para tratamento superior
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
async function navegarParaDesbloqueioREP(page, dadosREP) {
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
      await preencherFormularioDesbloqueio(page, dadosREP);
    }

    return true;
  } catch (error) {
    console.log('⚠️ Erro na navegação:', error.message);
    throw error;
  }
}

// FUNÇÃO PARA PREENCHER FORMULÁRIO DE DESBLOQUEIO
async function preencherFormularioDesbloqueio(page, dadosREP) {
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
          await capturarResultadoDesbloqueio(page, dadosREP.telefone || 'desconhecido');
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
async function capturarResultadoDesbloqueio(page, telefone) {
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

    console.log(`📋 ${resultados.length} resultado(s) encontrado(s)`);

    if (resultados.length === 0) {
      console.log('⚠️ Nenhum resultado encontrado');
      if (callbackWhatsApp) {
        await enviarResultadoWhatsApp('Processo concluído, mas nenhum resultado foi retornado pelo sistema.', 'info', telefone);
      }
      return null;
    }

    // 📤 MONTAGEM DA MENSAGEM
    if (callbackWhatsApp) {
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
        
        mensagemFinal = `O código de desbloqueio do equipamento modelo iDClass Bio Prox é \n${codigoNumero}`;
        
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
      }

      await enviarResultadoWhatsApp(mensagemFinal, tipoGeral, telefone);
    }

    return resultados;

  } catch (error) {
    console.log('⚠️ Erro ao capturar resultado:', error.message);
    
    if (callbackWhatsApp) {
      await enviarResultadoWhatsApp('Erro ao processar desbloqueio. Verifique manualmente.', 'erro', telefone);
    }

    throw error;
  }
}

// FUNÇÃO PARA ENVIAR RESULTADO VIA WHATSAPP
async function enviarResultadoWhatsApp(resultado, tipo, telefone) {
  try {
    if (!callbackWhatsApp) {
      console.log('⚠️ Callback WhatsApp não disponível');
      return;
    }

    let mensagem = '';

    if (tipo === 'sucesso') {
      mensagem = `✅ DESBLOQUEIO REALIZADO COM SUCESSO! ✅\n\n` +
                 `📋 Resultado: ${resultado}`;

    } else if (tipo === 'erro') {
      mensagem = `❌ ERRO NO DESBLOQUEIO\n\n` +
                 `📋 Detalhes: ${resultado}`;

    } else if (tipo === 'aviso') {
      mensagem = `⚠️ DESBLOQUEIO COM AVISOS\n\n` +
                 `📋 Resultado: ${resultado}`;

    } else {
      mensagem = `📋 RESULTADO DO DESBLOQUEIO\n\n` +
                 `ℹ️ Status: ${resultado}`;
    }

    console.log(`📤 Enviando resultado via WhatsApp...`);

    await callbackWhatsApp(mensagem);
    console.log('✅ Resultado enviado com sucesso!');
    return true;

  } catch (error) {
    console.log('❌ Erro ao enviar resultado:', error.message);
    return false;
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

// FUNÇÃO PRINCIPAL
async function openInChrome(query, headless = true, telefone = null, dadosREP = null, callback = null) {
  let browser = null;

  try {
    // ✅ NORMALIZA O VALOR DE HEADLESS (aceita string, boolean, etc)
    if (typeof headless === 'string') {
      headless = headless.toLowerCase() === 'true' || headless === '1';
    } else {
      headless = Boolean(headless);
    }
    
    console.log(`🚀 Abrindo RHID para telefone: ${telefone}`);
    console.log(`💻 Modo headless DEFINITIVO: ${headless ? 'SIM (sem UI)' : 'NÃO (com UI)'}`);

    // ✅ Armazena a função de callback para enviar mensagem via WhatsApp
    callbackWhatsApp = callback;

    if (dadosREP) {
      console.log(`📋 Dados do REP recebidos do OCR:`, dadosREP);
    } else {
      console.log('⚠️ Nenhum dado do REP recebido do OCR');
    }

    const rhidUrl = `https://www.rhid.com.br/v2/#/login`;

    // Busca credenciais baseadas no telefone
    let credenciais = null;
    if (telefone) {
      credenciais = getCredenciaisRHID(telefone, 'menu1'); // ← FORÇA menu1
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

    // ✅ MODO HEADLESS OU NÃO-HEADLESS COM PUPPETEER
    console.log(`🌐 Iniciando automação com Puppeteer (headless: ${headless})...`);
    
    browser = await puppeteer.launch({
      headless: headless,
      defaultViewport: headless ? { width: 1920, height: 1080 } : null,
      args: headless ? [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ] : ['--start-maximized']
    });

    const pages = await browser.pages();
    let page = pages.length > 0 ? pages[0] : await browser.newPage();

    console.log('📄 Navegando para RHID...');
    await page.goto(rhidUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Aguarda a página carregar
    await new Promise(resolve => setTimeout(resolve, 3000));

    // FAZ LOGIN NO RHID
    await fazerLoginRHID(page, credenciais);

    // NAVEGA E PREENCHE FORMULÁRIO DE DESBLOQUEIO
    if (dadosREP && dadosREP.numeroREP && dadosREP.senha) {
      await navegarParaDesbloqueioREP(page, dadosREP);
    } else {
      console.log('⚠️ Dados do REP incompletos, navegando sem preenchimento automático');
      await navegarParaDesbloqueioREP(page, null);
    }

    console.log('✅ Automação concluída!');

    // ✅ CORREÇÃO PRINCIPAL: Fecha o browser em modo headless após conclusão
    if (headless && browser) {
      console.log('🔒 Fechando browser headless...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda um pouco antes de fechar
      await browser.close();
      browser = null;
      console.log('✅ Browser fechado com sucesso');
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

    // Sempre fechar o browser em caso de erro
    if (browser) {
      try {
        console.log('🔒 Fechando browser devido a erro...');
        await browser.close();
      } catch (e) {
        console.log('⚠️ Erro ao fechar browser:', e.message);
      }
    }

    // Se falhar em modo headless, informa o erro
    if (headless) {
      if (callbackWhatsApp) {
        await enviarResultadoWhatsApp(
          `Erro na automação: ${error.message}`,
          'erro',
          telefone
        );
      }
      
      return {
        success: false,
        error: error.message,
        query: query,
        telefone: telefone,
        headless: headless,
        dadosREP: dadosREP
      };
    }

    // Se falhar em modo não-headless, tenta abrir o browser manualmente
    const rhidUrl = `https://www.rhid.com.br/v2/#/login`;
    return await justOpenInChromeBrowser(rhidUrl, query, telefone, dadosREP);
  }
}

module.exports = { searchInChrome: openInChrome };