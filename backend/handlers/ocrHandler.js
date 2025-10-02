// backend/handlers/ocrHandler.js - VERSÃO COM FALLBACK SEGURO
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const axios = require('axios');

// Verifica se Google Vision está disponível
let googleVisionDisponivel = false;
let visionClient = null;

try {
  const vision = require('@google-cloud/vision');
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    visionClient = new vision.ImageAnnotatorClient();
    googleVisionDisponivel = true;
    console.log('✅ Google Vision configurado e disponível');
  } else {
    console.log('⚠️ Google Vision: Credenciais não configuradas');
  }
} catch (error) {
  console.log('⚠️ Google Vision não disponível:', error.message);
}

// ESTRATÉGIA 1: TESSERACT (Local)
async function processarComTesseract(bufferImagem) {
  try {
    console.log('🔍 [Tesseract] Iniciando processamento...');
    
    const imagemOtimizada = await sharp(bufferImagem)
      .resize(2500)
      .greyscale()
      .normalise()
      .linear(2.0, 0)
      .sharpen({ sigma: 2.0 })
      .threshold(150)
      .png()
      .toBuffer();

    const { data: { text, confidence } } = await Tesseract.recognize(
      imagemOtimizada,
      'por+eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`📊 [Tesseract] Progresso: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    console.log(`✅ [Tesseract] Concluído! Confiança: ${confidence}`);
    
    const dadosREP = extrairDadosREPCorrigido(text);
    
    return {
      sucesso: true,
      provedor: 'tesseract',
      textoBruto: text,
      confianca: confidence,
      dadosREP: dadosREP
    };
    
  } catch (error) {
    console.error('❌ [Tesseract] Erro:', error.message);
    return {
      sucesso: false,
      provedor: 'tesseract',
      erro: error.message,
      textoBruto: '',
      dadosREP: { numeroREP: null, senha: null }
    };
  }
}

// ESTRATÉGIA 2: OCR.SPACE (API Gratuita)
async function processarComOCRSpace(bufferImagem) {
  try {
    console.log('🌐 [OCR.Space] Iniciando API...');
    
    // Para Node.js, precisamos usar uma abordagem diferente do FormData
    const base64Image = bufferImagem.toString('base64');
    
    const params = new URLSearchParams();
    params.append('apikey', 'helloworld'); // Chave gratuita
    params.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
    params.append('language', 'por');
    params.append('isOverlayRequired', 'false');
    params.append('OCREngine', '2');

    const response = await axios.post(
      'https://api.ocr.space/parse/image',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      }
    );

    const data = response.data;
    
    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage || 'Erro no OCR.Space');
    }

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      throw new Error('Nenhum resultado do OCR.Space');
    }

    const texto = data.ParsedResults[0].ParsedText;
    const confianca = data.ParsedResults[0].FileParseExitCode === 1 ? 0.85 : 0.5;

    console.log(`✅ [OCR.Space] Concluído!`);
    
    const dadosREP = extrairDadosREPCorrigido(texto);
    
    return {
      sucesso: true,
      provedor: 'ocrspace',
      textoBruto: texto,
      confianca: confianca,
      dadosREP: dadosREP
    };

  } catch (error) {
    console.error('❌ [OCR.Space] Erro:', error.message);
    return {
      sucesso: false,
      provedor: 'ocrspace',
      erro: error.message,
      textoBruto: '',
      dadosREP: { numeroREP: null, senha: null }
    };
  }
}

// ESTRATÉGIA 3: GOOGLE VISION (Opcional - só se disponível)
async function processarComGoogleVision(bufferImagem) {
  if (!googleVisionDisponivel || !visionClient) {
    throw new Error('Google Vision não disponível');
  }

  try {
    console.log('☁️ [Google Vision] Iniciando...');
    
    const [result] = await visionClient.textDetection({
      image: { content: bufferImagem.toString('base64') }
    });

    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      throw new Error('Nenhum texto detectado pelo Google Vision');
    }

    const texto = detections[0].description;
    console.log(`✅ [Google Vision] Concluído!`);
    
    const dadosREP = extrairDadosREPCorrigido(texto);
    
    return {
      sucesso: true,
      provedor: 'google-vision',
      textoBruto: texto,
      confianca: 0.95,
      dadosREP: dadosREP
    };

  } catch (error) {
    console.error('❌ [Google Vision] Erro:', error.message);
    throw error; // Propaga o erro para ser tratado no multi-OCR
  }
}

