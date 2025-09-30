// backend/rhidLogins.js
// Mapeamento de telefones para credenciais do RHID
const loginsRHID = {
  '555192441028': { // +55 51 9244-1028
    usuario: 'admin@gmail.com',
    senha: 'admin12345'
  },
  '555192013748': { // Novo telefone adicionado
    usuario: 'admin@gmail.com',
    senha: 'admin12345'
  }
};

function getCredenciaisRHID(telefone) {
  // Remove qualquer formatação do telefone
  const telefoneLimpo = telefone.replace(/\D/g, '');

  console.log(`🔍 Buscando credenciais para: ${telefoneLimpo}`);

  if (loginsRHID[telefoneLimpo]) {
    console.log(`✅ Credenciais encontradas para ${telefoneLimpo}`);
    return loginsRHID[telefoneLimpo];
  } else {
    console.log(`❌ Nenhuma credencial encontrada para ${telefoneLimpo}`);
    return null;
  }
}

module.exports = { getCredenciaisRHID };