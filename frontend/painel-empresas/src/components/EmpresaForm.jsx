// import React, { useState, useEffect } from 'react';
// import styled from 'styled-components';

// const Container = styled.div`
//   width: 350px;
//   margin: 2rem auto;
//   padding: 2rem;
//   background: #ffffffb6;
//   backdrop-filter: blur(6px);
//   border: 1px solid #e0e0e0;
//   border-radius: 12px;
//   box-shadow: 0 8px 20px rgba(0,0,0,0.08);
//   font-family: sans-serif;
// `;

// const Title = styled.h2`
//   text-align: center;
//   margin-bottom: 2rem;
//   color: #14213d;
//   font-size: 1.4rem;
//   font-weight: 700;
//   letter-spacing: 0.5px;
// `;

// const Form = styled.form`
//   display: flex;
//   flex-direction: column;
//   gap: 1.2rem;
// `;

// const Input = styled.input`
//   padding: 0.8rem 1rem;
//   font-size: 1rem;
//   border: 1.8px solid #d0d7de;
//   border-radius: 8px;
//   transition: all 0.25s ease;
//   background: #fafafa;
//   font-family: sans-serif;


//   &:hover {
//     border-color: #999;
//   }

//   &:focus {
//     outline: none;
//     border-color: #2563eb;
//     background-color: #f0f6ff;
//     box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
//   }
// `;

// const TextArea = styled.textarea`
//   padding: 0.8rem 1rem;
//   font-size: 1rem;
//   border: 1.8px solid #d0d7de;
//   border-radius: 8px;
//   resize: vertical;
//   min-height: 100px;
//   transition: all 0.25s ease;
//   background: #fafafa;

//   &:hover {
//     border-color: #999;
//   }

//   &:focus {
//     outline: none;
//     border-color: #2563eb;
//     background-color: #f0f6ff;
//     box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
//   }
// `;

// const Label = styled.label`
//   display: flex;
//   align-items: center;
//   gap: 0.6rem;
//   font-weight: 500;
//   color: #1f2937;
//   cursor: pointer;
//   user-select: none;

//   input {
//     accent-color: #2563eb;
//     transform: scale(1.1);
//     cursor: pointer;
//   }
// `;

// const Button = styled.button`
//   padding: 0.9rem 1.4rem;
//   font-size: 1rem;
//   font-weight: 600;
//   color: white;
//   background: linear-gradient(135deg, #2563eb, #1d4ed8);
//   border: none;
//   border-radius: 8px;
//   cursor: pointer;
//   transition: all 0.25s ease;

//   &:hover:not(:disabled) {
//     transform: translateY(-2px);
//     box-shadow: 0 6px 16px rgba(0,0,0,0.15);
//   }

//   &:active:not(:disabled) {
//     transform: translateY(0px);
//     box-shadow: none;
//   }

//   &:disabled {
//     background: #9ca3af;
//     cursor: not-allowed;
//   }
// `;

// const SmallButton = styled(Button)`
//   width: 120px;
//   padding: 0.5rem 1rem;
//   font-size: 0.8rem;
//   background: linear-gradient(135deg, #e63946, #d62828);

//   &:hover:not(:disabled) {
//     box-shadow: 0 6px 16px rgba(214, 40, 40, 0.25);
//   }
// `;

// const MessageError = styled.p`
//   color: #dc2626;
//   font-weight: 600;
//   margin-top: 1.5rem;
//   padding: 0.8rem 1rem;
//   background: #fee2e2;
//   border: 1px solid #fecaca;
//   border-radius: 6px;
//   text-align: center;
// `;

// const MessageInfo = styled.p`
//   color: #1e3a8a;
//   font-weight: 500;
//   margin-top: 1.5rem;
//   padding: 0.8rem 1rem;
//   background: #e0f2fe;
//   border: 1px solid #bae6fd;
//   border-radius: 6px;
//   text-align: center;
// `;

// const QRCodeContainer = styled.div`
//   margin-top: 2rem;
//   text-align: center;

//   img {
//     max-width: 220px;
//     border-radius: 12px;
//     box-shadow: 0 6px 16px rgba(0,0,0,0.25);
//     padding: 0.6rem;
//     background: white;
//     border: 1px solid #e5e7eb;
//   }