// 🎯 ESTRATÉGIA PRINCIPAL: MULTI-OCR COM FALLBACK SEGURO
async function processarImagemMultiploOCR(bufferImagem) {
  console.log('🚀 INICIANDO PROCESSAMENTO MULTI-ESTRATÉGIA OCR');
  
  // Estratégias base (sempre disponíveis)
  const estrategias = [
    { nome: 'Tesseract', funcao: processarComTesseract },
    { nome: 'OCR.Space', funcao: processarComOCRSpace }
  ];

  // Adiciona Google Vision apenas se estiver disponível
  if (googleVisionDisponivel) {
    estrategias.push({ nome: 'Google Vision', funcao: processarComGoogleVision });
  } else {
    console.log('ℹ️ Google Vision não adicionado (não disponível)');
  }

  let melhorResultado = null;
  let tentativas = [];

  // Executa estratégias em sequência
  for (const estrategia of estrategias) {
    console.log(`\n🔄 Tentando estratégia: ${estrategia.nome}`);
    
    try {
      const resultado = await estrategia.funcao(bufferImagem);
      tentativas.push({
        estrategia: estrategia.nome,
        sucesso: resultado.sucesso,
        dadosREP: resultado.dadosREP,
        confianca: resultado.confianca
      });

      // Se encontrou ambos os dados, usa imediatamente
      if (resultado.sucesso && resultado.dadosREP.numeroREP && resultado.dadosREP.senha) {
        console.log(`🎯 ${estrategia.nome} encontrou REP E SENHA completos!`);
        return resultado;
      }

      // Atualiza melhor resultado
      if (!melhorResultado || ehResultadoMelhor(resultado, melhorResultado)) {
        melhorResultado = resultado;
      }

    } catch (error) {
      console.error(`❌ Erro na estratégia ${estrategia.nome}:`, error.message);
      tentativas.push({
        estrategia: estrategia.nome,
        sucesso: false,
        erro: error.message
      });
    }
  }

  // Log resumo
  console.log('\n📊 RESUMO DAS TENTATIVAS:');
  tentativas.forEach(tentativa => {
    const status = tentativa.sucesso ? '✅' : '❌';
    const rep = tentativa.dadosREP?.numeroREP || 'N/A';
    const senha = tentativa.dadosREP?.senha || 'N/A';
    console.log(`   ${status} ${tentativa.estrategia}: REP=${rep}, Senha=${senha}`);
  });

  // Retorna melhor resultado ou erro
  if (melhorResultado && (melhorResultado.dadosREP.numeroREP || melhorResultado.dadosREP.senha)) {
    console.log(`🏆 Usando melhor resultado de: ${melhorResultado.provedor}`);
    return melhorResultado;
  }

  return {
    sucesso: false,
    provedor: 'multi-strategy',
    erro: 'Todas as estratégias OCR falharam',
    textoBruto: '',
    dadosREP: { numeroREP: null, senha: null },
    tentativas: tentativas
  };
}

