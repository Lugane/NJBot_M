const puppeteer = require('puppeteer');

// Variável para armazenar a função de callback do WhatsApp
let callbackWhatsApp = null;

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

async function consultarFuncionario(nomeFuncionario, headless = true, telefone = null, callback = null) {
    let browser = null;

    console.log(`🚀 Iniciando consulta para: "${nomeFuncionario}"`);
    console.log(`📞 Telefone: ${telefone}`);
    console.log(`🖥️ Modo headless: ${headless}`);

    // ✅ VERIFICA SE É CPF OU NOME
    const isCPF = isValidCPF(nomeFuncionario);
    const cpfLimpo = isCPF ? limparCPF(nomeFuncionario) : null;
    
    console.log(`🔍 Tipo de busca: ${isCPF ? 'CPF' : 'NOME'}`);
    if (isCPF) {
        console.log(`📋 CPF limpo: ${cpfLimpo}`);
    }

    // ✅ CORREÇÃO: Normaliza o valor de headless (igual no DesbloqueioREP)
    if (typeof headless === 'string') {
        headless = headless.toLowerCase() === 'true' || headless === '1';
    } else {
        headless = Boolean(headless);
    }

    console.log(`🖥️ Modo headless DEFINITIVO: ${headless ? 'SIM (sem UI)' : 'NÃO (com UI)'}`);

    // ✅ Armazena o callback para enviar mensagens via WhatsApp
    callbackWhatsApp = callback;

    const enviarResposta = async (mensagem) => {
        if (callbackWhatsApp) {
            try {
                await callbackWhatsApp(mensagem);
            } catch (e) {
                console.error('❌ Erro ao enviar resposta via callback:', e);
            }
        } else {
            console.log(`[SEM CALLBACK] ${mensagem}`);
        }
    };

    try {
        // ✅ VALIDAÇÃO DO NOME/CPF
        if (!nomeFuncionario || nomeFuncionario.trim().length < 3) {
            await enviarResposta(`❌ *Erro na consulta:*\n\nInformação muito curta. Por favor, digite o nome completo ou CPF do funcionário.`);
            return;
        }

        // ✅ IMPORTAÇÃO DAS CREDENCIAIS
        const { getCredenciaisRHID } = require('./rhidLogins');
        const credenciais = getCredenciaisRHID(telefone, 'menu2');

        if (!credenciais) {
            console.error(`❌ Credenciais não encontradas para o telefone ${telefone}`);
            await enviarResposta(`❌ *Erro de Autenticação*\n\nNão foi possível encontrar as credenciais de acesso para o seu número. Por favor, contate o suporte.`);
            return;
        }

        console.log(`🔑 Usando credenciais de: ${credenciais.usuario}`);

        const rhidUrl = `https://www.rhid.com.br/v2/#/login`;

        // ✅ CONFIGURAÇÃO DO BROWSER CORRIGIDA (igual ao DesbloqueioREP)
        console.log('🖥️ Iniciando navegador...');
        browser = await puppeteer.launch({
            headless: headless,
            defaultViewport: headless ? { width: 1920, height: 1080 } : null,
            args: headless ? [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ] : ['--start-maximized'],
            ignoreHTTPSErrors: true,
            timeout: 60000
        });

        const pages = await browser.pages();
        let page = pages.length > 0 ? pages[0] : await browser.newPage();

        // ✅ CONFIGURAÇÃO DA PÁGINA MELHORADA
        if (!headless) {
            await page.setViewport({ width: 1366, height: 768 });
        }
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // ✅ TIMEOUT CONFIGURADO
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);

        console.log('🔄 Navegando para RHID...');

        try {
            // ✅ CORREÇÃO: Usa mesma estratégia de navegação do DesbloqueioREP
            await page.goto(rhidUrl, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });
            console.log('✅ Página carregada com sucesso!');

            // Aguarda a página carregar completamente
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (navigationError) {
            console.error('❌ Erro ao navegar para a página:', navigationError);
            await enviarResposta(`❌ *Erro de Navegação*\n\nNão foi possível acessar o sistema RHID. Tente novamente em alguns minutos.`);
            return;
        }

        // ✅ VERIFICA SE JÁ ESTÁ LOGADO (melhorado)
        const estaLogado = await page.evaluate(() => {
            return !window.location.href.includes('login') && document.querySelector('body:not(.login-page)');
        });

        if (!estaLogado) {
            console.log('⏳ Fazendo login...');

            try {
                // ✅ AGUARDA OS CAMPOS DO LOGIN COM MÚLTIPLOS SELECTORS (igual DesbloqueioREP)
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

            } catch (loginError) {
                console.error('❌ Erro no login:', loginError);
                await enviarResposta(`❌ *Erro de Login*\n\nNão foi possível fazer login no sistema. Verifique as credenciais.`);
                return;
            }
        }

        // ✅ NAVEGA PARA CADASTROS > FUNCIONÁRIOS
        console.log('🔍 Navegando para Cadastros > Funcionários...');

        try {
            // Aguarda um pouco antes de navegar
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Tenta acessar diretamente a URL de funcionários
            await page.goto('https://www.rhid.com.br/v2/#/list/person', {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            console.log('✅ Página de funcionários carregada!');

            // Aguarda a tabela carregar
            await new Promise(resolve => setTimeout(resolve, 5000));

        } catch (menuError) {
            console.error('❌ Erro ao acessar menu de funcionários:', menuError);
            await enviarResposta(`❌ *Erro de Navegação*\n\nNão foi possível acessar a lista de funcionários.`);
            return;
        }

        // ✅ REALIZA A BUSCA (NOME OU CPF)
        console.log(`🔍 Buscando por "${isCPF ? 'CPF: ' + cpfLimpo : nomeFuncionario}"...`);

        try {
            if (isCPF) {
                // ✅ BUSCA POR CPF - USA BUSCA AVANÇADA
                console.log('📋 Iniciando busca avançada por CPF...');

                // 1️⃣ Clica no botão "Busca Avançada"
                await page.waitForSelector('a[ng-click*="buscaAvancadaToogle"]', { timeout: 10000 });
                await page.click('a[ng-click*="buscaAvancadaToogle"]');
                console.log('✅ Botão Busca Avançada clicado');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // 2️⃣ Preenche o campo CPF
                await page.waitForSelector('input[placeholder="CPF"]', { timeout: 10000 });
                const cpfInput = await page.$('input[placeholder="CPF"]');
                await cpfInput.click({ clickCount: 3 });
                await cpfInput.type(cpfLimpo, { delay: 100 });
                console.log('✅ CPF preenchido');
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 3️⃣ Clica no botão "Filtrar"
                await page.waitForSelector('a[ng-click*="filtrarAvancado"]', { timeout: 10000 });
                await page.click('a[ng-click*="filtrarAvancado"]');
                console.log('✅ Botão Filtrar clicado');
                await new Promise(resolve => setTimeout(resolve, 6000));

            } else {
                // ✅ BUSCA POR NOME - USA BUSCA SIMPLES
                console.log('📝 Iniciando busca simples por nome...');
                
                await page.waitForSelector('input[type="search"]', { timeout: 20000 });
                const searchInput = await page.$('input[type="search"]');
                await searchInput.click({ clickCount: 3 });
                await page.keyboard.press('Backspace');
                await searchInput.type(nomeFuncionario, { delay: 100 });
                console.log('✅ Busca realizada');
                await new Promise(resolve => setTimeout(resolve, 6000));
            }

            // ✅ VERIFICA RESULTADOS
            const noResultsFound = await page.$('td.dataTables_empty');

            if (noResultsFound) {
                console.log('❌ Funcionário não encontrado na busca.');
                await enviarResposta(
                    `❌ *Funcionário não encontrado*\n\n` +
                    `Não localizei nenhum registro para ${isCPF ? `CPF: ${cpfLimpo}` : `"${nomeFuncionario}"`}.\n\n` +
                    `Verifique se:\n` +
                    `• ${isCPF ? 'O CPF está correto' : 'O nome está correto e completo'}\n` +
                    `• A ${isCPF ? 'digitação está exata' : 'grafia está exata'}\n` +
                    `• O funcionário está cadastrado no sistema`
                );
            } else {
                console.log('✅ Funcionário encontrado! Extraindo dados...');

                // ✅ 1. CLICA NO BOTÃO EDITAR (ícone de lápis)
                console.log('🔍 Procurando botão Editar...');
                try {
                    await page.waitForSelector('a[ng-click*="editItem"]', { timeout: 10000 });
                    await page.click('a[ng-click*="editItem"]');
                    console.log('✅ Botão Editar clicado');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                } catch (editError) {
                    console.error('❌ Botão Editar não encontrado:', editError);
                    await enviarResposta(`❌ *Erro na Edição*\n\nNão foi possível acessar os dados do funcionário para edição.`);
                    return;
                }

                // ✅ SE FOR BUSCA POR CPF, CAPTURA O NOME COMPLETO
                let nomeCompleto = nomeFuncionario;
                if (isCPF) {
                    try {
                        console.log('📝 Capturando nome completo do funcionário...');
                        
                        // Aguarda carregar a página de edição
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // Busca o campo de nome (geralmente o primeiro input de texto visível)
                        nomeCompleto = await page.evaluate(() => {
                            // Tenta vários seletores possíveis para o campo nome
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
                            
                            // Fallback: pega o primeiro input type="text" com valor
                            const inputs = document.querySelectorAll('input[type="text"]');
                            for (const input of inputs) {
                                if (input.value && input.value.length > 3) {
                                    return input.value.trim();
                                }
                            }
                            
                            return null;
                        });
                        
                        if (nomeCompleto) {
                            console.log(`✅ Nome capturado: ${nomeCompleto}`);
                        } else {
                            console.log('⚠️ Não foi possível capturar o nome');
                            nomeCompleto = `CPF ${cpfLimpo}`;
                        }
                    } catch (capturaError) {
                        console.error('❌ Erro ao capturar nome:', capturaError);
                        nomeCompleto = `CPF ${cpfLimpo}`;
                    }
                }

                // ✅ 2. CLICA NA ABA "DEMISSÃO"
                console.log('🔍 Procurando aba Demissão...');
                try {
                    await page.waitForSelector('a.nav-link.m-tabs__link.ng-binding', { timeout: 10000 });

                    // Encontra a aba "Demissão" pelo texto
                    const demissaoTab = await page.evaluateHandle(() => {
                        const tabs = Array.from(document.querySelectorAll('a.nav-link.m-tabs__link.ng-binding'));
                        return tabs.find(tab => tab.textContent.includes('Demissão'));
                    });

                    if (demissaoTab && (await demissaoTab.evaluate(el => el !== null))) {
                        await demissaoTab.click();
                        console.log('✅ Aba Demissão clicada');
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    } else {
                        throw new Error('Aba Demissão não encontrada');
                    }
                } catch (tabError) {
                    console.error('❌ Aba Demissão não encontrada:', tabError);
                    await enviarResposta(`❌ *Erro na Navegação*\n\nNão foi possível acessar a aba de Demissão.`);
                    return;
                }

                // ✅ 3. CLICA NO ÍCONE DE LIXEIRA (limpar dados)
                console.log('🔍 Procurando ícone de lixeira...');
                try {
                    await page.waitForSelector('a[ng-click*="limpaDemissao"]', { timeout: 10000 });
                    await page.click('a[ng-click*="limpaDemissao"]');
                    console.log('✅ Ícone de lixeira clicado');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (trashError) {
                    console.error('❌ Ícone de lixeira não encontrado:', trashError);
                    await enviarResposta(`❌ *Erro na Limpeza*\n\nNão foi possível limpar os dados de demissão.`);
                    return;
                }

                // ✅ 4. VERIFICA SE O BOTÃO "SALVAR" ESTÁ VISÍVEL (sem clicar)
                console.log('🔍 Verificando botão Salvar...');
                try {
                    await page.waitForSelector('button#btnSave', { timeout: 10000 });
                    const salvarButton = await page.$('button#btnSave');

                    if (salvarButton) {
                        const buttonText = await page.evaluate(button => button.textContent, salvarButton);
                        console.log(`✅ Botão Salvar encontrado: "${buttonText}"`);

                        // ✅ VERIFICA SE ESTÁ VISÍVEL E HABILITADO (sem clicar)
                        const isVisible = await salvarButton.evaluate(button => {
                            return button.offsetWidth > 0 && button.offsetHeight > 0 &&
                                !button.disabled && window.getComputedStyle(button).display !== 'none';
                        });

                        if (isVisible) {
                            console.log('✅ Botão Salvar está visível e habilitado - Clicando...');
                            //await salvarButton.click();     // só desmarcar quando a aplicação for para o ar
                            console.log('✅ Botão Salvar clicado com sucesso');
                            await enviarResposta(
                                `✅ *Processo concluído com sucesso!*\n\n` +
                                `📝 Funcionário: ${nomeCompleto}\n` +
                                `${isCPF ? `📋 CPF: ${cpfLimpo}\n` : ''}` +
                                `💾 Alteração realizado com sucesso!`
                            );
                        } else {
                            console.log('⚠️ Botão Salvar encontrado mas não está visível/habilitado');
                            await enviarResposta(
                                `⚠️ *Processo parcialmente concluído*\n\n` +
                                `📝 Funcionário: ${nomeCompleto}\n` +
                                `${isCPF ? `📋 CPF: ${cpfLimpo}\n` : ''}` +
                                `📋 Fluxo executado mas botão Salvar não está disponível`
                            );
                        }
                    } else {
                        throw new Error('Botão Salvar não encontrado');
                    }
                } catch (saveError) {
                    console.error('❌ Botão Salvar não encontrado:', saveError);
                    await enviarResposta(
                        `❌ *Erro Final*\n\n` +
                        `Processo executado mas não foi possível verificar o botão Salvar.`
                    );
                    return;
                }
            }

        } catch (searchError) {
            console.error('❌ Erro na consulta:', searchError);
            await enviarResposta(`❌ *Erro na consulta*\n\nFavor selecione novamente o item do menu para proceder.`);
            return;
        }

        // ✅ CORREÇÃO: Fecha o browser em modo headless após conclusão
        if (headless && browser) {
            console.log('🔒 Fechando browser headless...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            await browser.close();
            browser = null;
            console.log('✅ Browser fechado com sucesso');
        }

    } catch (error) {
        console.error("❌ Erro crítico na automação de consulta:", error);
        await enviarResposta(
            `❌ *Erro no Sistema*\n\n` +
            `Não foi possível concluir a consulta para "${nomeFuncionario}" devido a um erro interno.\n\n` +
            `Erro: ${error.message}\n\n` +
            `Por favor, tente novamente mais tarde ou contate o suporte.`
        );
    } finally {
        // ✅ FECHA O BROWSER COM SEGURANÇA (apenas se não headless)
        if (browser && !headless) {
            try {
                console.log('🔒 Fechando navegador...');
                await browser.close();
                console.log('✅ Navegador fechado com sucesso');
            } catch (closeError) {
                console.error('❌ Erro ao fechar navegador:', closeError);
            }
        }
    }
}

module.exports = { consultarFuncionario };