//   h3 {
//     margin-bottom: 1rem;
//     color: #1f2937;
//     font-size: 1.2rem;
//     font-weight: 300;
//     font-family: sans-serif;

//   }
// `;

// const SetorContainer = styled.div`
//   display: flex;
//   flex-direction: column;
//   gap: 0.3rem;
//   margin-bottom: 1rem;
// `;

// const CamposLinha = styled.div`
//   display: flex;
//   gap: 0.6rem;
// `;

// const CampoNome = styled(Input)`
//   flex: 1;
// `;

// const CampoPrompt = styled(TextArea)`
//   flex: 2;
// `;

// const NovaEmpresa = () => {
//   const [nome, setNome] = useState('');
//   const [telefone, setTelefone] = useState('');
//   const [ativo, setAtivo] = useState(true);
//   const [promptIA, setPromptIA] = useState('');
//   const [qrCode, setQrCode] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [erro, setErro] = useState('');
//   const [aguardandoQR, setAguardandoQR] = useState(false);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setErro('');
//     setQrCode(null);
//     setAguardandoQR(false);

//     if (!promptIA.trim()) {
//       setErro('O prompt da IA é obrigatório.');
//       setLoading(false);
//       return;
//     }

//     const payload = {
//       nome,
//       telefone,
//       ativo,
//       setores: [],
//       promptIA: promptIA.trim()
//     };

//     try {
//       const response = await fetch('http://localhost:3000/api/empresas', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       });
//       const data = await response.json();

//       if (!response.ok) {
//         setErro(data.error || 'Erro ao cadastrar empresa');
//       } else if (data.qrCode) {
//         setQrCode(data.qrCode);
//       } else {
//         setAguardandoQR(true);
//       }
//     } catch (err) {
//       console.error(err);
//       setErro('Erro na conexão com o servidor.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     let intervalo;
//     if (aguardandoQR && nome) {
//       intervalo = setInterval(async () => {
//         try {
//           const res = await fetch(`http://localhost:3000/api/qr/${nome}`);
//           if (res.ok) {
//             const data = await res.json();
//             if (data.qrCode) {
//               setQrCode(data.qrCode);
//               setAguardandoQR(false);
//               clearInterval(intervalo);
//             }
//           }
//         } catch (err) {
//           console.error('Erro ao buscar QR Code:', err);
//         }
//       }, 5000);
//     }
//     return () => clearInterval(intervalo);
//   }, [aguardandoQR, nome]);

//   return (
//     <Container>
//       <Title>Cadastrar Empresa:</Title>
//       <Form onSubmit={handleSubmit}>
//         <Input
//           type="text"
//           placeholder="Nome da Empresa:"
//           value={nome}
//           onChange={(e) => setNome(e.target.value)}
//           required
//         />

//         <Input
//           type="text"
//           placeholder="Número do WhatsApp:"
//           value={telefone}
//           onChange={(e) => setTelefone(e.target.value)}
//           required
//         />

//         <TextArea
//           placeholder="Prompt da IA:"
//           value={promptIA}
//           onChange={(e) => setPromptIA(e.target.value)}
//           required
//         />

//         <Label>
//           <input
//             type="checkbox"
//             checked={ativo}
//             onChange={(e) => setAtivo(e.target.checked)}
//           />
//           Bot Ativo
//         </Label>

//         <Button type="submit" disabled={loading}>
//           {loading ? 'Cadastrando...' : 'Cadastrar e gerar QR Code'}
//         </Button>
//       </Form>

//       {erro && <MessageError>{erro}</MessageError>}
//       {aguardandoQR && <MessageInfo>Aguardando geração do QR Code...</MessageInfo>}

//       {qrCode && (
//         <QRCodeContainer>
//           <h3>QR Code do WhatsApp</h3>
//           <img src={qrCode} alt="QR Code do WhatsApp" />
//         </QRCodeContainer>
//       )}
//     </Container>
//   );
// };

// export default NovaEmpresa;


// const NovaEmpresa = ({ onSuccess }) => { 
//   const [nome, setNome] = useState('');
//   const [telefone, setTelefone] = useState('');
//   const [ativo, setAtivo] = useState(true);
//   const [promptIA, setPromptIA] = useState('');
//   const [qrCode, setQrCode] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [erro, setErro] = useState('');
//   const [aguardandoQR, setAguardandoQR] = useState(false);
//   const [empresaId, setEmpresaId] = useState(null); // <<< NOVO ESTADO

