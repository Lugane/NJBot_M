// backend/handlers/ocrHandler.js - VERSÃO OTIMIZADA
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

// Função principal para processar imagens
async function processarImagemOCR(bufferImagem) {
  try {
    console.log('🔍 Iniciando OCR...');
    
    // PRÉ-PROCESSAMENTO DA IMAGEM
    const imagemOtimizada = await otimizarImagemParaOCR(bufferImagem);
    
    const { data: { text, confidence } } = await Tesseract.recognize(
      imagemOtimizada,
      'por+eng', // Português + Inglês
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`📊 Progresso OCR: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    console.log(`✅ OCR concluído! Confiança: ${confidence}`);
    console.log(`📝 Texto extraído:\n"${text}"`);
    
    // Processa o texto extraído
    const dadosREP = extrairDadosREP(text);
    
    return {
      sucesso: true,
      textoBruto: text,
      confianca: confidence,
      dadosREP: dadosREP
    };
    
  } catch (error) {
    console.error('❌ Erro no processamento OCR:', error);
    return {
      sucesso: false,
      erro: error.message,
      textoBruto: '',
      dadosREP: { numeroREP: null, senha: null }
    };
  }
}

// Função para otimizar imagem para OCR
async function otimizarImagemParaOCR(bufferImagem) {
  try {
    console.log('🖼️ Otimizando imagem para OCR...');
    
    return await sharp(bufferImagem)
      .resize(2000) // Aumentar tamanho para melhor resolução
      .greyscale() // Converter para escala de cinza
      .normalise() // Normalizar brilho e contraste
      .linear(1.3, 0) // Aumentar contraste
      .sharpen({ sigma: 1.5 }) // Aumentar nitidez
      .threshold(128) // Binarização (preto e branco)
      .png()
      .toBuffer();
      
  } catch (error) {
    console.log('⚠️ Usando imagem original sem otimização');
    return bufferImagem;
  }
}

// Função para extrair dados do REP - VERSÃO MAIS FLEXÍVEL
function extrairDadosREP(texto) {
  console.log('🔄 Analisando texto extraído...');
  
  const dados = {
    numeroREP: null,
    senha: null
  };

  try {
    // Divide o texto em linhas para análise mais precisa
    const linhas = texto.split('\n').filter(linha => linha.trim().length > 0);
    
    console.log(`📄 Linhas detectadas: ${linhas.length}`);
    linhas.forEach((linha, index) => {
      console.log(`   Linha ${index + 1}: "${linha}"`);
    });

    // 🔍 BUSCA POR NÚMERO DO REP
    for (const linha of linhas) {
      // Padrões para número do REP
      if (linha.match(/N[úu]mero do REP/i) || linha.match(/REP/i)) {
        const numeros = linha.match(/([0-9]{10,20})/);
        if (numeros) {
          dados.numeroREP = numeros[1];
          console.log(`✅ REP encontrado na linha: "${linha}"`);
          break;
        }
      }
    }

    // Fallback: procura qualquer número longo (15-17 dígitos)
    if (!dados.numeroREP) {
      const numeroLongo = texto.match(/([0-9]{15,17})/);
      if (numeroLongo) {
        dados.numeroREP = numeroLongo[1];
        console.log(`✅ REP encontrado (fallback): ${dados.numeroREP}`);
      }
    }

    // 🔍 BUSCA POR SENHA/CONTRA SENHA
    for (const linha of linhas) {
      // Padrões para senha
      if (linha.match(/Contra Senha/i) || linha.match(/Senha/i) || linha.match(/Password/i)) {
        const numeros = linha.match(/([0-9]{6,12})/);
        if (numeros) {
          dados.senha = numeros[1];
          console.log(`✅ Senha encontrada na linha: "${linha}"`);
          break;
        }
      }
    }

    // Fallback: procura números médios que não sejam o REP
    if (!dados.senha) {
      const todosNumeros = texto.match(/([0-9]{6,12})/g);
      if (todosNumeros) {
        for (const numero of todosNumeros) {
          if (!dados.numeroREP || numero !== dados.numeroREP) {
            dados.senha = numero;
            console.log(`✅ Senha encontrada (fallback): ${dados.senha}`);
            break;
          }
        }
      }
    }

    console.log('📋 RESULTADO FINAL:');
    console.log(`   REP: ${dados.numeroREP || 'NÃO ENCONTRADO'}`);
    console.log(`   Senha: ${dados.senha || 'NÃO ENCONTRADA'}`);

  } catch (error) {
    console.error('❌ Erro ao extrair dados:', error);
  }

  return dados;
}

// Função para gerar resposta
function gerarRespostaOCR(dadosOCR) {
  if (!dadosOCR.sucesso) {
    return '❌ Não foi possível ler a imagem. Envie uma foto mais nítida do REP.';
  }

  const { dadosREP, confianca } = dadosOCR;

  if (dadosREP.numeroREP && dadosREP.senha) {
    return `*Dados identificados:*\nREP: ${dadosREP.numeroREP}\nSenha: ${dadosREP.senha}`;
  }
  
  if (dadosREP.numeroREP || dadosREP.senha) {
    let resposta = `*Dados parciais:*\n`;
    if (dadosREP.numeroREP) resposta += `✅ REP: ${dadosREP.numeroREP}\n`;
    else resposta += `❌ REP: Não identificado\n`;
    
    if (dadosREP.senha) resposta += `✅ Senha: ${dadosREP.senha}`;
    else resposta += `❌ Senha: Não identificada`;
    
    return resposta;
  }
  
  return `❌ Não consegui identificar os dados.\nConfiança do OCR: ${(confianca * 100).toFixed(1)}%`;
}

module.exports = {
  processarImagemOCR,
  extrairDadosREP,
  gerarRespostaOCR
};