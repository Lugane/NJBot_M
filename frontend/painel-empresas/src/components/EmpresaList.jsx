
// import React, { useEffect, useState } from 'react';
// import styled from 'styled-components';
// import api from '../services/api';

// const Container = styled.div`
//   max-width: 720px;
//   margin: 3rem auto;
//   padding: 2rem;
//   background-color: #ffffff;
//   border-radius: 12px;
//   box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
//   font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
// `;

// const Title = styled.h2`
//   text-align: center;
//   margin-bottom: 2.5rem;
//   color: #1e293b;
//   font-size: 1.8rem;
// `;

// const Input = styled.input`
//   width: 96%;
//   padding: 0.6rem 0.9rem;
//   margin: 0.4rem 0 1rem;
//   font-size: 1rem;
//   border: 1.5px solid #cbd5e1;
//   border-radius: 8px;
//   transition: border 0.2s;

//   &:focus {
//     border-color: #2563eb;
//     outline: none;
//     box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
//   }
// `;

// const TextArea = styled.textarea`
//   width: 100%;
//   padding: 0.7rem 0.9rem;
//   margin: 0.4rem 0 1rem;
//   font-size: 1rem;
//   border: 1.5px solid #cbd5e1;
//   border-radius: 8px;
//   min-height: 120px;
//   resize: vertical;
//   transition: border 0.2s;

//   &:focus {
//     border-color: #2563eb;
//     outline: none;
//     box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
//   }
// `;

// const Label = styled.label`
//   display: flex;
//   align-items: center;
//   gap: 0.5rem;
//   margin: 1rem 0 0.5rem;
//   font-weight: 500;
//   color: #1f2937;
// `;

// const Button = styled.button`
//   padding: 0.55rem 1.2rem;
//   font-weight: 600;
//   font-size: 0.95rem;
//   border-radius: 8px;
//   border: none;
//   cursor: pointer;
//   background-color: #2563eb;
//   color: white;
//   transition: background 0.2s;
//   margin-right: 0.75rem;

//   &:hover:not(:disabled) {
//     background-color: #1e40af;
//   }

//   &:disabled {
//     background-color: #9ca3af;
//     cursor: not-allowed;
//   }
// `;

// const ButtonSecondary = styled(Button)`
//   background-color: #e2e8f0;
//   color: #1e293b;

//   &:hover {
//     background-color: #cbd5e1;
//   }
// `;

// const ButtonDanger = styled(Button)`
//   background-color: #dc2626;

//   &:hover {
//     background-color: #b91c1c;
//   }
// `;

// const Item = styled.div`
//   background-color: #f8fafc;
//   border: 1.5px solid #d1d5db;
//   border-radius: 12px;
//   padding: 1.2rem 1.5rem;
//   margin-bottom: 2rem;
// `;

// const Strong = styled.strong`
//   font-size: 1.2rem;
//   color: #111827;
// `;

// const Paragraph = styled.p`
//   margin: 0.3rem 0;
//   color: #374151;
//   font-size: 0.95rem;
// `;

// const MessageError = styled.p`
//   color: #dc2626;
//   text-align: center;
//   font-weight: 600;
//   margin-bottom: 1rem;
// `;

// const QRCodeWrapper = styled.div`
//   margin-top: 1.2rem;
//   text-align: center;

//   p {
//     margin-bottom: 0.5rem;
//     color: #1f2937;
//   }

//   img {
//     width: 200px;
//     height: 200px;
//     border-radius: 12px;
//     box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
//   }
// `;

// const EmpresasList = () => {
//   const [empresas, setEmpresas] = useState([]);
//   const [qrCodes, setQrCodes] = useState({});
//   const [searchTerm, setSearchTerm] = useState('');
//   const [empresaEditando, setEmpresaEditando] = useState(null);
//   const [formData, setFormData] = useState({
//     nome: '',
//     telefone: '',
//     promptIA: '',
//     botAtivo: true
//   });
//   const [erro, setErro] = useState('');
//   const [loadingEmpresa, setLoadingEmpresa] = useState(null);