//   // Máscara de telefone (XX) XXXXX-XXXX) - new feature
//   const handleTelefoneChange = (e) => {
//     let value = e.target.value.replace(/\D/g, '');
//     let formattedValue = '';

//     if (value.length > 0) formattedValue = '(' + value.substring(0, 2);
//     if (value.length >= 3) formattedValue += ') ' + value.substring(2, 7);
//     if (value.length >= 8) formattedValue += '-' + value.substring(7, 11);

//     setTelefone(formattedValue);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setErro('');
//     setQrCode(null);
//     setAguardandoQR(false);
//     setEmpresaId(null); // Reset ID

//     if (!promptIA.trim()) {
//       setErro('O prompt da IA é obrigatório.');
//       setLoading(false);
//       return;
//     }

//     const payload = {
//       nome,
//       // Envia o telefone limpo (somente números)
//       telefone: telefone.replace(/\D/g, ''), 
//       ativo,
//       setores: [],
//       promptIA: promptIA.trim()
//     };

//     try {
//       const response = await fetch('http://localhost:3000/api/empresas', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       });
//       const data = await response.json();

//       if (!response.ok) {
//         setErro(data.error || 'Erro ao cadastrar empresa');
//       } else {
//         // Envia a nova empresa para o componente List
//         if (onSuccess) {
//             onSuccess(data.empresa); 
//         }

//         setEmpresaId(data.empresa._id); // Define o ID para o polling

//         if (data.qrCode) {
//           setQrCode(data.qrCode);
//         } else {
//           setAguardandoQR(true);
//         }
//       }
//     } catch (err) {
//       console.error(err);
//       setErro('Erro na conexão com o servidor.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     let intervalo;
//     // Polling agora usa o empresaId
//     if (aguardandoQR && empresaId) { 
//       intervalo = setInterval(async () => {
//         try {
//           // Busca o QR Code usando o ID da empresa
//           const res = await fetch(`http://localhost:3000/api/qr/${empresaId}`); 
          
//           if (res.ok) {
//             const data = await res.json();
            
//             // Se o QR Code vier nulo (foi limpo no backend após a conexão)
//             if (!data.qrCode) {
//                 setQrCode(null);
//                 setAguardandoQR(false);
//                 clearInterval(intervalo);
                
//                 // Limpar formulário após sucesso de conexão
//                 setNome('');
//                 setTelefone('');
//                 setPromptIA('');
//                 setEmpresaId(null);

//             } else {
//               setQrCode(data.qrCode);
//             }
//           }
//         } catch (err) {
//           console.error('Erro ao buscar QR Code:', err);
//         }
//       }, 5000);
//     }
//     // Limpa o intervalo no cleanup ou quando as condições mudam
//     return () => clearInterval(intervalo);
//   }, [aguardandoQR, empresaId]);

//   return (
//     <Container>
//       <Title>Cadastrar Empresa:</Title>
//       <Form onSubmit={handleSubmit}>
//         <Input
//           type="text"
//           placeholder="Nome da Empresa:"
//           value={nome}
//           onChange={(e) => setNome(e.target.value)}
//           required
//         />

//         <Input
//           type="text"
//           placeholder="Número do WhatsApp: (XX) XXXXX-XXXX"
//           value={telefone}
//           onChange={handleTelefoneChange} // <<< Uso da função de máscara
//           maxLength="15"
//           required
//         />

//         <TextArea
//           placeholder="Prompt da IA:"
//           value={promptIA}
//           onChange={(e) => setPromptIA(e.target.value)}
//           required
//         />

//         <Label>
//           <input
//             type="checkbox"
//             checked={ativo}
//             onChange={(e) => setAtivo(e.target.checked)}
//           />
//           Bot Ativo
//         </Label>

//         <Button type="submit" disabled={loading}>
//           {loading ? 'Cadastrando...' : 'Cadastrar e gerar QR Code'}
//         </Button>
//       </Form>

//       {erro && <MessageError>{erro}</MessageError>}
//       {/* Exibir mensagem se estiver aguardando QR Code, ou se o QR Code foi gerado mas ainda não conectado */}
//       {(aguardandoQR || (qrCode && empresaId)) && <MessageInfo>Aguardando conexão do WhatsApp...</MessageInfo>}

