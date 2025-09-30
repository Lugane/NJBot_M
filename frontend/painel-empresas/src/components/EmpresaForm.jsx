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



const NovaEmpresa = () => {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [promptIA, setPromptIA] = useState('');
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [aguardandoQR, setAguardandoQR] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    setQrCode(null);
    setAguardandoQR(false);

    if (!promptIA.trim()) {
      setErro('O prompt da IA é obrigatório.');
      setLoading(false);
      return;
    }

    const payload = {
      nome,
      telefone,
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
      } else if (data.qrCode) {
        setQrCode(data.qrCode);
      } else {
        setAguardandoQR(true);
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
    if (aguardandoQR && nome) {
      intervalo = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:3000/api/qr/${nome}`);
          if (res.ok) {
            const data = await res.json();
            if (data.qrCode) {
              setQrCode(data.qrCode);
              setAguardandoQR(false);
              clearInterval(intervalo);
            }
          }
        } catch (err) {
          console.error('Erro ao buscar QR Code:', err);
        }
      }, 5000);
    }
    return () => clearInterval(intervalo);
  }, [aguardandoQR, nome]);

  return (
    <Container>
      <Title>Cadastrar Empresa:</Title>
      <Form onSubmit={handleSubmit}>
        <Input
          type="text"
          placeholder="Nome da Empresa:"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />

        <Input
          type="text"
          placeholder="Número do WhatsApp:"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          required
        />

        <TextArea
          placeholder="Prompt da IA:"
          value={promptIA}
          onChange={(e) => setPromptIA(e.target.value)}
          required
        />

        <Label>
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          Bot Ativo
        </Label>

        <Button type="submit" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar e gerar QR Code'}
        </Button>
      </Form>

      {erro && <MessageError>{erro}</MessageError>}
      {aguardandoQR && <MessageInfo>Aguardando geração do QR Code...</MessageInfo>}

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
