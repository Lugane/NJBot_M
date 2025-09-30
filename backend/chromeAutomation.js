// backend/chromeAutomation.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function searchInChrome(query, headless = false) {
  try {
    console.log(`🚀 Abrindo pesquisa em NOVA ABA: "${query}"`);
    
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.google.com/search?q=${encodedQuery}`;
    
    let command;
    
    if (process.platform === 'win32') {
      // Windows - Chrome: nova aba e fecha outras
      command = `start chrome --new-window "${searchUrl}"`;
      
      // Fecha outras instâncias do Chrome primeiro (opcional)
      try {
        await execAsync('taskkill /F /IM chrome.exe', { timeout: 3000 });
        console.log('🔒 Fechando outras instâncias do Chrome...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (killError) {
        console.log('ℹ️ Nenhum Chrome aberto ou não foi possível fechar');
      }
      
    } else if (process.platform === 'darwin') {
      // macOS - Chrome: nova janela
      command = `open -na "Google Chrome" --args --new-window "${searchUrl}"`;
    } else {
      // Linux - Chrome: nova janela
      command = `google-chrome --new-window "${searchUrl}"`;
    }
    
    console.log(`🌐 Executando: ${command}`);
    await execAsync(command, { timeout: 10000 });
    
    console.log(`✅ Nova aba/janela aberta com sucesso!`);
    
    return { 
      success: true, 
      title: `Pesquisa: ${query}`,
      url: searchUrl,
      query: query
    };

  } catch (error) {
    console.error("❌ Erro ao abrir navegador:", error);
    return await tryAlternativeMethod(query);
  }
}

// Método alternativo mais agressivo
async function tryAlternativeMethod(query) {
  try {
    console.log('🔄 Tentando método alternativo...');
    
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.bing.com/search?q=${encodedQuery}`;
    
    let command;
    
    if (process.platform === 'win32') {
      // Método mais agressivo - fecha TUDO e abre novo
      console.log('🔒 Fechando todos os navegadores...');
      try {
        await execAsync('taskkill /F /IM chrome.exe /IM msedge.exe /IM firefox.exe', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.log('ℹ️ Nenhum navegador para fechar ou erro ao fechar');
      }
      
      command = `start chrome --new-window "${searchUrl}"`;
    } else if (process.platform === 'darwin') {
      command = `pkill -x "Google Chrome" && sleep 1 && open -na "Google Chrome" --args --new-window "${searchUrl}"`;
    } else {
      command = `pkill chrome && sleep 1 && google-chrome --new-window "${searchUrl}"`;
    }
    
    console.log(`🌐 Executando comando alternativo: ${command}`);
    await execAsync(command, { timeout: 15000 });
    
    console.log(`✅ Método alternativo funcionou!`);
    
    return { 
      success: true, 
      title: `Pesquisa: ${query}`,
      url: searchUrl,
      query: query,
      method: 'alternative_clean'
    };
    
  } catch (altError) {
    console.error('❌ Método alternativo também falhou:', altError);
    
    // Última tentativa - navegador padrão simples
    return await lastResortMethod(query);
  }
}

// Último recurso - navegador padrão sem fechar nada
async function lastResortMethod(query) {
  try {
    console.log('🆘 Última tentativa...');
    
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.google.com/search?q=${encodedQuery}`;
    
    let command = process.platform === 'win32' 
      ? `start "" "${searchUrl}"`
      : process.platform === 'darwin' 
        ? `open "${searchUrl}"`
        : `xdg-open "${searchUrl}"`;
    
    await execAsync(command, { timeout: 10000 });
    console.log('✅ Última tentativa funcionou!');
    
    return { 
      success: true, 
      title: `Pesquisa: ${query}`,
      url: searchUrl,
      query: query,
      method: 'last_resort'
    };
    
  } catch (finalError) {
    console.error('❌ Todas as tentativas falharam:', finalError);
    return { 
      success: false, 
      error: 'Não foi possível abrir o navegador',
      query: query
    };
  }
}

module.exports = { searchInChrome };