//   useEffect(() => {
//     const fetchEmpresas = async () => {
//       try {
//         const res = await api.get('/empresas');
//         setEmpresas(res.data);
//       } catch (err) {
//         console.error('Erro ao buscar empresas:', err);
//       }
//     };
//     fetchEmpresas();
//   }, []);

//   const iniciarEdicao = (empresa) => {
//     setErro('');
//     setEmpresaEditando(empresa._id);
//     setFormData({
//       nome: empresa.nome || '',
//       telefone: empresa.telefone || '',
//       promptIA: empresa.promptIA || '',
//       botAtivo: empresa.botAtivo ?? true
//     });
//   };

//   const salvarEdicao = async (idEmpresa) => {
//     setErro('');

//     if (!formData.nome.trim() || !formData.telefone.trim() || !formData.promptIA.trim()) {
//       setErro('Preencha todos os campos obrigatórios.');
//       return;
//     }

//     const payload = {
//       nome: formData.nome.trim(),
//       telefone: formData.telefone.trim(),
//       promptIA: formData.promptIA.trim(),
//       botAtivo: formData.botAtivo
//     };

//     try {
//       const res = await api.put(`/empresas/${idEmpresa}`, payload);
//       setEmpresas((prev) => prev.map((e) => (e._id === idEmpresa ? res.data : e)));
//       setEmpresaEditando(null);
//     } catch (err) {
//       console.error('Erro ao editar empresa:', err);
//       setErro('Erro ao salvar empresa. Tente novamente.');
//     }
//   };

//   const cancelarEdicao = () => {
//     setEmpresaEditando(null);
//     setFormData({ nome: '', telefone: '', promptIA: '', botAtivo: true });
//     setErro('');
//   };

//   const apagarEmpresa = async (idEmpresa) => {
//     const empresa = empresas.find(e => e._id === idEmpresa);
//     if (!empresa) return;

//     if (!window.confirm(`Deseja excluir a empresa "${empresa.nome}"?`)) return;

//     try {
//       await api.delete(`/empresas/${idEmpresa}`);
//       setEmpresas((prev) => prev.filter((e) => e._id !== idEmpresa));
//     } catch (err) {
//       console.error('Erro ao excluir empresa:', err);
//       alert('Erro ao excluir empresa.');
//     }
//   };

//   const alternarStatusBot = async (idEmpresa) => {
//     try {
//       const res = await api.put(`/empresas/${idEmpresa}/toggle-bot`);
//       setEmpresas((prev) =>
//         prev.map((e) =>
//           e._id === idEmpresa ? { ...e, botAtivo: res.data.botAtivo } : e
//         )
//       );
//     } catch (err) {
//       console.error('Erro ao alternar status do bot:', err);
//       alert('Erro ao alternar status do bot.');
//     }
//   };

//   const gerarNovoQrCode = async (idEmpresa, nomeEmpresa) => {
//     try {
//       setLoadingEmpresa(idEmpresa);
//       const res = await api.post(`/reiniciar-bot/${idEmpresa}`);
//       setQrCodes((prev) => ({
//         ...prev,
//         [nomeEmpresa]: res.data.qrCode,
//       }));
//     } catch (err) {
//       console.error('Erro ao gerar novo QR Code:', err);
//       alert('Erro ao gerar QR Code.');
//     } finally {
//       setLoadingEmpresa(null);
//     }
//   };

//   const empresasFiltradas = empresas.filter((empresa) =>
//     empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     empresa.telefone.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <Container>
//       <Title>Empresas:</Title>
//       <Input
//         type="text"
//         placeholder="Buscar por nome ou telefone..."
//         value={searchTerm}
//         onChange={(e) => setSearchTerm(e.target.value)}
//         style={{ marginBottom: '1.5rem' }}
//       />

//       {erro && <MessageError>{erro}</MessageError>}

