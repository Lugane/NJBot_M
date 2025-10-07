// backend/handlers/ocrHandler.js 
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const axios = require('axios');

async function removerSobreposicaoVermelha(bufferImagem) {
  try {
    console.log('🎨 [Pré-processamento] Removendo sobreposição vermelha...');

    // Carrega a imagem e obtém os dados dos pixels
    const { data, info } = await sharp(bufferImagem)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const outputBuffer = Buffer.alloc(width * height * channels);

    // Itera sobre os pixels para identificar e remover o vermelho
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Condição para identificar o vermelho (pode precisar de ajuste fino)
      // Ex: vermelho intenso com pouco verde e azul
      if (r > 150 && g < 100 && b < 100) {
        // Substitui o pixel vermelho por preto (ou branco, dependendo do fundo)
        outputBuffer[i] = 0;     // R
        outputBuffer[i + 1] = 0; // G
        outputBuffer[i + 2] = 0; // B
      } else {
        // Mantém o pixel original
        outputBuffer[i] = r;
        outputBuffer[i + 1] = g;
        outputBuffer[i + 2] = b;
      }
      if (channels === 4) { // Se houver canal alfa
        outputBuffer[i + 3] = data[i + 3];
      }
    }

    // Converte o buffer de volta para uma imagem JPEG, com qualidade para reduzir tamanho
    const imagemLimpa = await sharp(outputBuffer, { raw: info })
      .jpeg({ quality: 80 }) // Ajustar qualidade para reduzir tamanho
      .toBuffer();

    console.log('✅ [Pré-processamento] Sobreposição vermelha removida.');
    return imagemLimpa;

  } catch (error) {
    console.error('❌ [Pré-processamento] Erro ao remover sobreposição vermelha:', error.message);
    return bufferImagem; // Retorna a imagem original em caso de erro
  }
}

