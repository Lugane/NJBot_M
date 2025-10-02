// backend/DesbloqueioREP.js - VERSÃO COM RESULTADO
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const puppeteer = require('puppeteer');
const { getCredenciaisRHID } = require('./rhidLogins');

// Variável para armazenar a função de callback do WhatsApp
let callbackWhatsApp = null;

async function openInChrome(query, headless = true, telefone = null, dadosREP = null, callback = null) {
  let browser = null;

  try {
    console.log(`🚀 Abrindo RHID para telefone: ${telefone}`);
    console.log(`👻 Modo headless: ${headless ? 'SIM' : 'NÃO'}`);
    
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
      credenciais = getCredenciaisRHID(telefone);
      if (credenciais) {
        console.log(`🔑 Credenciais: ${credenciais.usuario} / ${credenciais.senha}`);
      } else {
        console.log('⚠️ Nenhuma credencial encontrada para este telefone');
        return await justOpenInChromeBrowser(rhidUrl, query, telefone, headless, dadosREP);
      }
    } else {
      return await justOpenInChromeBrowser(rhidUrl, query, telefone, headless, dadosREP);
    }

    // SE headless = false, usa Puppeteer para abrir e preencher
    if (!headless) {
      console.log('🌐 Iniciando automação com Puppeteer...');
      browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
      });

      const pages = await browser.pages();
      let page;
      
      if (pages.length > 0) {
        page = pages[0];
        console.log('📄 Navegando para RHID...');
        await page.goto(rhidUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      } else {
        page = await browser.newPage();
        await page.goto(rhidUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      }

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
      
    } else {
      // Modo headless
      console.log('🌐 Iniciando automação headless...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto(rhidUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      await browser.close();
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

    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    
    const rhidUrl = `https://www.rhid.com.br/v2/#/login`;
    return await justOpenInChromeBrowser(rhidUrl, query, telefone, headless, dadosREP);
  }
}

// FUNÇÃO PARA CAPTURAR E ENVIAR RESULTADO DO DESBLOQUEIO
async function capturarResultadoDesbloqueio(page) {
  try {
    console.log('📊 Aguardando resultado do desbloqueio...');
    
    // Aguarda mais tempo para o processamento
    await new Promise(resolve => setTimeout(resolve, 8000));

    // 🔍 SELEtores MAIS ESPECÍFICOS para capturar o resultado
    const resultadoSelectors = [
      '.col-md-12 label', // Elemento principal
      '.col-md-12 .form-control.ng-binding', // Campo com binding
      '[style*="lightcoral"]', // Erro (vermelho)
      '[style*="lightgreen"]', // Sucesso (verde) 
      '[style*="background-color"]', // Qualquer elemento com cor de fundo
      '.alert', // Alertas
      '.alert-danger', // Alertas de erro
      '.alert-success', // Alertas de sucesso
      '.ng-binding' // Qualquer elemento com binding
    ];

    let resultado = null;
    let tipoResultado = 'info';

    // Tenta capturar o resultado em vários seletores
    for (const selector of resultadoSelectors) {
      try {
        const elementos = await page.$$(selector);
        
        for (const elemento of elementos) {
          const isVisible = await page.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0;
          }, elemento);
          
          if (isVisible) {
            const texto = await page.evaluate(el => el.textContent, elemento);
            const estilo = await page.evaluate(el => el.getAttribute('style'), elemento);
            
            if (texto && texto.trim() !== '' && texto.trim() !== 'Serial') {
              resultado = texto.trim();
              
              // Determina o tipo de resultado
              if (estilo && estilo.includes('lightcoral')) {
                tipoResultado = 'erro';
              } else if (estilo && estilo.includes('lightgreen')) {
                tipoResultado = 'sucesso';
              } else if (texto.toLowerCase().includes('inválido') || texto.toLowerCase().includes('erro')) {
                tipoResultado = 'erro';
              } else if (texto.toLowerCase().includes('sucesso') || texto.toLowerCase().includes('liberado')) {
                tipoResultado = 'sucesso';
              }
              
              console.log(`📋 Resultado capturado: ${resultado} (${tipoResultado})`);
              break;
            }
          }
        }
        
        if (resultado) break;
      } catch (error) {
        // Continua para o próximo seletor
      }
    }

    // ✅ CAPTURA ALTERNATIVA: Procura qualquer texto visível na área de resultados
    if (!resultado) {
      try {
        const areaResultado = await page.$('.col-md-12');
        if (areaResultado) {
          const textos = await page.evaluate(el => {
            const elements = el.querySelectorAll('*');
            const texts = [];
            elements.forEach(child => {
              if (child.textContent && child.textContent.trim() && 
                  !child.textContent.includes('Serial') &&
                  !child.textContent.includes('Senha') &&
                  window.getComputedStyle(child).display !== 'none') {
                texts.push(child.textContent.trim());
              }
            });
            return texts;
          }, areaResultado);
          
          if (textos.length > 0) {
            resultado = textos[0];
            console.log(`📋 Resultado alternativo: ${resultado}`);
          }
        }
      } catch (error) {
        console.log('⚠️ Não foi possível capturar resultado alternativo');
      }
    }

    // ✅ ENVIA RESULTADO VIA WHATSAPP
    if (resultado && callbackWhatsApp) {
      await enviarResultadoWhatsApp(resultado, tipoResultado);
    } else if (callbackWhatsApp) {
      // Se não capturou resultado, envia mensagem padrão
      await enviarResultadoWhatsApp('Processo concluído, mas não foi possível capturar o resultado específico.', 'info');
    }

    return resultado;

  } catch (error) {
    console.log('⚠️ Erro ao capturar resultado:', error.message);
    
    // Envia mensagem de erro via WhatsApp
    if (callbackWhatsApp) {
      await enviarResultadoWhatsApp('Erro ao processar desbloqueio. Verifique manualmente.', 'erro');
    }
    
    return null;
  }
}

