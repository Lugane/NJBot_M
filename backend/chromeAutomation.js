// backend/chromeAutomation.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const puppeteer = require('puppeteer');
const { getCredenciaisRHID } = require('./rhidLogins');

async function searchInChrome(query, headless = true, telefone = null) {
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
        return await abrirApenasChrome(rhidUrl, query, telefone, headless);
      }
    } else {
      return await abrirApenasChrome(rhidUrl, query, telefone, headless);
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
    return await abrirApenasChrome(rhidUrl, query, telefone, headless);
  }
}

// Função para apenas abrir o Chrome sem automação
async function abrirApenasChrome(rhidUrl, query, telefone, headless = true) {
  try {
    console.log('🌐 Abrindo apenas o Chrome...');

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

module.exports = { searchInChrome };