import { useState } from 'react';
import styled from 'styled-components';
import { login } from '../services/loginService';
// import logo from "../img/NJBot_original.jpg";

const Container = styled.div`
  display: flex;
  height: 100vh;
  background-color: #0d1b2a;
  align-items: center;
  justify-content: center;
`;

const Form = styled.form`
  background: linear-gradient(135deg, #c14040a2, #1e8fffb0);
  background-size: 400% 400%;
  animation: gradientShift 20s ease infinite;
  
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 350px;

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

const Input = styled.input`
  padding: 0.8rem;
  margin-bottom: 1rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  background: #e0e1dd;
  margin-top: 10px;
`;

const Button = styled.button`
  padding: 0.8rem;
  background-color: #6f91b8;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #1b263b;
  }
`;

const ErrorMessage = styled.p`
  color: #ff6b6b;
  margin-top: 1rem;
  text-align: center;
  font-weight: bold;
`;

const Img = styled.img`
  height: 40px;
  width: 40px;
  margin-bottom: 20px;
  border-radius: 30%;
  align-self: center;
`;

const NJBot = styled.div`
  font-size: 1.5rem;
  font-weight: 500;
  display: flex;
  gap: 0;
  background-color: #2523236c;
  max-width: 20%;
  padding: 3px;
  border-radius: 5px;
  margin: auto;

`

const Letter = styled.span`
  color: ${props => props.color};
  animation: ${props => props.animate ? colorShift : 'none'} 7s infinite ease-in-out;
  font-family: 'Montserrat', sans-serif;
`

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, senha);
      window.location.href = '/dashboard';
    } catch (errMsg) {
      setErro(errMsg);
    }
  };

  return (
    <Container>
      <Form onSubmit={handleLogin}>
        {/* <Img src={logo} alt="" /> */}
        <NJBot>
          <Letter color="#1754ec">N</Letter>
          <Letter color="#3163e4ff">J</Letter>
          <Letter color="#C3263B">B</Letter>
          <Letter color="#C3263B">ot</Letter>
        </NJBot>
        
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <Input
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          placeholder="Senha"
          required
        />
        <Button type="submit">Entrar</Button>
        {erro && <ErrorMessage>{erro}</ErrorMessage>}
      </Form>
    </Container>
  );
}