// FUNÇÃO PARA ENVIAR RESULTADO VIA WHATSAPP
async function enviarResultadoWhatsApp(resultado, tipo) {
  try {
    let mensagem = '';
    
    // FORMATAÇÃO MELHORADA
    if (tipo === 'erro') {
      mensagem = `❌ *ERRO NO DESBLOQUEIO*\n\n` +
                 `📋 *Resultado:* ${resultado}\n\n` +
                 `⚠️ *O desbloqueio não pôde ser concluído.*\n` +
                 `💡 Verifique os dados do REP e tente novamente.`;
    } else if (tipo === 'sucesso') {
      mensagem = `✅ *DESBLOQUEIO REALIZADO!*\n\n` +
                 `📋 *Resultado:* ${resultado}\n\n` +
                 `🎉 *O REP foi desbloqueado com sucesso!*\n` +
                 `🔄 Reinicie o equipamento para aplicar as alterações.`;
    } else {
      mensagem = `📋 *RESULTADO DO DESBLOQUEIO*\n\n` +
                 `ℹ️ *Status:* ${resultado}\n\n` +
                 `🔍 *Processo concluído.*\n` +
                 `Verifique o sistema para confirmar o resultado.`;
    }

    console.log(`📤 Enviando resultado via WhatsApp...`);
    
    if (callbackWhatsApp) {
      await callbackWhatsApp(mensagem);
      console.log('✅ Resultado enviado com sucesso!');
    }

  } catch (error) {
    console.log('❌ Erro ao enviar resultado via WhatsApp:', error.message);
  }
}

// FUNÇÃO ATUALIZADA PARA PREENCHER FORMULÁRIO E CAPTURAR RESULTADO
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
      } catch (e) {}
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
      } catch (e) {}
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
          await capturarResultadoDesbloqueio(page);
          break;
        }
      } catch (e) {}
    }

    if (!serialField || !senhaField) {
      console.log('⚠️ Campos do formulário não encontrados automaticamente');
      console.log('💡 Preencha manualmente os campos:');
      console.log(`   Serial: ${dadosREP.numeroREP}`);
      console.log(`   Senha: ${dadosREP.senha}`);
    }

  } catch (error) {
    console.log('⚠️ Erro ao preencher formulário:', error.message);
  }
}

// FUNÇÕES EXISTENTES (mantidas)
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
      } catch (e) {}
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
      } catch (e) {}
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
      } catch (e) {}
    }

  } catch (error) {
    console.log('⚠️ Erro no login:', error.message);
  }
}

async function navegarParaDesbloqueioREP(page, dadosREP) {
  try {
    console.log('🧭 Navegando para Desbloqueio REP...');
    
    await clicarMenuUtilitarios(page);
    await clicarSubmenuDesbloqREP(page);
    
    if (dadosREP && dadosREP.numeroREP && dadosREP.senha) {
      await preencherFormularioDesbloqueio(page, dadosREP);
    }

  } catch (error) {
    console.log('⚠️ Erro na navegação:', error.message);
  }
}

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
            return;
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
            return;
          }
        }
      } catch (error) {}
    }
    console.log('⚠️ Menu Utilitários não encontrado');
  } catch (error) {
    console.log('⚠️ Erro ao clicar menu Utilitários:', error.message);
  }
}

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
            return;
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
            return;
          }
        }
      } catch (error) {}
    }
    console.log('⚠️ Submenu Desbloq. REP não encontrado');
  } catch (error) {
    console.log('⚠️ Erro ao clicar submenu:', error.message);
  }
}

async function justOpenInChromeBrowser(rhidUrl, query, telefone, headless = true, dadosREP = null) {
  try {
    if (headless) {
      console.log('👻 Modo headless - navegador não aberto visualmente');
      return {
        success: true,
        title: `RHID Login`,
        url: rhidUrl,
        query: query,
        credenciais: telefone ? getCredenciaisRHID(telefone) : null,
        telefone: telefone,
        headless: headless,
        dadosREP: dadosREP
      };
    }

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
      headless: headless,
      dadosREP: dadosREP
    };

  } catch (error) {
    console.error("❌ Erro ao abrir navegador:", error);
    return {
      success: false,
      error: 'Não foi possível abrir o navegador',
      query: query,
      telefone: telefone,
      headless: headless,
      dadosREP: dadosREP
    };
  }
}

module.exports = { searchInChrome: openInChrome };