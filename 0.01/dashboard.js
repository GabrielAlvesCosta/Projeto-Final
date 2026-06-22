// ==========================================
// FUNÇÕES DE PERFIL E AUXILIARES
// ==========================================
function previewFoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('perfilFoto').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function adicionarCampo(containerId, tipo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const placeholder = tipo === 'tel' ? '(00) 00000-0000' : 'Endereço completo';
    const div = document.createElement('div');
    div.className = 'dynamic-field';
    div.innerHTML = `
        <input type="text" class="form-control" placeholder="${placeholder}">
        <button type="button" class="btn btn-outline-danger border-0" onclick="removerCampo(this)"><i class="bi bi-trash"></i></button>
    `;
    container.appendChild(div);
}

function removerCampo(btn) {
    if (btn && btn.closest('.dynamic-field')) {
        btn.closest('.dynamic-field').remove();
    }
}

function carregarDadosPerfil() {
    let user = null;

    if (typeof DB !== 'undefined' && typeof DB.getUsuarioLogado === 'function') {
        user = DB.getUsuarioLogado();
    } 
    
    if (!user) {
        const cpfLogado = localStorage.getItem('loggedInUserCPF');
        if (cpfLogado) {
            const dadosUsuario = localStorage.getItem(cpfLogado);
            if (dadosUsuario) {
                try {
                    user = JSON.parse(dadosUsuario);
                } catch(e) {
                    console.error("Erro ao ler os dados:", e);
                }
            }
        }
    }

    if (user) {
        const display = document.getElementById('user-display-name');
        if (display) display.textContent = user.nome ? user.nome.split(' ')[0] : 'Usuário';
        
        const pNome = document.getElementById('perfilNome');
        if (pNome) pNome.value = user.nome || '';
        
        const pEmail = document.getElementById('perfilEmail');
        if (pEmail) pEmail.value = user.email || '';
        
        const pCpf = document.getElementById('perfilCPF');
        if (pCpf) pCpf.value = user.cpf || '';

        // ====== NOVO: CARREGA A FOTO DE PERFIL ======
        const fotoPerfil = document.getElementById('perfilFoto');
        if (fotoPerfil) {
            // Se o usuário já salvou uma foto, exibe ela. Senão, mostra um avatar genérico.
            fotoPerfil.src = user.foto || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        }
        // ============================================
        
    } else {
        console.warn("Nenhum usuário logado encontrado.");
    }
}

function salvarPerfil() {
    alert("Alterações do perfil salvas com sucesso!");
    // Aqui você pode integrar com o seu DB.js futuramente
}

function actualizarCategorias(targetId, tipo) {
    const select = document.getElementById(targetId);
    if (!select) return;

    const catsMaquina = ['Escavadeiras', 'Guindastes', 'Caminhões', 'Compactadores'];
    const catsOperador = ['Op. de Escavadeira', 'Op. de Guindaste', 'Motorista de Caminhão'];
    
    const lista = (tipo === 'maquina') ? catsMaquina : catsOperador;
    select.innerHTML = lista.map(c => `<option value="${c}">${c}</option>`).join('');
}

function obtenerClasseRelevancia(relevancia) {
    if (relevancia === 'Alta') return 'bg-info-subtle text-info';
    if (relevancia === 'Muito Alto') return 'bg-warning-subtle text-warning';
    if (relevancia === 'Premium') return 'bg-danger-subtle text-danger';
    if (relevancia === 'Principal') return 'bg-primary-subtle text-primary';
    if (relevancia === 'Principal Premium') return 'bg-dark text-white';
    return 'bg-secondary-subtle text-secondary'; 
}

function obtenerClasseStatus(status) {
    if (status === 'Em Uso') return 'bg-warning text-dark';
    return 'bg-success-subtle text-success'; 
}

// ==========================================
// LÓGICA DE SERVIÇOS E TABELA
// ==========================================
let linhaSendoEditada = null; 

