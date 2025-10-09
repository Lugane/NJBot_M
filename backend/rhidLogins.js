// rhidLogins.js
function getCredenciaisRHID(telefone, menuSelecionado = null) {
  const logins = {
    '555192013748': { 
      // ✅ Menu 1 (REP bloqueado) - suportelugane
      menu1: {
        usuario: 'suportelugane@gmail.com',
        senha: 'Lock203001'
      },
      // ✅ Menu 2 (Horários e Folha) - Cocobambu
      menu2: {
        usuario: 'lugane@cocobambu.com',
        senha: 'Lock203001'
      }
    }
  };

  // Se não encontrou o telefone, retorna null
  if (!logins[telefone]) {
    return null;
  }

  // ✅ CORREÇÃO: Verifica se é estrutura nova com menus
  const credencial = logins[telefone];
  
  if (credencial.menu1 && credencial.menu2) {
    // Estrutura nova com menus separados
    if (menuSelecionado === 'menu2') {
      return credencial.menu2; // Cocobambu para Menu 2
    } else {
      return credencial.menu1; // suportelugane para Menu 1 (default)
    }
  } else {
    // Estrutura antiga (compatibilidade)
    return credencial;
  }
}

module.exports = { getCredenciaisRHID };