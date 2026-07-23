// ====================================================================
// db.js - ADAPTADO PARA O BACKEND PYTHON (API REST FLASK)
// ====================================================================

const DB = {
    // --- GERENCIAMENTO DE PRONTUÁRIOS CLÍNICOS (AGORA VIA BACKEND) ---
    buscarTodos: async () => {
        try {
            const response = await fetch('/api/prontuarios');
            if (!response.ok) {
                throw new Error("Erro ao buscar prontuários do servidor remoto.");
            }
            return await response.json();
        } catch (error) {
            console.error("Erro na API de prontuários (buscarTodos):", error);
            return [];
        }
    },
    
    salvarProntuario: async (novoProntuario) => {
        try {
            const response = await fetch('/api/prontuarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(novoProntuario)
            });
            if (!response.ok) {
                throw new Error("Erro ao enviar novo prontuário ao servidor.");
            }
            return await response.json();
        } catch (error) {
            console.error("Erro na API de prontuários (salvarProntuario):", error);
            alert("Não foi possível salvar o registro clínico no servidor central.");
        }
    },

    atualizarProntuario: async (prontuarioAtualizado) => {
        try {
            const response = await fetch('/api/prontuarios', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(prontuarioAtualizado)
            });
            if (!response.ok) {
                throw new Error("Erro ao atualizar evolução no servidor.");
            }
            return await response.json();
        } catch (error) {
            console.error("Erro na API de prontuários (atualizarProntuario):", error);
            alert("Não foi possível salvar a atualização clínica no servidor central.");
        }
    },

    removerProntuario: async (id) => {
        // Como o app.py centraliza os dados e não costuma expor a remoção direta
        // por conformidade médica e auditoria de PEP, deixamos um aviso estrutural.
        console.warn("Aviso: A exclusão de prontuários médicos deve ser configurada via rota DELETE específica no app.py backend se requisitada.");
    },

    // --- CONTROLE DE ACESSO E SESSÃO LOCAL (MANTIDO PARA DESEMPENHO IMEDIATO) ---
    getUsuario: (cpf) => {
        try {
            return JSON.parse(localStorage.getItem(cpf));
        } catch (e) {
            return null;
        }
    },

    getUsuarioLogado: () => {
        const cpf = localStorage.getItem('loggedInUserCPF');
        return cpf ? DB.getUsuario(cpf) : null;
    },

    logout: () => {
        localStorage.removeItem('loggedInUserCPF');
        window.location.replace('login.html');
    },

    // --- SEÇÃO DE ACOMPANHAMENTO VITAL (MONITORAMENTO ESPECIAL) ---
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
            user.salvos.splice(index, 1); // Remove do monitoramento prioritário
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

    getProntuariosFavoritos: async () => {
        const user = DB.getUsuarioLogado();
        if (!user || !user.salvos) return [];
        
        const todos = await DB.buscarTodos();
        return todos.filter(prontuario => user.salvos.includes(prontuario.id));
    },

    // ====================================================================
    // COMPATIBILIDADE RETROATIVA (MAPEAMENTO ASSÍNCRONO INTEGRADO)
    // ====================================================================
    listar: async () => await DB.buscarTodos(),
    salvarAnuncio: async (dados) => await DB.salvarProntuario(dados),
    removerAnuncio: async (id) => await DB.removerProntuario(id),
    getAnunciosSalvos: async () => await DB.getProntuariosFavoritos(),
    toggleSalvo: (id) => DB.toggleFavorito(id),
    isSalvo: (id) => DB.isFavorito(id)
};

// ====================================================================
// CONTROLE DINÂMICO DO CABEÇALHO DA NAV-BAR
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
    const authContainer = document.getElementById("auth-container");
    
    // Evita interrupção caso a página atual não possua o container de autenticação
    if (!authContainer) return;

    const usuarioLogado = DB.getUsuarioLogado();

    if (usuarioLogado) {
        // Extrai o primeiro nome do profissional para exibição limpa
        const primeiroNome = usuarioLogado.nome ? usuarioLogado.nome.split(' ')[0] : 'Profissional';
        authContainer.innerHTML = `<span>Bem-vindo, ${primeiroNome}!</span>`;
    }
});