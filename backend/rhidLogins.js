// backend/rhidLogins.js
// Mapeamento de telefones para credenciais do RHID
const loginsRHID = {
  '555196624904': { 
    usuario: 'suportelugane@gmail.com',
    senha: 'Lock203001'
  },
  '555192013748': { 
    usuario: 'suportelugane@gmail.com',
    senha: 'Lock203001'
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