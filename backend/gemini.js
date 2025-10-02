// // gemini.js
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// require('dotenv').config();

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// async function gerarRespostaGemini(promptIA, perguntaUsuario) {
//   const promptCompleto = `${promptIA}\nUsuário: ${perguntaUsuario}`;

//   try {
//     const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

//     const result = await model.generateContent(promptCompleto);
//     const response = await result.response;
//     const text = response.text();

//     return text;
//   } catch (err) {
//     console.error("❌ Erro na IA Gemini:", err);
//     return "⚠️ Erro ao gerar resposta com a IA Gemini.";
//   }
// }

// module.exports = { gerarRespostaGemini };

// apertus.js
// const axios = require('axios');
// require('dotenv').config();

// const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
// const API_URL = "https://router.huggingface.co/v1/chat/completions";
// async function gerarRespostaGemini(promptIA, perguntaUsuario) {
//   const promptCompleto = `${promptIA}\nUsuário: ${perguntaUsuario}`;

//   try {
//     const payload = {
//       messages:[
//         {role: "user", content: promptCompleto}
//       ],
//       model: "swiss-ai/Apertus-8B-Instruct-2509:publicai"
//     };
//     const response = await axios.post(API_URL,payload,{
//       headers:{
//         'Authorization':`Bearer ${HF_TOKEN}`,
//         'Content_Type':'application/json'
//       },
//       timeout: 30000
//     });
//     const answer = response.data.choices[0].message.content;
//     return answer;
//   } catch (err) {
//     console.error("❌ Erro na IA Apertus:", err);
//     return "⚠️ Erro ao gerar resposta com a IA Apertus.";
//   }
// }

// module.exports = { gerarRespostaGemini};

// backend/gemini.js
const axios = require('axios');
require('dotenv').config();

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
const API_URL = "https://router.huggingface.co/v1/chat/completions";

async function gerarRespostaGemini(promptCompleto, mensagemUsuario) {
  try {
    console.log('🤖 Consultando Apertus-8B...');
    console.log('📝 Mensagem do usuário:', mensagemUsuario);

    const payload = {
      messages: [
        { role: "system", content: promptCompleto.split('\n\n')[0] }, // Prompt do sistema
        { role: "user", content: mensagemUsuario } // Mensagem do usuário
      ],
      model: "swiss-ai/Apertus-8B-Instruct-2509:publicai",
      max_tokens: 500,
      temperature: 0.7
    };
    
    const response = await axios.post(API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    if (!response.data?.choices?.[0]?.message?.content) {
      console.error('❌ Resposta da API inválida:', response.data);
      throw new Error('Resposta vazia da API');
    }

    const answer = response.data.choices[0].message.content.trim();
    console.log('✅ Apertus respondeu:', answer.substring(0, 100) + '...');
    
    return answer;
    
  } catch (err) {
    console.error("❌ Erro na IA Apertus:", err.message);
    
    // Log detalhado do erro
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Dados:', err.response.data);
    }
    
    // Retorna erro para ser tratado no handleMensagem
    throw err;
  }
}

module.exports = { gerarRespostaGemini };

module.exports = { gerarRespostaGemini };

// // mistral.js
// const axios = require("axios");
// require("dotenv").config();

// const API_KEY = process.env.MISTRAL_API_KEY;

// async function gerarRespostaGemini(promptIA, perguntaUsuario) {
//   const promptCompleto = `${promptIA}\nUsuário: ${perguntaUsuario}`;

//   try {
//     const response = await axios.post(
//       "https://api.mistral.ai/v1/chat/completions",
//       {
//         model: "mistral-small-latest", // pode trocar por "mistral-medium-latest" ou outro
//         messages: [
//           { role: "system", content: promptIA },
//           { role: "user", content: perguntaUsuario }
//         ]
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${API_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     return response.data.choices[0].message.content;
//   } catch (err) {
//     console.error("❌ Erro na IA Mistral:", err.response?.data || err.message);
//     return "⚠️ Erro ao gerar resposta com a IA Mistral.";
//   }
// }

// module.exports = { gerarRespostaGemini };