// FUNÇÃO DE EXTRAÇÃO INTELIGENTE (MELHORADA)
function extrairDadosREPCorrigido(texto) {
  console.log('🔄 Analisando texto extraído...');
  
  const dados = {
    numeroREP: null,
    senha: null
  };

  try {
    const linhas = texto.split('\n')
      .map(linha => linha.trim())
      .filter(linha => linha.length > 0);

    console.log(`📄 Linhas detectadas: ${linhas.length}`);

    // 🔍 ESTRATÉGIA: Busca todos os números e aplica lógica inteligente
    const todosNumeros = texto.match(/([0-9]{10,20})/g) || [];
    console.log(`🔢 Todos os números encontrados: ${todosNumeros.join(', ')}`);

    if (todosNumeros.length > 0) {
      // REGRA 1: REP é o número MAIS LONGO
      todosNumeros.sort((a, b) => b.length - a.length);
      dados.numeroREP = todosNumeros[0];
      console.log(`✅ REP identificado (mais longo): ${dados.numeroREP}`);

      // REGRA 2: Senha é número que começa com mesmo prefixo mas é mais curto
      if (todosNumeros.length > 1) {
        const prefixoREP = dados.numeroREP.substring(0, 6);
        
        for (const numero of todosNumeros.slice(1)) {
          if (numero.startsWith(prefixoREP) && numero.length < dados.numeroREP.length) {
            dados.senha = numero;
            console.log(`✅ Senha identificada (prefixo compatível): ${dados.senha}`);
            break;
          }
        }
        
        // Fallback: segundo número mais longo
        if (!dados.senha) {
          dados.senha = todosNumeros[1];
          console.log(`✅ Senha identificada (segundo mais longo): ${dados.senha}`);
        }
      }
    }

    // Validação final
    if (dados.numeroREP && dados.senha && dados.numeroREP === dados.senha) {
      console.log('⚠️ CORREÇÃO: REP e Senha iguais');
      dados.senha = null;
    }

    console.log('📋 RESULTADO FINAL:');
    console.log(`   REP: ${dados.numeroREP || 'NÃO ENCONTRADO'} (${dados.numeroREP?.length || 0} dígitos)`);
    console.log(`   Senha: ${dados.senha || 'NÃO ENCONTRADA'} (${dados.senha?.length || 0} dígitos)`);

  } catch (error) {
    console.error('❌ Erro ao extrair dados:', error);
  }

  return dados;
}

// FUNÇÕES AUXILIARES
function ehResultadoMelhor(novo, atual) {
  const novoCompleto = novo.dadosREP.numeroREP && novo.dadosREP.senha;
  const atualCompleto = atual.dadosREP.numeroREP && atual.dadosREP.senha;
  
  if (novoCompleto && !atualCompleto) return true;
  if (!novoCompleto && atualCompleto) return false;
  
  return novo.confianca > atual.confianca;
}

function gerarRespostaOCR(dadosOCR) {
  if (!dadosOCR.sucesso) {
    let mensagem = '❌ Não foi possível ler a imagem com nenhuma estratégia OCR.';
    if (dadosOCR.tentativas) {
      mensagem += '\n\nTentativas:';
      dadosOCR.tentativas.forEach(t => {
        mensagem += `\n• ${t.estrategia}: ${t.sucesso ? '✅' : '❌'} ${t.erro || ''}`;
      });
    }
    return mensagem;
  }

  const { dadosREP, confianca, provedor } = dadosOCR;
  let mensagem = `*Dados identificados (via ${provedor})*:\n`;

  if (dadosREP.numeroREP && dadosREP.senha) {
    mensagem += `✅ REP: ${dadosREP.numeroREP}\n✅ Senha: ${dadosREP.senha}`;
  } else if (dadosREP.numeroREP && !dadosREP.senha) {
    mensagem += `✅ REP: ${dadosREP.numeroREP}\n❌ Senha: Não identificada`;
  } else if (!dadosREP.numeroREP && dadosREP.senha) {
    mensagem += `❌ REP: Não identificado\n✅ Senha: ${dadosREP.senha}`;
  } else {
    mensagem += `❌ REP: Não identificado\n❌ Senha: Não identificada`;
  }

  mensagem += `\n\n_Confiança: ${(confianca * 100).toFixed(1)}%_`;

  return mensagem;
}

module.exports = {
  processarImagemOCR: processarImagemMultiploOCR,
  processarComTesseract,
  processarComOCRSpace,
  processarComGoogleVision,
  extrairDadosREP: extrairDadosREPCorrigido,
  gerarRespostaOCR
};