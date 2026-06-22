// db.js
const dadosIniciais = [
    { id: 1, titulo: "Escavadeira Hidráulica X3", categoria: "Escavadeiras", preco: "250,00", local: "Maceió, AL", imagem: "https://placehold.co/300x200", donoCPF: "00000000000", descricao: "Escavadeira em ótimo estado." },
    { id: 2, titulo: "Operador de Retroescavadeira", categoria: "Operadores", preco: "150,00", local: "Arapiraca, AL", imagem: "https://placehold.co/300x200", donoCPF: "11111111111", descricao: "10 anos de experiência." },
    // ADICIONADO: Novo anúncio batendo com a sua imagem de testes
    { 
        id: 3, 
        titulo: "Retroescavadeira CAT 416E", 
        categoria: "Escavadeiras", 
        preco: "180,00", 
        local: "Maceió, AL", 
        imagem: "retroescavadeira.png", // Insira o link da foto da retroescavadeira aqui
        donoCPF: "22222222222", 
        descricao: "Retroescavadeira em excelente estado de conservação. Ideal para escavações de pequeno a médio porte, abertura de valas e carregamento de materiais. Manutenção rigorosamente em dia." 
    }
];

if (!localStorage.getItem('bancoDeDados')) {
    localStorage.setItem('bancoDeDados', JSON.stringify(dadosIniciais));
}

const DB = {
    buscarTodos: () => JSON.parse(localStorage.getItem('bancoDeDados')),
    
    salvarAnuncio: (novoAnuncio) => {
        const atual = DB.buscarTodos();
        atual.push(novoAnuncio);
        localStorage.setItem('bancoDeDados', JSON.stringify(atual));
    },

    removerAnuncio: (id) => {
        const atual = DB.buscarTodos();
        const filtrado = atual.filter(anuncio => anuncio.id !== id);
        localStorage.setItem('bancoDeDados', JSON.stringify(filtrado));
    },

    getUsuario: (cpf) => JSON.parse(localStorage.getItem(cpf)),

    getUsuarioLogado: () => {
        const cpf = localStorage.getItem('loggedInUserCPF');
        return cpf ? DB.getUsuario(cpf) : null;
    },

    logout: () => {
        localStorage.removeItem('loggedInUserCPF');
        window.location.replace('login.html');
    },

    toggleSalvo: (idAnuncio) => {
        const user = DB.getUsuarioLogado();
        if (!user) {
            alert("Você precisa estar logado para salvar anúncios.");
            return null; // Retorna nulo se não houver usuário logado
        }
        
        // Se o usuário ainda não tiver a lista de salvos, cria uma
        if (!user.salvos) user.salvos = [];
        
        const index = user.salvos.indexOf(idAnuncio);
        let isSaved = false;
        
        if (index > -1) {
            user.salvos.splice(index, 1); // Se já tiver, remove
        } else {
            user.salvos.push(idAnuncio); // Se não tiver, adiciona
            isSaved = true;
        }
        
        // Salva a alteração no localStorage do usuário
        localStorage.setItem(user.cpf, JSON.stringify(user));
        return isSaved; // Retorna true (adicionou) ou false (removeu)
    },

    isSalvo: (idAnuncio) => {
        const user = DB.getUsuarioLogado();
        return user && user.salvos && user.salvos.includes(idAnuncio);
    },

    getAnunciosSalvos: () => {
        const user = DB.getUsuarioLogado();
        if (!user || !user.salvos) return [];
        
        const todosOsAnuncios = DB.buscarTodos();
        // Retorna apenas os anúncios cujo ID está na lista de salvos do usuário
        return todosOsAnuncios.filter(anuncio => user.salvos.includes(anuncio.id));
    }
};
// ==========================================
// CONTROLE DINÂMICO DO CABEÇALHO (LOGIN/LOGOUT)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const authContainer = document.getElementById("auth-container");
    
    // Se a página atual não tiver o cabeçalho, o script simplesmente ignora e não gera erro
    if (!authContainer) return;

    const usuarioLogado = DB.getUsuarioLogado();

    if (usuarioLogado) {
        // USUÁRIO LOGADO: Substitui os botões por "Perfil" e "Sair"
        // Pega o primeiro nome para uma saudação amigável, se existir
        const primeiroNome = usuarioLogado.nome ? usuarioLogado.nome.split(' ')[0] : 'Perfil';

        // Atenção: Troque "painel.html" abaixo pelo nome correto do seu arquivo do painel de usuário!
        authContainer.innerHTML = `
            <a href="dashboard.html" class="btn btn-primary me-3 text-white text-decoration-none d-flex align-items-center gap-2">
                <i class="bi bi-person-circle"></i> Olá, ${primeiroNome}
            </a>
            <button onclick="DB.logout()" class="btn btn-outline-danger d-flex align-items-center gap-1">
                <i class="bi bi-box-arrow-right"></i> Sair
            </button>
        `;
    } else {
        // USUÁRIO DESLOGADO: Mantém o padrão (Cadastrar e Entrar)
        authContainer.innerHTML = `
            <a href="cadastro.html" class="nav-link active me-3">Cadastrar</a>
            <a href="login.html" class="login-btn text-decoration-none me-3">Entrar</a>
        `;
    }
});