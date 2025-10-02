// backend/DesbloqueioREP.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const puppeteer = require('puppeteer');
const { getCredenciaisRHID } = require('./rhidLogins');

async function openInChrome(query, headless = true, telefone = null) {
  let browser = null;

  try {
    console.log(`🚀 Abrindo RHID para telefone: ${telefone}`);
    console.log(`👻 Modo headless: ${headless ? 'SIM' : 'NÃO'}`);

    const rhidUrl = `https://www.rhid.com.br/v2/#/login`;

    // Busca credenciais baseadas no telefone
    let credenciais = null;
    if (telefone) {
      credenciais = getCredenciaisRHID(telefone);
      if (credenciais) {
        console.log(`🔑 Credenciais: ${credenciais.usuario} / ${credenciais.senha}`);
      } else {
        console.log('⚠️ Nenhuma credencial encontrada para este telefone');
        return await justOpenInChromeBrowser(rhidUrl, query, telefone, headless);
      }
    } else {
      return await justOpenInChromeBrowser(rhidUrl, query, telefone, headless);
    }

    // SE headless = false, usa Puppeteer para abrir e preencher
    if (!headless) {
      console.log('🌐 Iniciando automação com Puppeteer...');
      browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
      });

      // Obtém todas as páginas abertas (incluindo about:blank)
      const pages = await browser.pages();
      let page;
      
      if (pages.length > 0) {
        // Usa a primeira página e navega para a URL
        page = pages[0];
        console.log('📄 Navegando para RHID...');
        await page.goto(rhidUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      } else {
        // Se não tem páginas, cria uma nova
        page = await browser.newPage();
        await page.goto(rhidUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      }

      // Aguarda a página carregar completamente
      console.log('⏳ Aguardando página carregar...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Tenta encontrar e preencher os campos
      console.log('⏳ Procurando campos de login...');
      
      try {
        // Tenta vários seletores possíveis para os campos
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

        const utilitiesMenuSelectors = [
          'li.m-menu__item--submenu:has(.m-menu__link-text:contains("Utilitários"))',
          'li[ng-repeat="module in modules"]:has(span.m-menu__link-text:contains("Utilitários"))',
          '.m-menu__item--submenu:has(.m-menu__toggle .m-menu__link-text.ng-binding)',
          '.m-menu__item--submenu:has(i.fa-cubes)',
          '//span[contains(text(), "Utilitários")]',
          '//a[contains(text(), "Utilitários")]',
          '.m-menu__nav .m-menu__item:has(.m-menu__link-text:contains("Utilitários"))',
          '[title*="Utilitários"]',
          '.nav-item:has(.nav-link:contains("Utilitários"))'
        ];

        let emailField, passwordField;
        
        // Encontra o campo de email
        for (const selector of emailSelectors) {
          try {
            emailField = await page.$(selector);
            if (emailField) {
              console.log(`✅ Campo email encontrado: ${selector}`);
              break;
            }
          } catch (e) {}
        }
        
        // Encontra o campo de senha
        for (const selector of passwordSelectors) {
          try {
            passwordField = await page.$(selector);
            if (passwordField) {
              console.log(`✅ Campo senha encontrado: ${selector}`);
              break;
            }
          } catch (e) {}
        }

        if (emailField && passwordField) {
          // Preenche email
          console.log(`📧 Preenchendo email: ${credenciais.usuario}`);
          await emailField.click({ clickCount: 3 });
          await emailField.type(credenciais.usuario, { delay: 50 });

          await new Promise(resolve => setTimeout(resolve, 500));

          // Preenche senha
          console.log('🔒 Preenchendo senha...');
          await passwordField.click({ clickCount: 3 });
          await passwordField.type(credenciais.senha, { delay: 50 });

          await new Promise(resolve => setTimeout(resolve, 500));

          // Tenta encontrar e clicar no botão de entrar
          let submitButton = null;
          for (const selector of submitSelectors) {
            try {
              submitButton = await page.$(selector);
              if (submitButton) {
                console.log(`✅ Botão encontrado: ${selector}`);
                await submitButton.click();
                console.log('✅ Login automático realizado!');
                
                // AGUARDA O LOGIN E DEPOIS CLICA NO MENU UTILITÁRIOS
                await clicarMenuUtilitarios(page, utilitiesMenuSelectors);
                break;
              }
            } catch (e) {}
          }

          if (!submitButton) {
            console.log('⚠️ Botão não encontrado, preencha manualmente');
          }

        } else {
          console.log('⚠️ Campos não encontrados automaticamente');
        }

        console.log('✅ RHID aberto e campos preenchidos!');
        console.log('🔓 Navegador permanecerá aberto');

      } catch (fieldError) {
        console.log('⚠️ Erro ao preencher campos:', fieldError.message);
        console.log('💡 Preencha manualmente os campos');
        console.log('📝 Credenciais:');
        console.log(`   👤 Usuário: ${credenciais.usuario}`);
        console.log(`   🔒 Senha: ${credenciais.senha}`);
      }

    } else {
      // Modo headless
      console.log('🌐 Iniciando automação headless...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto(rhidUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      console.log('✅ Automação headless concluída!');
      await browser.close();
    }

    return {
      success: true,
      title: `RHID Login`,
      url: rhidUrl,
      query: query,
      credenciais: credenciais,
      telefone: telefone,
      headless: headless
    };

  } catch (error) {
    console.error("❌ Erro na automação:", error.message);

    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    
    const rhidUrl = `https://www.rhid.com.br/v2/#/login`;
    return await justOpenInChromeBrowser(rhidUrl, query, telefone, headless);
  }
}

// FUNÇÃO PARA CLICAR NO MENU UTILITÁRIOS E SUBMENU
async function clicarMenuUtilitarios(page) {
  try {
    console.log('🔄 Aguardando login concluir...');
    
    // Aguarda a navegação após o login
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    
    console.log('✅ Login concluído! Buscando menu Utilitários...');
    
    // Aguarda um pouco para a página carregar completamente
    await new Promise(resolve => setTimeout(resolve, 5000));

    let utilitiesMenuClicked = false;

    // SELEtores ESPECÍFICOS para o menu Utilitários baseado no HTML que você enviou
    const utilitiesMenuSelectors = [
      'span.m-menu__link-text.side-menu-color-main.ng-binding:contains("Utilitários")',
      'span.m-menu__link-text:contains("Utilitários")',
      '.m-menu__link-text:contains("Utilitários")',
      '//span[@class="m-menu__link-text side-menu-color-main ng-binding" and contains(text(), "Utilitários")]',
      '//span[contains(@class, "m-menu__link-text") and contains(text(), "Utilitários")]'
    ];

    // Tenta encontrar e clicar no menu Utilitários
    for (const selector of utilitiesMenuSelectors) {
      try {
        console.log(`🔍 Tentando seletor para Utilitários: ${selector}`);
        
        if (selector.startsWith('//')) {
          // Para seletores XPath
          const elements = await page.$x(selector);
          if (elements.length > 0) {
            console.log(`✅ Menu Utilitários encontrado via XPath: ${selector}`);
            
            // Role para o elemento se necessário
            await elements[0].scrollIntoView();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Clica no elemento
            await elements[0].click();
            utilitiesMenuClicked = true;
            console.log('✅ Menu Utilitários clicado!');
            
            // Aguarda o submenu abrir
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Agora clica no submenu "Desbloq. REP (Violação)"
            await clicarSubmenuDesbloqREP(page);
            break;
          }
        } else {
          // Para seletores CSS com :contains (precisa de avaliação JavaScript)
          const element = await page.evaluateHandle((sel) => {
            const elements = Array.from(document.querySelectorAll('span.m-menu__link-text'));
            return elements.find(el => el.textContent.includes('Utilitários'));
          });
          
          if (element && (await element.evaluate(el => el !== null))) {
            console.log(`✅ Menu Utilitários encontrado via CSS: ${selector}`);
            
            // Role para o elemento
            await element.scrollIntoView();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Clica no elemento
            await element.click();
            utilitiesMenuClicked = true;
            console.log('✅ Menu Utilitários clicado!');
            
            // Aguarda o submenu abrir
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Agora clica no submenu "Desbloq. REP (Violação)"
            await clicarSubmenuDesbloqREP(page);
            break;
          }
        }
      } catch (error) {
        console.log(`❌ Seletor falhou: ${selector} - ${error.message}`);
      }
    }

    if (!utilitiesMenuClicked) {
      console.log('⚠️ Menu Utilitários não encontrado automaticamente');
      console.log('💡 Clique manualmente no menu Utilitários');
    }

  } catch (error) {
    console.log('⚠️ Erro ao tentar clicar no menu Utilitários:', error.message);
    console.log('💡 O login foi feito, mas o menu não pôde ser clicado automaticamente');
  }
}

// FUNÇÃO PARA CLICAR NO SUBMENU "Desbloq. REP (Violação)"
async function clicarSubmenuDesbloqREP(page) {
  try {
    console.log('🔍 Buscando submenu "Desbloq. REP (Violação)"...');
    
    // Seletores para o submenu específico
    const desbloqRepSelectors = [
      'span.m-menu__link-text.ng-binding:contains("Desbloq. REP (Violação)")',
      'span.m-menu__link-text:contains("Desbloq. REP")',
      '//span[@class="m-menu__link-text ng-binding" and contains(text(), "Desbloq. REP")]',
      '//span[contains(@class, "m-menu__link-text") and contains(text(), "Desbloq. REP")]',
      '//span[contains(text(), "Desbloq. REP")]',
      '//a[contains(text(), "Desbloq. REP")]'
    ];

    let desbloqRepClicked = false;

    for (const selector of desbloqRepSelectors) {
      try {
        console.log(`🔍 Tentando seletor para Desbloq. REP: ${selector}`);
        
        if (selector.startsWith('//')) {
          // Para seletores XPath
          const elements = await page.$x(selector);
          if (elements.length > 0) {
            console.log(`✅ Submenu Desbloq. REP encontrado via XPath: ${selector}`);
            
            // Role para o elemento se necessário
            await elements[0].scrollIntoView();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Clica no elemento
            await elements[0].click();
            desbloqRepClicked = true;
            console.log('✅ Submenu Desbloq. REP (Violação) clicado!');
            break;
          }
        } else {
          // Para seletores CSS com :contains
          const element = await page.evaluateHandle((sel) => {
            const elements = Array.from(document.querySelectorAll('span.m-menu__link-text'));
            return elements.find(el => el.textContent.includes('Desbloq. REP'));
          });
          
          if (element && (await element.evaluate(el => el !== null))) {
            console.log(`✅ Submenu Desbloq. REP encontrado via CSS: ${selector}`);
            
            // Role para o elemento
            await element.scrollIntoView();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Clica no elemento
            await element.click();
            desbloqRepClicked = true;
            console.log('✅ Submenu Desbloq. REP (Violação) clicado!');
            break;
          }
        }
      } catch (error) {
        console.log(`❌ Seletor falhou para Desbloq. REP: ${selector} - ${error.message}`);
      }
    }

    if (!desbloqRepClicked) {
      console.log('⚠️ Submenu "Desbloq. REP (Violação)" não encontrado automaticamente');
      console.log('💡 Clique manualmente no submenu');
    }

  } catch (error) {
    console.log('⚠️ Erro ao tentar clicar no submenu Desbloq. REP:', error.message);
  }
}

// Função para apenas abrir o Chrome sem automação
async function justOpenInChromeBrowser(rhidUrl, query, telefone, headless = true) {
  try {
    if (headless) {
      console.log('👻 Modo headless - não abrindo navegador visual');
      return {
        success: true,
        title: `RHID Login`,
        url: rhidUrl,
        query: query,
        credenciais: telefone ? getCredenciaisRHID(telefone) : null,
        telefone: telefone,
        headless: headless,
        message: 'Modo headless - navegador não aberto visualmente'
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

    const credenciais = telefone ? getCredenciaisRHID(telefone) : null;
    if (credenciais) {
      console.log(`📝 Credenciais disponíveis:`);
      console.log(`   👤 Usuário: ${credenciais.usuario}`);
      console.log(`   🔒 Senha: ${credenciais.senha}`);
    }

    return {
      success: true,
      title: `RHID Login`,
      url: rhidUrl,
      query: query,
      credenciais: credenciais,
      telefone: telefone,
      headless: headless
    };

  } catch (error) {
    console.error("❌ Erro ao abrir navegador:", error);
    return {
      success: false,
      error: 'Não foi possível abrir o navegador',
      query: query,
      telefone: telefone,
      headless: headless
    };
  }
}

module.exports = { searchInChrome: openInChrome };