function renderizarTabelaServicos() {
    const tabela = document.getElementById('tabelaMeusServicos');
    if (!tabela) return; // Se não achar a tabela, para aqui para não travar o JS

    const todosOsAnuncios = JSON.parse(localStorage.getItem('maquinaria_anuncios')) || [];
    tabela.innerHTML = '';

    if (todosOsAnuncios.length === 0) {
        tabela.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Nenhum serviço anunciado no sistema.</td></tr>`;
        return;
    }

    todosOsAnuncios.forEach(anuncio => {
        let corBadgeRel = obtenerClasseRelevancia(anuncio.relevancia || 'Normal');
        let corBadgeStatus = obtenerClasseStatus(anuncio.status || 'Ativo'); 
        const subtitulo = anuncio.tipo === 'maquina' ? `Máquinas > ${anuncio.categoria}` : `Operador > ${anuncio.categoria}`;
        const fotoExibicao = (anuncio.imagem && anuncio.imagem.trim() !== '') ? anuncio.imagem : 'https://via.placeholder.com/70x50?text=Sem+Foto';

        const linhaHTML = `
            <tr data-id="${anuncio.id}" data-titulo="${anuncio.titulo}" data-preco="${anuncio.preco}" data-tipo="${anuncio.tipo}" data-categoria="${anuncio.categoria}" data-relevancia="${anuncio.relevancia}" data-status="${anuncio.status || 'Ativo'}" data-img="${anuncio.imagem}" data-localizacao="${anuncio.local || ''}" data-descricao="${anuncio.descricao || ''}">
                <td> 
                    <div class="d-flex align-items-center gap-3">
                        <img src="${fotoExibicao}" class="rounded object-fit-cover shadow-sm" style="width: 80px; height: 60px; min-width: 80px;" alt="Imagem do serviço">
                        <div>
                            <h6 class="mb-1 fw-bold text-dark">${anuncio.titulo}</h6>
                            <div class="text-muted small mb-1">${subtitulo}</div>
                            <div class="text-muted small"><i class="bi bi-geo-alt-fill text-danger"></i> ${anuncio.local || 'Não informada'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge ${corBadgeStatus} mb-1 d-inline-block">${anuncio.status || 'Ativo'}</span><br>
                    <span class="badge ${corBadgeRel} d-inline-block">${anuncio.relevancia}</span>
                </td>
                <td class="fw-bold text-dark text-nowrap">
                    R$ ${String(anuncio.preco).replace('.', ',')}
                </td>
                <td class="text-end text-nowrap">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirEdicao(this)" title="Editar"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirServico(this)" title="Excluir"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `;
        tabela.insertAdjacentHTML('beforeend', linhaHTML);
    });
}

function excluirServico(botaoClicado) {
    if (confirm("Tem certeza que deseja excluir este anúncio? Esta ação não pode ser desfeita.")) {
        const tr = botaoClicado.closest('tr');
        const idAnuncio = parseInt(tr.getAttribute('data-id'));
        
        if (idAnuncio) {
            const todosAnuncios = JSON.parse(localStorage.getItem('maquinaria_anuncios')) || [];
            const listaAtualizada = todosAnuncios.filter(a => a.id !== idAnuncio);
            localStorage.setItem('maquinaria_anuncios', JSON.stringify(listaAtualizada));
        }
        
        tr.remove();
        renderizarTabelaServicos(); 
    }
}

function publicarServico(event) {
    event.preventDefault(); 

    const titulo = document.getElementById('novoTitulo').value;
    const precoRaw = document.getElementById('novoPreco').value;
    const preco = parseFloat(precoRaw).toFixed(2);
    const category = document.getElementById('catNovo').value;
    const tipo = document.getElementById('tipoServico').value;
    const relevancia = document.getElementById('relevanciaNovo').value; 
    const localizacao = document.getElementById('novoLocalizacao').value;
    const descricao = document.getElementById('novoDescricao').value;
    const inputArquivo = document.getElementById('novoArquivo');
    
    let imgSrc = tipo === 'maquina' ? 'https://via.placeholder.com/70x50?text=Maq' : 'https://via.placeholder.com/70x50?text=Op';

    const salvarNoBancoERenderizar = (imagemParaUsar) => {
        const todosAnuncios = JSON.parse(localStorage.getItem('maquinaria_anuncios')) || [];
        const proximoId = todosAnuncios.length > 0 ? Math.max(...todosAnuncios.map(a => a.id || 0)) + 1 : 1;
        
        let cpfDono = 'anonimo';
        if (window.DB && typeof DB.getUsuarioLogado === 'function' && DB.getUsuarioLogado()) {
            cpfDono = DB.getUsuarioLogado().cpf;
        }

        const novoAnuncio = {
            id: proximoId, titulo: titulo, preco: preco, tipo: tipo, categoria: category,
            relevancia: relevancia, status: 'Ativo', imagem: imagemParaUsar, local: localizacao,
            descricao: descricao, donoCPF: cpfDono
        };

        todosAnuncios.unshift(novoAnuncio);
        localStorage.setItem('maquinaria_anuncios', JSON.stringify(todosAnuncios));

        renderizarTabelaServicos();
        alert("Parabéns! Seu serviço foi publicado com sucesso.");
        document.getElementById('formNovoServico').reset();
        atualizarCategorias('catNovo', 'maquina');
        
        // Retorna para a aba da tabela automaticamente
        const tabEl = document.querySelector('#tab-meus-servicos');
        if (tabEl) {
            const tab = new bootstrap.Tab(tabEl);
            tab.show();
        }
    };

    if (inputArquivo && inputArquivo.files && inputArquivo.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { salvarNoBancoERenderizar(e.target.result); }
        reader.readAsDataURL(inputArquivo.files[0]);
    } else {
        salvarNoBancoERenderizar(imgSrc);
    }
}

function abrirEdicao(botaoClicado) {
    linhaSendoEditada = botaoClicado.closest('tr');
    
    document.getElementById('editTitulo').value = linhaSendoEditada.getAttribute('data-titulo') || '';
    document.getElementById('editPreco').value = linhaSendoEditada.getAttribute('data-preco') || '';
    document.getElementById('editRelevancia').value = linhaSendoEditada.getAttribute('data-relevancia') || 'Normal';
    document.getElementById('editStatus').value = linhaSendoEditada.getAttribute('data-status') || 'Ativo';
    document.getElementById('editLocalizacao').value = linhaSendoEditada.getAttribute('data-localizacao') || '';
    document.getElementById('editDescricao').value = linhaSendoEditada.getAttribute('data-descricao') || '';
    
    const tipo = linhaSendoEditada.getAttribute('data-tipo') || 'maquina';
    document.getElementById('editTipo').value = tipo === 'maquina' ? 'Máquina / Equipamento' : 'Prestação de Serviço (Operador)';
    document.getElementById('editCategoria').value = linhaSendoEditada.getAttribute('data-categoria') || '';

    const img = linhaSendoEditada.getAttribute('data-img');
    if (document.getElementById('editPreviewFoto')) {
        document.getElementById('editPreviewFoto').src = img || 'https://via.placeholder.com/70x50?text=Sem+Foto';
    }
    
    const modalElement = document.getElementById('modalEditarServico');
    const instance = bootstrap.Modal.getOrCreateInstance(modalElement);
    instance.show();
}

function salvarEdicao() {
    if (!linhaSendoEditada) return;

    const idAnuncio = parseInt(linhaSendoEditada.getAttribute('data-id'));
    const novoTitulo = document.getElementById('editTitulo').value;
    const novoPrecoRaw = document.getElementById('editPreco').value;
    const novoPreco = parseFloat(novoPrecoRaw).toFixed(2);
    const novaRelevancia = document.getElementById('editRelevancia').value;
    const novoStatus = document.getElementById('editStatus').value;
    const novoLocalizacao = document.getElementById('editLocalizacao').value;
    const novoDescricao = document.getElementById('editDescricao').value;
    const inputFotoEdit = document.getElementById('editArquivo');

    const finalizarAtualizacao = (fotoParaUsar) => {
        if (idAnuncio) {
            const todosAnuncios = JSON.parse(localStorage.getItem('maquinaria_anuncios')) || [];
            const idx = todosAnuncios.findIndex(a => a.id === idAnuncio);
            if (idx !== -1) {
                todosAnuncios[idx].titulo = novoTitulo;
                todosAnuncios[idx].preco = novoPreco;
                todosAnuncios[idx].relevancia = novaRelevancia;
                todosAnuncios[idx].status = novoStatus;
                todosAnuncios[idx].local = novoLocalizacao;
                todosAnuncios[idx].descricao = novoDescricao;
                todosAnuncios[idx].imagem = fotoParaUsar;
                localStorage.setItem('maquinaria_anuncios', JSON.stringify(todosAnuncios));
            }
        }

        renderizarTabelaServicos();

        const modalElement = document.getElementById('modalEditarServico');
        const instance = bootstrap.Modal.getInstance(modalElement);
        if (instance) {
            instance.hide();
        }

        alert("Anúncio atualizado com sucesso!");
        linhaSendoEditada = null;
    };

    if (inputFotoEdit && inputFotoEdit.files && inputFotoEdit.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { finalizarAtualizacao(e.target.result); }
        reader.readAsDataURL(inputFotoEdit.files[0]);
    } else {
        finalizarAtualizacao(linhaSendoEditada.getAttribute('data-img'));
    }
}

function previewFotoEdicao(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('editPreviewFoto').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// ==========================================
// INICIALIZAÇÃO SEGURA (Prevenindo quebra de script)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tenta carregar o perfil
    try {
        carregarDadosPerfil();
    } catch(e) { console.warn("Erro não crítico ao carregar perfil:", e); }
    
    // 2. Tenta carregar as categorias
    try {
        atualizarCategorias('catNovo', 'maquina');
    } catch(e) { console.warn("Erro não crítico ao atualizar categorias:", e); }
    
    // 3. Renderiza a tabela (agora não será bloqueada se algo acima falhar!)
    try {
        renderizarTabelaServicos(); 
    } catch(e) { console.error("Erro ao renderizar tabela de serviços:", e); }

    // 4. Configura o gatilho da aba
    const botaoAbaServicos = document.getElementById('tab-meus-servicos');
    if (botaoAbaServicos) {
        botaoAbaServicos.addEventListener('shown.bs.tab', renderizarTabelaServicos);
    }
});