//       {empresasFiltradas.map((empresa) => (
//         <Item key={empresa._id}>
//           {empresaEditando === empresa._id ? (
//             <>
//               <Input
//                 type="text"
//                 placeholder="Nome"
//                 value={formData.nome}
//                 onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
//               />
//               <Input
//                 type="text"
//                 placeholder="Telefone"
//                 value={formData.telefone}
//                 onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
//               />
//               <TextArea
//                 placeholder="Prompt da IA"
//                 value={formData.promptIA}
//                 onChange={(e) => setFormData({ ...formData, promptIA: e.target.value })}
//               />
//               <Label>
//                 <input
//                   type="checkbox"
//                   checked={formData.botAtivo}
//                   onChange={(e) => setFormData({ ...formData, botAtivo: e.target.checked })}
//                 />
//                 Bot ativo
//               </Label>
//               <Button onClick={() => salvarEdicao(empresa._id)}>Salvar</Button>
//               <ButtonSecondary onClick={cancelarEdicao}>Cancelar</ButtonSecondary>
//             </>
//           ) : (
//             <>
//               <Strong>{empresa.nome}</Strong>
//               <Paragraph>Telefone: {empresa.telefone}</Paragraph>
//               <Paragraph><strong>Prompt IA:</strong> {empresa.promptIA}</Paragraph>
//               <Label>
//                 <input
//                   type="checkbox"
//                   checked={empresa.botAtivo}
//                   onChange={() => alternarStatusBot(empresa._id)}
//                 />
//                 Bot ativo
//               </Label>
//               <Button
//                 onClick={() => gerarNovoQrCode(empresa._id, empresa.nome)}
//                 disabled={loadingEmpresa === empresa._id}
//               >
//                 {loadingEmpresa === empresa._id ? 'Gerando QR Code...' : 'Gerar QR Code'}
//               </Button>
//               {qrCodes[empresa.nome] && (
//                 <QRCodeWrapper>
//                   <p>QR Code:</p>
//                   <img src={qrCodes[empresa.nome]} alt={`QR Code - ${empresa.nome}`} />
//                 </QRCodeWrapper>
//               )}
//               <Button onClick={() => iniciarEdicao(empresa)}>Editar</Button>
//               <ButtonDanger onClick={() => apagarEmpresa(empresa._id)}>Excluir</ButtonDanger>
//             </>
//           )}
//         </Item>
//       ))}
//     </Container>
//   );
// };

// export default EmpresasList;

// // ARRUMAR ESSA PARTE DAS LISTAGENS DAS EMPRESAS

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import api from '../services/api';

const Container = styled.div`
  max-width: 720px;
  margin: 3rem auto;
  padding: 2rem;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 2.5rem;
  color: #1e293b;
  font-size: 1.6rem;
`;

const Input = styled.input`
  width: 96%;
  padding: 0.6rem 0.9rem;
  margin: 0.4rem 0 1rem;
  font-size: 1rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  transition: border 0.2s;

  &:focus {
    border-color: #2563eb;
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.7rem 0.9rem;
  margin: 0.4rem 0 1rem;
  font-size: 1rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  min-height: 120px;
  resize: vertical;
  transition: border 0.2s;

  &:focus {
    border-color: #2563eb;
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  }
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.9rem 0 0.5rem;
  font-weight: 500;
  color: #1f2937;
`;

const Button = styled.button`
  padding: 0.55rem 1.2rem;
  font-weight: 600;
  font-size: 0.95rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  background-color: #2563eb;
  color: white;
  transition: background 0.2s;
  margin-right: 0.75rem;
  margin-top: 0.5rem;

  &:hover:not(:disabled) {
    background-color: #1e40af;
  }

  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
`;

const ButtonSecondary = styled(Button)`
  background-color: #e2e8f0;
  color: #1e293b;

  &:hover {
    background-color: #cbd5e1;
  }
`;

const ButtonDanger = styled(Button)`
  background-color: #dc2626;

  &:hover {
    background-color: #b91c1c;
  }
`;

const Item = styled.div`
  background-color: #88b4df2f;
  border: 1.5px solid #d1d5db;
  border-radius: 12px;
  padding: 1.2rem 1.5rem;
  margin-bottom: 2rem;
`;

const Strong = styled.strong`
  color: #02225cff;
  margin-bottom: 3.5rem;
  font-size: 1.3rem;
  font-family: sans-serif;
`;

