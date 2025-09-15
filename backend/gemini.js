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

// mistral.js
const axios = require("axios");
require("dotenv").config();

const API_KEY = process.env.MISTRAL_API_KEY;

async function gerarRespostaGemini(promptIA, perguntaUsuario) {
  const promptCompleto = `${promptIA}\nUsuário: ${perguntaUsuario}`;

  try {
    const response = await axios.post(
      "https://api.mistral.ai/v1/chat/completions",
      {
        model: "mistral-small-latest", // pode trocar por "mistral-medium-latest" ou outro
        messages: [
          { role: "system", content: promptIA },
          { role: "user", content: perguntaUsuario }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (err) {
    console.error("❌ Erro na IA Mistral:", err.response?.data || err.message);
    return "⚠️ Erro ao gerar resposta com a IA Mistral.";
  }
}

module.exports = { gerarRespostaGemini };
