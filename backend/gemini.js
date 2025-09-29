// gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function gerarRespostaGemini(promptIA, perguntaUsuario) {
  const promptCompleto = `${promptIA}\nUsuário: ${perguntaUsuario}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(promptCompleto);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (err) {
    console.error("❌ Erro na IA Gemini:", err);
    return "⚠️ Erro ao gerar resposta com a IA Gemini.";
  }
}

module.exports = { gerarRespostaGemini };

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

