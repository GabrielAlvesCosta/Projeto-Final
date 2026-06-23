// ====================================================================
// db.js - BASE DE DADOS LOCAL E AUTENTICAÇÃO DO PAINEL CLÍNICO (PEP)
// ====================================================================

// Prontuários médicos de teste para inicializar o sistema de forma realista
// Inicialização segura do banco unificado utilizando a ID 'bancoProntuarios'
if (!localStorage.getItem('bancoProntuarios')) {
    localStorage.setItem('bancoProntuarios', JSON.stringify(prontuariosIniciais));
}

const DB = {
    // --- GERENCIAMENTO DE PRONTUÁRIOS CLÍNICOS ---
    buscarTodos: () => JSON.parse(localStorage.getItem('bancoProntuarios')) || [],
    
    salvarProntuario: (novoProntuario) => {
        const atual = DB.buscarTodos();
        atual.unshift(novoProntuario); // Adiciona no início para aparecer primeiro no histórico
        localStorage.setItem('bancoProntuarios', JSON.stringify(atual));
    },

    atualizarProntuario: (prontuarioAtualizado) => {
        const atual = DB.buscarTodos();
        const index = atual.findIndex(p => p.id === prontuarioAtualizado.id);
        if (index !== -1) {
            atual[index] = prontuarioAtualizado;
            localStorage.setItem('bancoProntuarios', JSON.stringify(atual));
        }
    },

    removerProntuario: (id) => {
        const atual = DB.buscarTodos();
        const filtrado = atual.filter(prontuario => prontuario.id !== id);
        localStorage.setItem('bancoProntuarios', JSON.stringify(filtrado));
    },

    // --- CONTROLE DE ACESSO E USUÁRIOS (PROFISSIONAIS) ---
    getUsuario: (cpf) => JSON.parse(localStorage.getItem(cpf)),

    getUsuarioLogado: () => {
        const cpf = localStorage.getItem('loggedInUserCPF');
        return cpf ? DB.getUsuario(cpf) : null;
    },

    logout: () => {
        localStorage.removeItem('loggedInUserCPF');
        window.location.replace('login.html');
    },

    // --- SEÇÃO DE ACOMPANHAMENTO VITAL (ANTIGO FAVORITOS/SALVOS) ---
    toggleFavorito: (idProntuario) => {
        const user = DB.getUsuarioLogado();
        if (!user) {
            alert("Sessão expirada. Faça login novamente.");
            return null;
        }
        
        if (!user.salvos) user.salvos = [];
        const index = user.salvos.indexOf(idProntuario);
        let isSaved = false;
        
        if (index > -1) {
            user.salvos.splice(index, 1); // Remove do monitoramento especial
        } else {
            user.salvos.push(idProntuario); // Adiciona para monitoramento prioritário
            isSaved = true;
        }
        
        localStorage.setItem(user.cpf, JSON.stringify(user));
        return isSaved;
    },

    isFavorito: (idProntuario) => {
        const user = DB.getUsuarioLogado();
        return user && user.salvos && user.salvos.includes(idProntuario);
    },

    getProntuariosFavoritos: () => {
        const user = DB.getUsuarioLogado();
        if (!user || !user.salvos) return [];
        
        const todos = DB.buscarTodos();
        return todos.filter(prontuario => user.salvos.includes(prontuario.id));
    },

    // ====================================================================
    // COMPATIBILIDADE RETROATIVA (MECANISMO ANTIFALHAS DE REDIRECIONAMENTO)
    // ====================================================================
    // Caso alguma outra página legada chame os termos antigos de anúncios,
    // as funções abaixo convertem e gravam os dados no novo padrão de prontuários.
    listar: () => DB.buscarTodos(),
    salvarAnuncio: (dados) => DB.salvarProntuario(dados),
    removerAnuncio: (id) => DB.removerProntuario(id),
    getAnunciosSalvos: () => DB.getProntuariosFavoritos(),
    toggleSalvo: (id) => DB.toggleFavorito(id),
    isSalvo: (id) => DB.isFavorito(id)
};

// ====================================================================
// CONTROLE DINÂMICO DO CABEÇALHO DA NAV-BAR
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
    const authContainer = document.getElementById("auth-container");
    
    // Se a página atual não possuir o container de autenticação na navbar, o script prossegue sem erros
    if (!authContainer) return;

    const usuarioLogado = DB.getUsuarioLogado();

    if (usuarioLogado) {
        // Extrai o primeiro nome do profissional para exibição limpa
        const primeiroNome = usuarioLogado.nome ? usuarioLogado.nome.split(' ')[0] : 'Profissional';

        authContainer.innerHTML = `<span>Bem-vindo, ${primeiroNome}!</span>`;