const Paragraph = styled.p`
  margin: 0.3rem 0;
  color: #292424ff;
  font-size: 0.95rem;
  font-weight: 600;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
`;

const PromptContainer = styled.div`
  margin: 0.3rem 0;
  color: #374151;
  font-size: 0.95rem;
  position: relative;
`;

const PromptContent = styled.div`
  max-height: ${(props) => (props.expanded ? 'none' : '6.8em')}; /* ~5 linhas */
  overflow: hidden;
  position: relative;
  line-height: 1.35em;
  color: #1f1c1cff;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: #2563eb;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  margin-top: 0.3rem;

  &:hover {
    text-decoration: underline;
  }
`;

const MessageError = styled.p`
  color: #dc2626;
  text-align: center;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const Ia = styled.div`
  border: 1px solid #1570ac4b;
  color: #156facff;
  border-radius: 8px;
  padding: 0.3rem 0.7rem;
  background-color: #4173d650;
  width: 6%;
  margin-top: 1.3rem;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
`;

const QRCodeWrapper = styled.div`
  margin-top: 1.2rem;
  text-align: center;

  p {
    margin-bottom: 0.5rem;
    color: #1f2937;
  }

  img {
    width: 200px;
    height: 200px;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
`;

const EmpresasList = () => {
  const [empresas, setEmpresas] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    promptIA: '',
    botAtivo: true
  });
  const [erro, setErro] = useState('');
  const [loadingEmpresa, setLoadingEmpresa] = useState(null);
  const [expandedPrompts, setExpandedPrompts] = useState({}); // controla "ver mais/menos"

  const [statusBots, setStatusBots] = useState({});

  useEffect(() => {
    async function fetchStatus() {
      const res = await fetch("/api/bots/status");
      const data = await res.json();
      setStatusBots(data);
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const res = await api.get('/empresas');
        setEmpresas(res.data);
      } catch (err) {
        console.error('Erro ao buscar empresas:', err);
      }
    };
    fetchEmpresas();
  }, []);

  const iniciarEdicao = (empresa) => {
    setErro('');
    setEmpresaEditando(empresa._id);
    setFormData({
      nome: empresa.nome || '',
      telefone: empresa.telefone || '',
      promptIA: empresa.promptIA || '',
      botAtivo: empresa.botAtivo ?? true
    });
  };

  const salvarEdicao = async (idEmpresa) => {
    setErro('');

    if (!formData.nome.trim() || !formData.telefone.trim() || !formData.promptIA.trim()) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }

    const payload = {
      nome: formData.nome.trim(),
      telefone: formData.telefone.trim(),
      promptIA: formData.promptIA.trim(),
      botAtivo: formData.botAtivo
    };

    try {
      const res = await api.put(`/empresas/${idEmpresa}`, payload);
      setEmpresas((prev) => prev.map((e) => (e._id === idEmpresa ? res.data : e)));
      setEmpresaEditando(null);
    } catch (err) {
      console.error('Erro ao editar empresa:', err);
      setErro('Erro ao salvar empresa. Tente novamente.');
    }
  };

  const cancelarEdicao = () => {
    setEmpresaEditando(null);
    setFormData({ nome: '', telefone: '', promptIA: '', botAtivo: true });
    setErro('');
  };

  const apagarEmpresa = async (idEmpresa) => {
    const empresa = empresas.find(e => e._id === idEmpresa);
    if (!empresa) return;

    if (!window.confirm(`Deseja excluir a empresa "${empresa.nome}"?`)) return;

    try {
      await api.delete(`/empresas/${idEmpresa}`);
      setEmpresas((prev) => prev.filter((e) => e._id !== idEmpresa));
    } catch (err) {
      console.error('Erro ao excluir empresa:', err);
      alert('Erro ao excluir empresa.');
    }
  };

  const alternarStatusBot = async (idEmpresa) => {
    try {
      const res = await api.put(`/empresas/${idEmpresa}/toggle-bot`);
      setEmpresas((prev) =>
        prev.map((e) =>
          e._id === idEmpresa ? { ...e, botAtivo: res.data.botAtivo } : e
        )
      );
    } catch (err) {
      console.error('Erro ao alternar status do bot:', err);
      alert('Erro ao alternar status do bot.');
    }
  };

  const gerarNovoQrCode = async (idEmpresa, nomeEmpresa) => {
    try {
      setLoadingEmpresa(idEmpresa);
      const res = await api.post(`/reiniciar-bot/${idEmpresa}`);
      setQrCodes((prev) => ({
        ...prev,
        [nomeEmpresa]: res.data.qrCode,
      }));
    } catch (err) {
      console.error('Erro ao gerar novo QR Code:', err);
      alert('Erro ao gerar QR Code.');
    } finally {
      setLoadingEmpresa(null);
    }
  };

  const empresasFiltradas = empresas.filter((empresa) =>
    empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.telefone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const togglePrompt = (id) => {
    setExpandedPrompts((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <Container>
      <Title>Empresas Cadastradas:</Title>
      <Input
        type="text"
        placeholder="Buscar por nome ou telefone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '1.5rem' }}
      />

      {erro && <MessageError>{erro}</MessageError>}

      {empresasFiltradas.map((empresa) => (
        <Item key={empresa._id}>
          {empresaEditando === empresa._id ? (
            <>
              <Input
                type="text"
                placeholder="Nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
              <Input
                type="text"
                placeholder="Telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              />
              <TextArea
                placeholder="Prompt da IA"
                value={formData.promptIA}
                onChange={(e) => setFormData({ ...formData, promptIA: e.target.value })}
              />
              <Label>
                <input
                  type="checkbox"
                  checked={formData.botAtivo}
                  onChange={(e) => setFormData({ ...formData, botAtivo: e.target.checked })}
                />
                Bot ativo
              </Label>
              <Button onClick={() => salvarEdicao(empresa._id)}>Salvar</Button>
              <ButtonSecondary onClick={cancelarEdicao}>Cancelar</ButtonSecondary>
            </>
          ) : (
            <>
              <Strong>{empresa.nome}</Strong>
              <Paragraph>Telefone: {empresa.telefone}</Paragraph>
              <PromptContainer>
                <strong>Prompt IA:</strong>
                <PromptContent expanded={expandedPrompts[empresa._id]}>
                  {empresa.promptIA}
                </PromptContent>
                {empresa.promptIA.split('\n').length > 5 || empresa.promptIA.length > 200 ? (
                  <ToggleButton onClick={() => togglePrompt(empresa._id)}>
                    {expandedPrompts[empresa._id] ? 'Ver menos ▲' : 'Ver mais ▼'}
                  </ToggleButton>
                ) : null}
              </PromptContainer>
              <Label>
                <input
                  type="checkbox"
                  checked={empresa.botAtivo}
                  onChange={() => alternarStatusBot(empresa._id)}
                />
                Bot ativo
              </Label>

                <Paragraph>
                Status:{" "}
                {status?.conectado ? (
                  <span style={{ color: "green", fontWeight: "bold" }}>🟢 Conectado</span>
                ) : (
                  <span style={{ color: "red", fontWeight: "bold" }}>🔴 Desconectado</span>
                )}
              </Paragraph>
              <Button
                onClick={() => gerarNovoQrCode(empresa._id, empresa.nome)}
                disabled={loadingEmpresa === empresa._id}
              >
                {loadingEmpresa === empresa._id ? 'Gerando QR Code...' : 'Gerar QR Code'}
              </Button>
              {qrCodes[empresa.nome] && (
                <QRCodeWrapper>
                  <p>QR Code:</p>
                  <img src={qrCodes[empresa.nome]} alt={`QR Code - ${empresa.nome}`} />
                </QRCodeWrapper>
              )}
              <Button onClick={() => iniciarEdicao(empresa)}>Editar</Button>
              <ButtonDanger onClick={() => apagarEmpresa(empresa._id)}>Excluir</ButtonDanger>
              <Ia>Gemini</Ia>
            </>
          )}
        </Item>
      ))}
    </Container>
  );
};

export default EmpresasList;

// SEMANA QUE VEM TESTAR PROJETO O MÁXIMO