// ESTRATÉGIA 1: TESSERACT (Local)
async function processarComTesseract(bufferImagem) {
  try {
    console.log('🔍 [Tesseract] Iniciando processamento...');

    const imagemSemSobreposicao = await removerSobreposicaoVermelha(bufferImagem);
    const imagemOtimizada = await sharp(imagemSemSobreposicao)
      .resize(2000) // Reduzir o redimensionamento para evitar arquivos muito grandes
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
    const imagemSemSobreposicao = await removerSobreposicaoVermelha(bufferImagem);
    const base64Image = imagemSemSobreposicao.toString('base64');

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

// 🎯 ESTRATÉGIA PRINCIPAL: MULTI-OCR COM FALLBACK SEGURO
async function processarImagemMultiploOCR(bufferImagem) {
  console.log('🚀 INICIANDO PROCESSAMENTO MULTI-ESTRATÉGIA OCR');

  // Apenas as duas estratégias disponíveis
  const estrategias = [
    { nome: 'Tesseract', funcao: processarComTesseract },
    { nome: 'OCR.Space', funcao: processarComOCRSpace }
  ];

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
  console.log('🔍 Analisando texto do REP...');

  const dados = {
    numeroREP: null,
    senha: null
  };

  try {
    const linhas = texto.split('\n')
      .map(linha => linha.trim())
      .filter(linha => linha.length > 0);

    console.log(`📄 Linhas detectadas: ${linhas.length}`);

    // ESTRATÉGIA 1: Busca por contexto específico (prioritária)
    console.log('🔄 Buscando por contexto específico...');

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].toLowerCase();

      // Normaliza erros comuns de OCR para a linha atual
      const linhaNormalizada = linha
        .replace(/o/g, '0')
        .replace(/[il]/g, '1')
        .replace(/s/g, '5');

      // Extração do REP
      if (linhaNormalizada.includes('numero do rep:') || linhaNormalizada.includes('numero do rep') || linhaNormalizada.includes('rep:')) {
        let repMatch = linhaNormalizada.match(/([0-9]{15,18})/);
        if (repMatch) {
          dados.numeroREP = repMatch[1];
          console.log(`✅ REP identificado por contexto: ${dados.numeroREP}`);
        } else {
          // Tenta buscar nas próximas linhas se não encontrou na mesma
          for (let j = i + 1; j < Math.min(i + 3, linhas.length); j++) {
            repMatch = linhas[j].toLowerCase().match(/([0-9]{15,18})/);
            if (repMatch) {
              dados.numeroREP = repMatch[1];
              console.log(`✅ REP identificado por contexto (linha seguinte): ${dados.numeroREP}`);
              break;
            }
          }
        }
      }

      // Extração da Senha
      if (linhaNormalizada.includes('senha:') || linhaNormalizada.includes('senha')) {
        let senhaMatch = linhaNormalizada.match(/([0-9]{10})/);

        if (!senhaMatch) {
          // Tenta buscar nas próximas linhas se não encontrou na mesma
          for (let j = i + 1; j < Math.min(i + 3, linhas.length); j++) {
            senhaMatch = linhas[j].toLowerCase().match(/([0-9]{10})/);
            if (senhaMatch) {
              break;
            }
          }
        }

        if (senhaMatch) {
          let senhaExtraida = senhaMatch[1];

          // 🔧 Correções automáticas para a senha
          // Se começar com "4" e a imagem sugere "1"
          if (senhaExtraida.startsWith("4")) {
            console.log(`⚠️ Corrigindo primeiro dígito da senha de 4 para 1: ${senhaExtraida}`);
            senhaExtraida = "1" + senhaExtraida.substring(1);
          }
          // Outras correções comuns (ex: 9 por 1)
          senhaExtraida = senhaExtraida.replace(/9/g, '1'); // Exemplo: se 9 for frequentemente lido como 1

          dados.senha = senhaExtraida;
          console.log(`✅ Senha final: ${dados.senha}`);
        }
      }
    }

    // ESTRATÉGIA 2: Fallback - Busca por números longos se contexto falhou
    if (!dados.numeroREP || !dados.senha) {
      console.log('🔄 Contexto falhou, buscando por números longos...');
      const todosNumeros = texto.match(/([0-9]{10,18})/g) || [];
      console.log(`🔢 Números encontrados: ${todosNumeros.join(', ')}`);

      const numerosUnicos = [...new Set(todosNumeros)];

      const candidatosREP = numerosUnicos.filter(n => n.length >= 15 && n.length <= 18);
      const candidatosSenha = numerosUnicos.filter(n => n.length === 10);

      console.log(`🎯 Candidatos REP (fallback): ${candidatosREP.join(', ')}`);
      console.log(`🎯 Candidatos Senha (fallback): ${candidatosSenha.join(', ')}`);

      if (!dados.numeroREP && candidatosREP.length > 0) {
        candidatosREP.sort((a, b) => b.length - a.length);
        dados.numeroREP = candidatosREP[0];
        console.log(`✅ REP identificado (fallback): ${dados.numeroREP}`);
      }

      if (!dados.senha && candidatosSenha.length > 0) {
        if (dados.numeroREP) {
          const senhasValidas = candidatosSenha.filter(senha => senha !== dados.numeroREP);
          if (senhasValidas.length > 0) {
            dados.senha = senhasValidas[0];
          } else {
            dados.senha = candidatosSenha[0];
          }
        } else {
          dados.senha = candidatosSenha[0];
        }
        console.log(`✅ Senha identificada (fallback): ${dados.senha}`);
      }
    }

    // VALIDAÇÃO FINAL
    console.log('📋 RESULTADO FINAL:');
    console.log(`   REP: ${dados.numeroREP || 'NÃO ENCONTRADO'}`);
    console.log(`   Senha: ${dados.senha || 'NÃO ENCONTRADA'}`);

    // Corrige formato se necessário
    if (dados.numeroREP && dados.numeroREP.length > 18) {
      dados.numeroREP = dados.numeroREP.substring(0, 18);
      console.log(`🔧 REP truncado para: ${dados.numeroREP}`);
    }

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
  extrairDadosREP: extrairDadosREPCorrigido,
  gerarRespostaOCR
};