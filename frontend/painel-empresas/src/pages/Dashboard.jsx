import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import Header from '../components/Header';
import EmpresaForm from '../components/EmpresaForm';
import EmpresasList from '../components/EmpresaList';
import api from '../services/api';

// Estilos para o Feedback de Sucesso
const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
`;

const MessageSucesso = styled.p`
    width: 90%;
    max-width: 720px;
    padding: 1rem 1.5rem;
    margin-bottom: 2rem;
    color: white;
    font-weight: 600;
    text-align: center;
    background-color: #28a745; /* Verde de sucesso */
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
    animation: ${fadeIn} 0.5s ease-out;
`;


function DashBoard() {
    const [empresas, setEmpresas] = useState([]);
    
    const [feedbackSucesso, setFeedbackSucesso] = useState(false);

    useEffect(() => {
        const fetchEmpresas = async () => {
            try {
                const res = await api.get('/empresas');
                setEmpresas(res.data);
            } catch (err) {
                console.error('Erro ao carregar lista inicial de empresas:', err);
            }
        };
        fetchEmpresas();
    }, []);

    const handleEmpresaSuccess = (novaEmpresa) => {
        // Adiciona a nova empresa ao topo da lista (garantindo que ela apareça imediatamente)
        setEmpresas(prev => [novaEmpresa, ...prev]);
        console.log(`✅ Empresa ${novaEmpresa.nome} adicionada à lista dinamicamente após conexão.`);

        // >>> ACIONA O FEEDBACK POR 3 SEGUNDOS
        setFeedbackSucesso(true);
        setTimeout(() => {
            setFeedbackSucesso(false);
        }, 3000);
        // <<<
    };

    const Container = styled.div`
        min-height: 100%;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
    `;

    return (
        <>
            <Container>
                <Header/>
                
                {feedbackSucesso && (
                    <MessageSucesso>
                        ✅ Conexão estabelecida com sucesso! Empresa adicionada.
                    </MessageSucesso>
                )}
                
                <EmpresaForm onSuccess={handleEmpresaSuccess} /> 

                <EmpresasList 
                    empresas={empresas} 
                    setEmpresas={setEmpresas}
                />
            </Container>
        </>
    )
}

export default DashBoard;