//       {qrCode && (
//         <QRCodeContainer>
//           <h3>QR Code do WhatsApp</h3>
//           <img src={qrCode} alt="QR Code do WhatsApp" />
//         </QRCodeContainer>
//       )}
//     </Container>
//   );
// };

// export default NovaEmpresa;

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  width: 350px;
  margin: 2rem auto;
  padding: 2rem;
  background: #ffffffb6;
  backdrop-filter: blur(6px);
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  font-family: sans-serif;
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 2rem;
  color: #14213d;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const Input = styled.input`
  padding: 0.8rem 1rem;
  font-size: 1rem;
  border: 1.8px solid #d0d7de;
  border-radius: 8px;
  transition: all 0.25s ease;
  background: #fafafa;
  font-family: sans-serif;


  &:hover {
    border-color: #999;
  }

  &:focus {
    outline: none;
    border-color: #2563eb;
    background-color: #f0f6ff;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  }
`;

const TextArea = styled.textarea`
  padding: 0.8rem 1rem;
  font-size: 1rem;
  border: 1.8px solid #d0d7de;
  border-radius: 8px;
  resize: vertical;
  min-height: 100px;
  transition: all 0.25s ease;
  background: #fafafa;

  &:hover {
    border-color: #999;
  }

  &:focus {
    outline: none;
    border-color: #2563eb;
    background-color: #f0f6ff;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  }
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
  user-select: none;

  input {
    accent-color: #2563eb;
    transform: scale(1.1);
    cursor: pointer;
  }
`;

const Button = styled.button`
  padding: 0.9rem 1.4rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.15);
  }

  &:active:not(:disabled) {
    transform: translateY(0px);
    box-shadow: none;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const SmallButton = styled(Button)`
  width: 120px;
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  background: linear-gradient(135deg, #e63946, #d62828);

  &:hover:not(:disabled) {
    box-shadow: 0 6px 16px rgba(214, 40, 40, 0.25);
  }
`;

const MessageError = styled.p`
  color: #dc2626;
  font-weight: 600;
  margin-top: 1.5rem;
  padding: 0.8rem 1rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  text-align: center;
`;

const MessageInfo = styled.p`
  color: #1e3a8a;
  font-weight: 500;
  margin-top: 1.5rem;
  padding: 0.8rem 1rem;
  background: #e0f2fe;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  text-align: center;
`;

const QRCodeContainer = styled.div`
  margin-top: 2rem;
  text-align: center;

  img {
    max-width: 220px;
    border-radius: 12px;
    box-shadow: 0 6px 16px rgba(0,0,0,0.25);
    padding: 0.6rem;
    background: white;
    border: 1px solid #e5e7eb;
  }

  h3 {
    margin-bottom: 1rem;
    color: #1f2937;
    font-size: 1.2rem;
    font-weight: 300;
    font-family: sans-serif;

  }
`;

const SetorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 1rem;
`;

const CamposLinha = styled.div`
  display: flex;
  gap: 0.6rem;
`;

const CampoNome = styled(Input)`
  flex: 1;
`;

const CampoPrompt = styled(TextArea)`
  flex: 2;
`;


// const NovaEmpresa = ({ onSuccess }) => {
//   const [nome, setNome] = useState('');
//   const [telefone, setTelefone] = useState('');
//   const [ativo, setAtivo] = useState(true);
//   const [promptIA, setPromptIA] = useState('');
//   const [qrCode, setQrCode] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [erro, setErro] = useState('');
//   const [aguardandoQR, setAguardandoQR] = useState(false);
//   const [empresaId, setEmpresaId] = useState(null); // ID para polling

//   const [conexaoSucesso, setConexaoSucesso] = useState(false); 

//   // Máscara de telefone (XX) XXXXX-XXXX)
//   const handleTelefoneChange = (e) => {
//     let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não for dígito
//     let formattedValue = '';

//     if (value.length > 0) formattedValue = '(' + value.substring(0, 2);
//     if (value.length >= 3) formattedValue += ') ' + value.substring(2, 7);
//     if (value.length >= 8) formattedValue += '-' + value.substring(7, 11);

//     setTelefone(formattedValue);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setErro('');
//     setQrCode(null);
//     setAguardandoQR(false);
//     setEmpresaId(null);

//     if (!promptIA.trim()) {
//       setErro('O prompt da IA é obrigatório.');
//       setLoading(false);
//       return;
//     }
    
//     // O backend espera o telefone limpo (somente números)
//     const telefoneLimpo = telefone.replace(/\D/g, '');

//     if (!telefoneLimpo || telefoneLimpo.length < 10) {
//         setErro('O telefone deve conter DDD e número válidos (mínimo 10 dígitos).');
//         setLoading(false);
//         return;
//     }


//     const payload = {
//       nome,
//       telefone: telefoneLimpo,
//       ativo,
//       setores: [],
//       promptIA: promptIA.trim()
//     };

//     try {
//       const response = await fetch('http://localhost:3000/api/empresas', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       });
//       const data = await response.json();

//       if (!response.ok) {
//         setErro(data.error || 'Erro ao cadastrar empresa');
//       } else {
//         setEmpresaId(data.empresa._id); // Define o ID para o polling de status
        
//         if (data.qrCode) {
//           setQrCode(data.qrCode);
//           setAguardandoQR(true);
//         } else {
//           setAguardandoQR(true);
//         }
//       }
//     } catch (err) {
//       console.error(err);
//       setErro('Erro na conexão com o servidor.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     let intervalo;
    
//     // Polling de QR Code/Status usa o ID da empresa
//     if (aguardandoQR && empresaId) {
//       intervalo = setInterval(async () => {
//         try {
//           // 1. Busca o status de conexão (mais confiável)
//           const statusRes = await fetch(`http://localhost:3000/api/bots/status`);
//           const statusData = await statusRes.json();
          
//           const isConnected = statusData[empresaId]?.conectado === true;

//           if (isConnected) {
//               // >>> SUCESSO DE CONEXÃO: Bot conectou <<<
              
//               // Busca os dados finais da empresa para atualizar a lista
//               const empresaRes = await fetch(`http://localhost:3000/api/empresas/${empresaId}`); 
//               const empresaData = await empresaRes.json();
              
//               if (onSuccess && empresaData) {
//                   onSuccess(empresaData); // Adiciona/Atualiza o item na lista
//               }

//               setConexaoSucesso(true);

//               // Limpa o estado do formulário e para o polling
//               setQrCode(null);
//               setAguardandoQR(false);
//               clearInterval(intervalo);
              
//               // Limpa formulário
//               setNome('');
//               setTelefone('');
//               setPromptIA('');
//               setEmpresaId(null);
//               setErro('');

//               setTimeout(() => {
//                       setConexaoSucesso(false);
//               }, 3000);
              
//           } else {
//               // 2. Se não conectou, verifica se o QR Code ainda está disponível
//               const qrRes = await fetch(`http://localhost:3000/api/qr/${empresaId}`); 
              
//               if (qrRes.status === 204) {
//                   // O QR Code sumiu (expirou/limpou o cache), mas o bot ainda não conectou.
//                   setQrCode(null);
//                   setAguardandoQR(true); // Continua monitorando o status.
//               } else if (qrRes.ok) {
//                   // O QR Code está disponível (código 200)
//                   const qrData = await qrRes.json();
//                   setQrCode(qrData.qrCode);
//               }
//           }
//         } catch (err) {
//           console.error('Erro no Polling de Status:', err);
//         }
//       }, 5000);
//     }
//     return () => clearInterval(intervalo);
//   }, [aguardandoQR, empresaId, onSuccess]);

//   return (
//     <Container>
//       <Title>Cadastrar Empresa:</Title>
//       <Form onSubmit={handleSubmit}>
//         <Input
//           type="text"
//           placeholder="Nome da Empresa:"
//           value={nome}
//           onChange={(e) => setNome(e.target.value)}
//           required
//           disabled={aguardandoQR || loading}
//         />

//         <Input
//           type="text"
//           placeholder="Número do WhatsApp: (XX) XXXXX-XXXX"
//           value={telefone}
//           onChange={handleTelefoneChange}
//           maxLength="15"
//           required
//           disabled={aguardandoQR || loading}
//         />

//         <TextArea
//           placeholder="Prompt da IA:"
//           value={promptIA}
//           onChange={(e) => setPromptIA(e.target.value)}
//           required
//           disabled={aguardandoQR || loading}
//         />

//         <Label>
//           <input
//             type="checkbox"
//             checked={ativo}
//             onChange={(e) => setAtivo(e.target.checked)}
//             disabled={aguardandoQR || loading}
//           />
//           Bot Ativo
//         </Label>

//         <Button type="submit" disabled={loading || aguardandoQR}>
//           {loading ? 'Cadastrando...' : 
//            aguardandoQR ? 'Aguardando Conexão...' : 'Cadastrar e gerar QR Code'}
//         </Button>
//       </Form>

//       {erro && <MessageError>{erro}</MessageError>}
//       {aguardandoQR && (
//         <MessageInfo>
//             {qrCode ? 'Escaneie o QR Code no seu WhatsApp' : 'Aguardando o QR Code ser gerado...'}
//         </MessageInfo>
//       )}

//       {qrCode && (
//         <QRCodeContainer>
//           <h3>QR Code do WhatsApp</h3>
//           <img src={qrCode} alt="QR Code do WhatsApp" />
//         </QRCodeContainer>
//       )}
//     </Container>
//   );
// };

// export default NovaEmpresa;


// Adicionei o estado empresaId e refatorei o useEffect para usar o ID no polling do QR Code. 
// O componente agora aceita um prop onSuccess para notificar o componente pai sobre a nova empresa.

// import React, { useState, useEffect } from 'react';
// import styled from 'styled-components';

// // ... (Importações e Estilos existentes)
// // ... (Apenas para referência, mantendo a estrutura original)
// const Container = styled.div``;
// const Title = styled.h2``;
// const Input = styled.input``;
// const TextArea = styled.textarea``;
// const Label = styled.label``;
// const Button = styled.button``;
// const MessageError = styled.p``;
// const MessageInfo = styled.p``;
// const QRCodeContainer = styled.div``;

const NovaEmpresa = ({ onSuccess }) => {
  // ... (Estados existentes)
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [promptIA, setPromptIA] = useState('');
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [aguardandoQR, setAguardandoQR] = useState(false);
  const [empresaId, setEmpresaId] = useState(null); 
  const [conexaoSucesso, setConexaoSucesso] = useState(false); 
  
  // Máscara de telefone (XX) XXXXX-XXXX)
  const handleTelefoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não for dígito
    let formattedValue = '';

    if (value.length > 0) formattedValue = '(' + value.substring(0, 2);
    if (value.length >= 3) formattedValue += ') ' + value.substring(2, 7);
    if (value.length >= 8) formattedValue += '-' + value.substring(7, 11);

    setTelefone(formattedValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    setQrCode(null);
    setAguardandoQR(false);
    setEmpresaId(null);

    if (!promptIA.trim()) {
      setErro('O prompt da IA é obrigatório.');
      setLoading(false);
      return;
    }
    
    // O backend espera o telefone limpo (somente números)
    const telefoneLimpo = telefone.replace(/\D/g, '');

    if (!telefoneLimpo || telefoneLimpo.length < 10) {
        setErro('O telefone deve conter DDD e número válidos (mínimo 10 dígitos).');
        setLoading(false);
        return;
    }


    const payload = {
      nome,
      telefone: telefoneLimpo,
      ativo,
      setores: [],
      promptIA: promptIA.trim()
    };

    try {
      const response = await fetch('http://localhost:3000/api/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || 'Erro ao cadastrar empresa');
      } else {
        setEmpresaId(data.empresa._id); // Define o ID para o polling de status
        
        if (data.qrCode) {
          setQrCode(data.qrCode);
          setAguardandoQR(true);
        } else {
          setAguardandoQR(true);
        }
      }
    } catch (err) {
      console.error(err);
      setErro('Erro na conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let intervalo;
    
    if (aguardandoQR && empresaId) {
      intervalo = setInterval(async () => {
        try {
          const statusRes = await fetch(`http://localhost:3000/api/bots/status`);
          
          if (!statusRes.ok) {
              console.error(`Erro ${statusRes.status} ao buscar status dos bots.`);
              return; 
          }
          
          const statusData = await statusRes.json();
          const isConnected = statusData[empresaId]?.conectado === true;

          if (isConnected) {
              // >>> SUCESSO DE CONEXÃO: Bot conectou <<<
              
              // Para o Polling IMEDIATAMENTE.
              clearInterval(intervalo);
              setAguardandoQR(false); 

              const empresaRes = await fetch(`http://localhost:3000/api/empresas/${empresaId}`); 
              
              if (empresaRes.ok) {
                  const empresaData = await empresaRes.json();
                  
                  if (onSuccess && empresaData) {
                      onSuccess(empresaData); 
                  }
                  
                  // 1. Ativa o estado de sucesso
                  setConexaoSucesso(true); 
                  
                  // 2. Limpa SOMENTE o estado do QR Code (para sumir com a imagem)
                  setQrCode(null);
                  
                  // 3. Limpa o formulário APÓS disparar o feedback
                  // Usamos um timeout de 1ms para garantir que a mensagem de sucesso
                  // seja registrada pelo React antes de limpar o formulário.
                  setTimeout(() => {
                      // Limpeza final de todos os inputs e estados
                      setNome('');
                      setTelefone('');
                      setPromptIA('');
                      setEmpresaId(null);
                      setErro('');
                  }, 1); 

                  // 4. Define um timeout para remover a MENSAGEM de sucesso (3 segundos)
                  setTimeout(() => {
                      setConexaoSucesso(false);
                  }, 3000);
                  
              } else {
                  console.error(`Falha ao buscar empresa ID ${empresaId}: Status ${empresaRes.status}`);
                  // Se falhar na busca final, apenas limpa e para o polling.
                  setAguardandoQR(false);
                  clearInterval(intervalo);
              }
              
          } else {
              // 2. Se não conectou, verifica se o QR Code ainda está disponível
              const qrRes = await fetch(`http://localhost:3000/api/qr/${empresaId}`); 
              
              if (qrRes.status === 204) {
                  setQrCode(null);
              } else if (qrRes.ok) {
                  const qrData = await qrRes.json();
                  setQrCode(qrData.qrCode);
              }
          }
        } catch (err) {
          console.error('Erro no Polling de Status:', err);
        }
      }, 5000);
    }
    return () => clearInterval(intervalo);
  }, [aguardandoQR, empresaId, onSuccess]); // Removido o ConexaoSucesso do array, já que ele é o resultado da lógica

  return (
    <Container>
      <Title>Cadastrar Empresa:</Title>
      <Form onSubmit={handleSubmit}>
        {/* ... (Inputs existentes, com disabled) */}
        <Input
          type="text"
          placeholder="Nome da Empresa:"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          disabled={aguardandoQR || loading || conexaoSucesso}
        />

        <Input
          type="text"
          placeholder="Número do WhatsApp: (XX) XXXXX-XXXX"
          value={telefone}
          onChange={handleTelefoneChange}
          maxLength="15"
          required
          disabled={aguardandoQR || loading || conexaoSucesso}
        />

        <TextArea
          placeholder="Prompt da IA:"
          value={promptIA}
          onChange={(e) => setPromptIA(e.target.value)}
          required
          disabled={aguardandoQR || loading || conexaoSucesso}
        />

        <Label>
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            disabled={aguardandoQR || loading || conexaoSucesso}
          />
          Bot Ativo
        </Label>

        <Button type="submit" disabled={loading || aguardandoQR || conexaoSucesso}>
          {loading ? 'Cadastrando...' : 
           aguardandoQR ? 'Aguardando Conexão...' : 'Cadastrar e gerar QR Code'}
        </Button>
      </Form>

      {erro && <MessageError>{erro}</MessageError>}
      
      {/* >>> NOVO: Mensagem de Sucesso Isolada (Maior prioridade na renderização) <<< */}
      {conexaoSucesso && (
        <MessageInfo style={{ background: '#28a745', color: 'white' }}>
            ✅ Conectado com sucesso!
        </MessageInfo>
      )}

      {/* Mensagem de aguardando QR/Conexão (Somente se não estiver em estado de sucesso) */}
      {(aguardandoQR && !conexaoSucesso) && (
        <MessageInfo>
            {qrCode ? 'Escaneie o QR Code no seu WhatsApp' : 'Aguardando o QR Code ser gerado...'}
        </MessageInfo>
      )}

      {qrCode && (
        <QRCodeContainer>
          <h3>QR Code do WhatsApp</h3>
          <img src={qrCode} alt="QR Code do WhatsApp" />
        </QRCodeContainer>
      )}
    </Container>
  );
};

export default NovaEmpresa;