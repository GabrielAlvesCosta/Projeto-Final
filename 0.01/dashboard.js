(function() {
    // Verifica se existe o token de login no navegador
    const usuarioLogado = localStorage.getItem('loggedInUserCPF');
    
    if (!usuarioLogado) {
        window.location.replace('login.html');
    }
})();

// ====================================================================
// dashboard.js - PEP, GESTÃO DE PACIENTES E AGENDAMENTO DE CONSULTAS
// ====================================================================

function previewCarimbo(input) {
    const preview = document.getElementById('prontuarioCarimboPreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('d-none');
        }
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.src = "";
        preview.classList.add('d-none');
    }
}

function previewFoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { document.getElementById('perfilFoto').src = e.target.result; }
        reader.readAsDataURL(input.files[0]);
    }
}

// === CAPTURA DO NOME DO PROFISSIONAL LOGADO ===
function obterNomeProfissionalLogado() {
    const cpfLogado = localStorage.getItem('loggedInUserCPF');
    if (cpfLogado) {
        const user = JSON.parse(localStorage.getItem(cpfLogado));
        if (user && user.nome) return user.nome;
    }
    return "";
}

function carregarDadosPerfil() {
    let user = null;
    if (typeof DB !== 'undefined' && typeof DB.getUsuarioLogado === 'function') {
        user = DB.getUsuarioLogado();
    }
    if (!user) {
        const cpfLogado = localStorage.getItem('loggedInUserCPF');
        if (cpfLogado) {
            const dados = localStorage.getItem(cpfLogado);
            if (dados) { try { user = JSON.parse(dados); } catch(e){} }
        }
    }
    if (user) {
        const display = document.getElementById('user-display-name');
        if (display) display.textContent = user.nome ? "Profissional: " + user.nome.split(' ')[0] : 'Profissional';
        if (document.getElementById('perfilNome')) document.getElementById('perfilNome').value = user.nome || '';
        if (document.getElementById('perfilEmail')) document.getElementById('perfilEmail').value = user.email || '';
        if (document.getElementById('perfilCPF')) document.getElementById('perfilCPF').value = user.cpf || '';
        if (document.getElementById('perfilFoto') && user.foto) document.getElementById('perfilFoto').src = user.foto;
    }
}

function salvarPerfil() {
    const cpfLogado = localStorage.getItem('loggedInUserCPF');
    if (!cpfLogado) return alert("Erro de sessão do profissional.");

    let user = JSON.parse(localStorage.getItem(cpfLogado)) || {};
    user.nome = document.getElementById('perfilNome').value;
    user.email = document.getElementById('perfilEmail').value;
    user.foto = document.getElementById('perfilFoto').src;

    localStorage.setItem(cpfLogado, JSON.stringify(user));
    carregarDadosPerfil();
    
    // Atualiza tudo que depende do nome atual do profissional
    atualizarDropdowns();
    renderizarMinhasConsultas();
    renderizarMinhasConsultasConcluidas();
    
    alert("Dados atualizados com sucesso!");
}

function buscarTodosDoBanco() {
    if (typeof DB !== 'undefined') {
        if (typeof DB.buscarTodos === 'function') return DB.buscarTodos();
        if (typeof DB.listar === 'function') return DB.listar();
        if (typeof DB.obterTodos === 'function') return DB.obterTodos();
    }
    const locais = localStorage.getItem('bancoProntuarios');
    return locais ? JSON.parse(locais) : [];
}

function salvarNoBancoUnificado(novoProntuario, listaCompleta) {
    localStorage.setItem('bancoProntuarios', JSON.stringify(listaCompleta));
    if (typeof DB !== 'undefined') {
        try {
            if (typeof DB.salvarProntuario === 'function') DB.salvarProntuario(novoProntuario);
            else if (typeof DB.salvar === 'function') DB.salvar(novoProntuario);
            else if (typeof DB.adicionar === 'function') DB.adicionar(novoProntuario);
        } catch (err) {
            console.warn("db.js encontrou descompasso estrutural, mas o dado local está seguro.", err);
        }
    }
}

function buscarPacientesDoBanco() {
    const locais = localStorage.getItem('bancoPacientes');
    return locais ? JSON.parse(locais) : [];
}

function salvarPacientesNoBanco(listaCompleta) {
    localStorage.setItem('bancoPacientes', JSON.stringify(listaCompleta));
}

function buscarConsultasDoBanco() {
    const locais = localStorage.getItem('bancoConsultas');
    return locais ? JSON.parse(locais) : [];
}

function salvarConsultasNoBanco(listaCompleta) {
    localStorage.setItem('bancoConsultas', JSON.stringify(listaCompleta));
}

function buscarProfissionaisCadastrados() {
    let profissionais = [];

    const bancoUsuarios = JSON.parse(localStorage.getItem('bancoUsuarios') || '[]');
    if (bancoUsuarios.length > 0) return bancoUsuarios;

    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (['bancoPacientes', 'bancoConsultas', 'bancoProntuarios', 'loggedInUserCPF'].includes(key)) continue;
        
        try {
            let item = JSON.parse(localStorage.getItem(key));
            if (item && typeof item === 'object' && !Array.isArray(item) && item.nome) {
                profissionais.push({
                    id: key,
                    nome: item.nome
                });
            }
        } catch(e) {}
    }

    if (profissionais.length === 0) {
        const cpfLogado = localStorage.getItem('loggedInUserCPF');
        if (cpfLogado) {
            const userLogado = JSON.parse(localStorage.getItem(cpfLogado)) || {};
            const nomeProf = userLogado.nome || 'Profissional Logado';
            profissionais.push({ id: cpfLogado, nome: nomeProf });
        }
    }

    return profissionais;
}

function atualizarDropdowns() {
    const selectProntuario = document.getElementById('prontuarioPacienteSelect');
    const selectConsulta = document.getElementById('consultaPacienteSelect');
    const pacientes = buscarPacientesDoBanco();
    
    const optionsPacientesHTML = '<option value="">Selecione um paciente cadastrado...</option>' + 
        pacientes.map(p => `<option value="${p.id}">${p.nome} (Doc: ${p.documento || 'S/N'})</option>`).join('');

    if (selectProntuario) selectProntuario.innerHTML = optionsPacientesHTML;
    if (selectConsulta) selectConsulta.innerHTML = optionsPacientesHTML;

    const selectProfissional = document.getElementById('consultaProfissional');
    if (selectProfissional) {
        const profissionais = buscarProfissionaisCadastrados();
        const optionsProfissionaisHTML = '<option value="">Selecione um profissional cadastrado...</option>' + 
            profissionais.map(prof => `<option value="${prof.nome}">${prof.nome}</option>`).join('');
            
        selectProfissional.innerHTML = optionsProfissionaisHTML;
    }
}

function cadastrarPaciente(event) {
    event.preventDefault();
    
    const todos = buscarPacientesDoBanco();
    const proximoId = todos.length > 0 ? Math.max(...todos.map(p => p.id || 0)) + 1 : 1;

    const radioGenero = document.querySelector('input[name="pacienteGenero"]:checked');
    const generoSelecionado = radioGenero ? radioGenero.value : "Não informado";

    const novoPaciente = {
        id: proximoId,
        nome: document.getElementById('pacienteNome').value,
        dataNasc: document.getElementById('pacienteDataNasc').value,
        genero: generoSelecionado,
        idadeAnos: document.getElementById('pacienteIdadeAnos').value,
        idadeMeses: document.getElementById('pacienteIdadeMeses').value,
        idadeDias: document.getElementById('pacienteIdadeDias').value,
        documento: document.getElementById('pacienteDocumento').value,
        cartao: document.getElementById('pacienteCartao').value
    };

    todos.push(novoPaciente);
    salvarPacientesNoBanco(todos);

    alert("Paciente cadastrado com sucesso!");
    document.getElementById('formNovoPaciente').reset();

    atualizarDropdowns();
    renderizarTabelaPacientes();

    const botaoAbaPacientes = document.getElementById('tab-pacientes-cadastrados');
    if (botaoAbaPacientes) {
        bootstrap.Tab.getOrCreateInstance(botaoAbaPacientes).show();
    }
}

function renderizarTabelaPacientes() {
    const tabela = document.getElementById('tabelaPacientes');
    if (!tabela) return;

    const todosOsPacientes = buscarPacientesDoBanco();
    const inputBusca = document.getElementById('buscaPacienteLista');
    const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : '';

    tabela.innerHTML = '';

    const filtrados = todosOsPacientes.filter(p => {
        return p.nome && p.nome.toLowerCase().includes(termoBusca);
    });

    if (filtrados.length === 0) {
        const msg = termoBusca ? 'Nenhum paciente localizado com este nome.' : 'Nenhum paciente cadastrado no sistema.';
        tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">${msg}</td></tr>`;
        return;
    }

    filtrados.forEach(p => {
        const linhaHTML = `
            <tr>
                <td><strong class="text-dark">${p.nome}</strong></td>
                <td>${formatarDataBR(p.dataNasc)} / <span class="text-muted">${p.genero || 'N/I'}</span></td>
                <td>${p.documento || 'Não informado'}</td>
                <td>${p.cartao}</td>
                <td class="text-end text-nowrap">
                    <button class="btn btn-sm btn-outline-primary" onclick="abrirEdicaoPaciente(${p.id})">
                        <i class="bi bi-pencil-square"></i> Editar
                    </button>
                </td>
            </tr>
        `;
        tabela.insertAdjacentHTML('beforeend', linhaHTML);
    });
}

function abrirEdicaoPaciente(id) {
    const todos = buscarPacientesDoBanco();
    const paciente = todos.find(p => p.id === id);
    if (!paciente) return alert("Paciente não localizado.");

    document.getElementById('editPacienteId').value = paciente.id;
    document.getElementById('editPacienteNome').value = paciente.nome;
    document.getElementById('editPacienteDataNasc').value = paciente.dataNasc;
    document.getElementById('editPacienteGenero').value = paciente.genero || 'Masculino';
    document.getElementById('editPacienteIdadeAnos').value = paciente.idadeAnos || '';
    document.getElementById('editPacienteIdadeMeses').value = paciente.idadeMeses || '';
    document.getElementById('editPacienteIdadeDias').value = paciente.idadeDias || '';
    document.getElementById('editPacienteDocumento').value = paciente.documento || '';
    document.getElementById('editPacienteCartao').value = paciente.cartao;

    const modalElement = document.getElementById('modalEditarPaciente');
    bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

function salvarEdicaoPaciente() {
    const id = parseInt(document.getElementById('editPacienteId').value);
    const todos = buscarPacientesDoBanco();
    const idx = todos.findIndex(p => p.id === id);

    if (idx !== -1) {
        todos[idx].nome = document.getElementById('editPacienteNome').value;
        todos[idx].dataNasc = document.getElementById('editPacienteDataNasc').value;
        todos[idx].genero = document.getElementById('editPacienteGenero').value;
        todos[idx].idadeAnos = document.getElementById('editPacienteIdadeAnos').value;
        todos[idx].idadeMeses = document.getElementById('editPacienteIdadeMeses').value;
        todos[idx].idadeDias = document.getElementById('editPacienteIdadeDias').value;
        todos[idx].documento = document.getElementById('editPacienteDocumento').value;
        todos[idx].cartao = document.getElementById('editPacienteCartao').value;

        salvarPacientesNoBanco(todos);
        atualizarDropdowns();
        renderizarTabelaPacientes();

        bootstrap.Modal.getInstance(document.getElementById('modalEditarPaciente')).hide();
        alert("Dados cadastrais atualizados com sucesso!");
    }
}

function agendarConsulta(event) {
    event.preventDefault();

    const pacienteId = parseInt(document.getElementById('consultaPacienteSelect').value);
    if (!pacienteId) return alert("Por favor, selecione um paciente.");

    const pacientes = buscarPacientesDoBanco();
    const pacienteSelecionado = pacientes.find(p => p.id === pacienteId);
    if (!pacienteSelecionado) return alert("Paciente não encontrado no sistema.");

    const todas = buscarConsultasDoBanco();
    const proximoId = todas.length > 0 ? Math.max(...todas.map(c => c.id || 0)) + 1 : 1;

    const novaConsulta = {
        id: proximoId,
        pacienteId: pacienteSelecionado.id,
        nomePaciente: pacienteSelecionado.nome,
        data: document.getElementById('consultaData').value,
        horario: document.getElementById('consultaHorario').value,
        profissional: document.getElementById('consultaProfissional').value,
        status: 'Agendado'
    };

    todas.push(novaConsulta);
    salvarConsultasNoBanco(todas);

    alert("Consulta agendada com sucesso!");
    document.getElementById('formNovaConsulta').reset();
    
    // Atualiza todas as tabelas afetadas
    renderizarTabelaConsultas();
    renderizarTabelaConsultasConcluidas();
    renderizarMinhasConsultas();
    renderizarMinhasConsultasConcluidas();

    const botaoAbaConsultas = document.getElementById('tab-consultas-agendadas');
    if (botaoAbaConsultas) {
        bootstrap.Tab.getOrCreateInstance(botaoAbaConsultas).show();
    }
}

function obterClasseStatusConsulta(status) {
    if (status === 'Confirmado') return 'bg-success text-white';
    if (status === 'Cancelado') return 'bg-danger text-white';
    if (status === 'Atendido') return 'bg-info text-dark';
    return 'bg-warning text-dark';
}

// === EXIBIÇÃO: MURAL DE CONSULTAS (TODOS) ===
function renderizarTabelaConsultas() {
    const tabela = document.getElementById('tabelaConsultas');
    if (!tabela) return;

    let todasAsConsultas = buscarConsultasDoBanco();

    todasAsConsultas.sort((a, b) => {
        const dataHoraA = new Date(`${a.data}T${a.horario}`);
        const dataHoraB = new Date(`${b.data}T${b.horario}`);
        return dataHoraA - dataHoraB; 
    });

    const inputBusca = document.getElementById('buscaConsulta');
    const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : '';

    tabela.innerHTML = '';

    const filtradas = todasAsConsultas.filter(c => {
        if (c.status === 'Atendido' || c.status === 'Cancelado') return false;

        const paciente = c.nomePaciente ? c.nomePaciente.toLowerCase() : '';
        const medico = c.profissional ? c.profissional.toLowerCase() : '';
        return paciente.includes(termoBusca) || medico.includes(termoBusca);
    });

    if (filtradas.length === 0) {
        const msg = termoBusca ? 'Nenhum agendamento ativo localizado.' : 'Nenhuma consulta ativa no mural.';
        tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">${msg}</td></tr>`;
        return;
    }

    filtradas.forEach(c => {
        const corStatus = obterClasseStatusConsulta(c.status);
        const linhaHTML = `
            <tr>
                <td><strong class="text-dark">${c.nomePaciente}</strong></td>
                <td><i class="bi bi-calendar3 text-primary"></i> ${formatarDataBR(c.data)} às <strong>${c.horario}</strong></td>
                <td><span class="badge bg-secondary">${c.profissional}</span></td>
                <td><span class="badge ${corStatus}">${c.status}</span></td>
                <td class="text-end text-nowrap">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-success" onclick="alterarStatusConsulta(${c.id}, 'Confirmado')" title="Confirmar Presença">
                            <i class="bi bi-check-lg"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="alterarStatusConsulta(${c.id}, 'Atendido')" title="Finalizar e Mover para Concluídas">
                            <i class="bi bi-person-check"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="alterarStatusConsulta(${c.id}, 'Cancelado')" title="Cancelar Horário e Mover para Concluídas">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tabela.insertAdjacentHTML('beforeend', linhaHTML);
    });
}

// === EXIBIÇÃO: HISTÓRICO DE CONSULTAS (TODOS) ===
function renderizarTabelaConsultasConcluidas() {
    const tabela = document.getElementById('tabelaConsultasConcluidas');
    if (!tabela) return;

    let todasAsConsultas = buscarConsultasDoBanco();

    todasAsConsultas.sort((a, b) => {
        const dataHoraA = new Date(`${a.data}T${a.horario}`);
        const dataHoraB = new Date(`${b.data}T${b.horario}`);
        return dataHoraB - dataHoraA; 
    });

    const inputBusca = document.getElementById('buscaConsultaConcluida');
    const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : '';

    tabela.innerHTML = '';

    const filtradas = todasAsConsultas.filter(c => {
        if (c.status !== 'Atendido' && c.status !== 'Cancelado') return false;

        const paciente = c.nomePaciente ? c.nomePaciente.toLowerCase() : '';
        const medico = c.profissional ? c.profissional.toLowerCase() : '';
        return paciente.includes(termoBusca) || medico.includes(termoBusca);
    });

    if (filtradas.length === 0) {
        const msg = termoBusca ? 'Nenhum histórico localizado.' : 'Nenhuma consulta concluída ou cancelada arquivada.';
        tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">${msg}</td></tr>`;
        return;
    }

    filtradas.forEach(c => {
        const corStatus = obterClasseStatusConsulta(c.status);
        const linhaHTML = `
            <tr>
                <td><strong class="text-dark">${c.nomePaciente}</strong></td>
                <td><i class="bi bi-calendar-check text-secondary"></i> ${formatarDataBR(c.data)} às <strong>${c.horario}</strong></td>
                <td><span class="badge bg-secondary">${c.profissional}</span></td>
                <td><span class="badge ${corStatus}">${c.status}</span></td>
                <td class="text-end text-nowrap">
                    <button class="btn btn-sm btn-outline-secondary" onclick="alterarStatusConsulta(${c.id}, 'Agendado')" title="Reativar para o Mural">
                        <i class="bi bi-arrow-counterclockwise"></i> Reativar
                    </button>
                </td>
            </tr>
        `;
        tabela.insertAdjacentHTML('beforeend', linhaHTML);
    });
}

// =========================================================================
// SISTEMA EXCLUSIVO DO PERFIL "MINHAS CONSULTAS"
// =========================================================================
function renderizarMinhasConsultas() {
    const tabela = document.getElementById('tabelaMinhasConsultas');
    if (!tabela) return;

    let todasAsConsultas = buscarConsultasDoBanco();
    const meuNome = obterNomeProfissionalLogado();

    let minhasAtivas = todasAsConsultas.filter(c => 
        c.profissional === meuNome && 
        (c.status === 'Agendado' || c.status === 'Confirmado')
    );

    minhasAtivas.sort((a, b) => {
        const dataHoraA = new Date(`${a.data}T${a.horario}`);
        const dataHoraB = new Date(`${b.data}T${b.horario}`);
        return dataHoraA - dataHoraB; 
    });

    tabela.innerHTML = '';

    if (minhasAtivas.length === 0) {
        tabela.innerHTML = `<tr><td colspan=\"4\" class=\"text-center text-muted py-4\">Você não possui agendamentos pendentes.</td></tr>`;
        return;
    }

    minhasAtivas.forEach(c => {
        const corStatus = obterClasseStatusConsulta(c.status);
        const linhaHTML = `
            <tr>
                <td><strong class="text-dark">${c.nomePaciente}</strong></td>
                <td><i class="bi bi-calendar3 text-primary"></i> ${formatarDataBR(c.data)}<br><strong>${c.horario}</strong></td>
                <td><span class="badge ${corStatus}">${c.status}</span></td>
                <td class="text-end text-nowrap">
                    <div class="btn-group btn-group-sm d-flex flex-column gap-1">
                        <button class="btn btn-outline-success" onclick="alterarStatusConsulta(${c.id}, 'Confirmado')" title="Confirmar Presença">
                            <i class="bi bi-check-lg"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="alterarStatusConsulta(${c.id}, 'Atendido')" title="Finalizar e Mover">
                            <i class="bi bi-person-check"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="alterarStatusConsulta(${c.id}, 'Cancelado')" title="Cancelar Horário">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tabela.insertAdjacentHTML('beforeend', linhaHTML);
    });
}

function renderizarMinhasConsultasConcluidas() {
    const tabela = document.getElementById('tabelaMinhasConsultasConcluidas');
    if (!tabela) return;

    let todasAsConsultas = buscarConsultasDoBanco();
    const meuNome = obterNomeProfissionalLogado();

    let minhasConcluidas = todasAsConsultas.filter(c => 
        c.profissional === meuNome && 
        (c.status === 'Atendido' || c.status === 'Cancelado')
    );

    minhasConcluidas.sort((a, b) => {
        const dataHoraA = new Date(`${a.data}T${a.horario}`);
        const dataHoraB = new Date(`${b.data}T${b.horario}`);
        return dataHoraB - dataHoraA; 
    });

    tabela.innerHTML = '';

    if (minhasConcluidas.length === 0) {
        tabela.innerHTML = `<tr><td colspan=\"4\" class=\"text-center text-muted py-4\">Você não possui consultas concluídas no histórico.</td></tr>`;
        return;
    }

    minhasConcluidas.forEach(c => {
        const corStatus = obterClasseStatusConsulta(c.status);
        const linhaHTML = `
            <tr>
                <td><strong class="text-dark">${c.nomePaciente}</strong></td>
                <td><i class="bi bi-calendar-check text-secondary"></i> ${formatarDataBR(c.data)}<br><strong>${c.horario}</strong></td>
                <td><span class="badge ${corStatus}">${c.status}</span></td>
                <td class="text-end text-nowrap">
                    <button class="btn btn-sm btn-outline-secondary" onclick="alterarStatusConsulta(${c.id}, 'Agendado')" title="Reativar para o Mural">
                        <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                </td>
            </tr>
        `;
        tabela.insertAdjacentHTML('beforeend', linhaHTML);
    });
}

// === CENTRAL DE STATUS ===
function alterarStatusConsulta(id, novoStatus) {
    const todas = buscarConsultasDoBanco();
    const idx = todas.findIndex(c => c.id === id);

    if (idx !== -1) {
        todas[idx].status = novoStatus;
        salvarConsultasNoBanco(todas);
        
        // Renderiza todas as 4 tabelas para atualizar em tempo real globalmente!
        renderizarTabelaConsultas();
        renderizarTabelaConsultasConcluidas();
        renderizarMinhasConsultas();
        renderizarMinhasConsultasConcluidas();
    }
}

function obterClassePrioridade(prioridade) {
    if (prioridade === 'Urgente') return 'bg-warning text-dark';
    if (prioridade === 'Emergência') return 'bg-danger text-white';
    return 'bg-success text-white';
}

function formatarDataBR(dataString) {
    if (!dataString) return 'Não informada';
    const partes = dataString.split('-');
    if (partes.length !== 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function renderizarTabelaProntuarios() {
    const tabela = document.getElementById('tabelaProntuarios');
    if (!tabela) return;

    const todosOsProntuarios = buscarTodosDoBanco();
    const inputBusca = document.getElementById('buscaPaciente');
    const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : '';

    tabela.innerHTML = '';

    const filtrados = todosOsProntuarios.filter(p => {
        const nome = p.nomePaciente ? p.nomePaciente.toLowerCase() : '';
        return nome.includes(termoBusca);
    });

    if (filtrados.length === 0) {
        const msg = termoBusca ? 'Nenhum paciente localizado com este nome.' : 'Nenhum prontuário registrado no sistema.';
        tabela.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">${msg}</td></tr>`;
        return;
    }

    filtrados.forEach(p => {
        let corPrioridade = obterClassePrioridade(p.prioridade);
        const subInfo = `${p.tipoAtendimento} > ${p.convenioCartao || 'Sem convênio'}`;
        
        const imgCarimbo = (p.carimboAssinatura && p.carimboAssinatura !== '') 
            ? p.carimboAssinatura 
            : 'https://cdn-icons-png.flaticon.com/512/2965/2965879.png';

        const linhaHTML = `
            <tr data-id="${p.id}">
                <td> 
                    <div class="d-flex align-items-center gap-3">
                        <img src="${imgCarimbo}" class="rounded-circle object-fit-cover shadow-sm bg-white" style="width: 50px; height: 50px; min-width: 50px; border: 1px solid #dee2e6;">
                        <div>
                            <h6 class="mb-1 fw-bold text-dark">${p.nomePaciente}</h6>
                            <div class="text-muted small mb-1">${subInfo}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-secondary mb-1">${p.especialidade}</span><br>
                    <span class="badge ${corPrioridade}">${p.prioridade}</span>
                </td>
                <td class="text-dark small align-middle">
                    <strong>Nasc:</strong> ${formatarDataBR(p.dataNascimento)}<br>
                    <span class="text-muted small">Gênero: ${p.genero || 'N/I'}</span>
                </td>
                <td class="text-end text-nowrap align-middle">
                    <button class="btn btn-sm btn-outline-primary" onclick="abrirEdicaoProntuario(${p.id})" title="Abrir Prontuário Completo">
                        <i class="bi bi-file-earmark-medical"></i> Abrir
                    </button>
                </td>
            </tr>
        `;
        tabela.insertAdjacentHTML('beforeend', linhaHTML);
    });
}

function publicarProntuario(event) {
    event.preventDefault();

    const pacienteId = parseInt(document.getElementById('prontuarioPacienteSelect').value);
    if (!pacienteId) return alert("Por favor, selecione um paciente cadastrado.");

    const pacientes = buscarPacientesDoBanco();
    const pacienteSelecionado = pacientes.find(p => p.id === pacienteId);
    if (!pacienteSelecionado) return alert("Erro ao identificar o paciente selecionado.");

    let cpfMedico = localStorage.getItem('loggedInUserCPF') || 'anonimo';
    const todos = buscarTodosDoBanco();
    const proximoId = todos.length > 0 ? Math.max(...todos.map(p => p.id || 0)) + 1 : 1;

    const carimboImg = document.getElementById('prontuarioCarimboPreview').src;
    const carimboSalvar = carimboImg.startsWith('data:image') ? carimboImg : '';

    const novoProntuario = {
        id: proximoId,
        pacienteId: pacienteSelecionado.id,
        nomePaciente: pacienteSelecionado.nome,
        dataNascimento: pacienteSelecionado.dataNasc,
        genero: pacienteSelecionado.genero,
        idadeAnos: pacienteSelecionado.idadeAnos,
        idadeMeses: pacienteSelecionado.idadeMeses,
        idadeDias: pacienteSelecionado.idadeDias,
        documento: pacienteSelecionado.documento,
        convenioCartao: pacienteSelecionado.cartao,
        acompanhante: document.getElementById('prontuarioAcompanhante').value,
        especialidade: document.getElementById('prontuarioEspecialidade').value,
        tipoAtendimento: document.getElementById('prontuarioTipoAtendimento').value,
        prioridade: document.getElementById('prontuarioPrioridade').value,
        registroProfissional: document.getElementById('prontuarioRegistroProfissional').value,
        carimboAssinatura: carimboSalvar,
        qp: document.getElementById('prontuarioQP').value,
        hda: document.getElementById('prontuarioHDA').value,
        hmp: document.getElementById('prontuarioHMP').value,
        alergias: document.getElementById('prontuarioAlergias').value,
        sinalPA: document.getElementById('prontuarioPA').value,
        sinalFC: document.getElementById('prontuarioFC').value,
        sinalFR: document.getElementById('prontuarioFR').value,
        sinalTEMP: document.getElementById('prontuarioTEMP').value,
        sinalSATO2: document.getElementById('prontuarioSATO2').value,
        estadoGeral: document.getElementById('prontuarioEstadoGeral').value,
        cardioResp: document.getElementById('prontuarioCardioResp').value,
        neuroOutros: document.getElementById('prontuarioNeuroOutros').value,
        hipotese: document.getElementById('prontuarioHipotese').value,
        conduta: document.getElementById('prontuarioConduta').value,
        medicoCPF: cpfMedico
    };

    todos.unshift(novoProntuario);
    salvarNoBancoUnificado(novoProntuario, todos);

    alert("Prontuário clínico aberto e autenticado com sucesso!");

    document.getElementById('formNovoProntuario').reset();
    const preview = document.getElementById('prontuarioCarimboPreview');
    if (preview) {
        preview.src = "";
        preview.classList.add('d-none');
    }

    const botaoAbaHistorico = document.getElementById('tab-historico-prontuarios');
    if (botaoAbaHistorico) {
        bootstrap.Tab.getOrCreateInstance(botaoAbaHistorico).show();
    }

    renderizarTabelaProntuarios();
}

function abrirEdicaoProntuario(id) {
    const todos = buscarTodosDoBanco();
    const prontuario = todos.find(p => p.id === id);

    if (!prontuario) return alert("Prontuário não localizado.");

    document.getElementById('editProntuarioId').value = prontuario.id;
    
    document.getElementById('editProntuarioNome').textContent = prontuario.nomePaciente || 'Não informado';
    document.getElementById('editProntuarioNasc').textContent = formatarDataBR(prontuario.dataNascimento);
    document.getElementById('editProntuarioGenero').textContent = prontuario.genero || 'Não informado';
    document.getElementById('editProntuarioCartao').textContent = prontuario.convenioCartao || 'Não informado';

    document.getElementById('editProntuarioQP').value = prontuario.qp || '';
    document.getElementById('editProntuarioHDA').value = prontuario.hda || '';
    document.getElementById('editProntuarioHMP').value = prontuario.hmp || '';
    document.getElementById('editProntuarioAlergias').value = prontuario.alergias || '';

    document.getElementById('editProntuarioPA').value = prontuario.sinalPA || '';
    document.getElementById('editProntuarioFC').value = prontuario.sinalFC || '';
    document.getElementById('editProntuarioFR').value = prontuario.sinalFR || '';
    document.getElementById('editProntuarioTEMP').value = prontuario.sinalTEMP || '';
    document.getElementById('editProntuarioSATO2').value = prontuario.sinalSATO2 || '';
    document.getElementById('editProntuarioEstadoGeral').value = prontuario.estadoGeral || '';
    document.getElementById('editProntuarioCardio').value = prontuario.cardioResp || '';
    document.getElementById('editProntuarioNeuro').value = prontuario.neuroOutros || '';

    document.getElementById('editProntuarioHD').value = prontuario.hipotese || '';
    document.getElementById('editProntuarioConduta').value = prontuario.conduta || '';
    document.getElementById('editProntuarioPrioridade').value = prontuario.prioridade || 'Normal';
    
    document.getElementById('editProntuarioRegistro').textContent = prontuario.registroProfissional || 'Não informado';

    const imgCarimbo = document.getElementById('editProntuarioCarimboView');
    const wrapper = document.getElementById('wrapperCarimboVisualizar');
    if (prontuario.carimboAssinatura && prontuario.carimboAssinatura !== "") {
        imgCarimbo.src = prontuario.carimboAssinatura;
        wrapper.classList.remove('d-none');
    } else {
        imgCarimbo.src = "";
        wrapper.classList.add('d-none');
    }

    const modalElement = document.getElementById('modalEditarProntuario');
    bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

function salvarEdicaoProntuario() {
    const id = parseInt(document.getElementById('editProntuarioId').value);
    const todos = buscarTodosDoBanco();
    const idx = todos.findIndex(p => p.id === id);

    if (idx !== -1) {
        todos[idx].prioridade = document.getElementById('editProntuarioPrioridade').value;
        todos[idx].conduta = document.getElementById('editProntuarioConduta').value;

        salvarNoBancoUnificado(todos[idx], todos);
        renderizarTabelaProntuarios();
        bootstrap.Modal.getInstance(document.getElementById('modalEditarProntuario')).hide();
        alert("Evolução clínica atualizada com sucesso!");
    }
}

// --- ECOSSISTEMA DO DOM ---
document.addEventListener('DOMContentLoaded', () => {
    try { carregarDadosPerfil(); } catch(e){}
    try { renderizarTabelaProntuarios(); } catch(e){}
    try { atualizarDropdowns(); } catch(e){}
    try { renderizarTabelaPacientes(); } catch(e){}
    
    // Atualização Inicial das 4 Tabelas de Consultas
    try { renderizarTabelaConsultas(); } catch(e){}
    try { renderizarTabelaConsultasConcluidas(); } catch(e){}
    try { renderizarMinhasConsultas(); } catch(e){}
    try { renderizarMinhasConsultasConcluidas(); } catch(e){}

    const inputBusca = document.getElementById('buscaPaciente');
    if (inputBusca) inputBusca.addEventListener('input', renderizarTabelaProntuarios);

    const inputBuscaPacientes = document.getElementById('buscaPacienteLista');
    if (inputBuscaPacientes) inputBuscaPacientes.addEventListener('input', renderizarTabelaPacientes);

    const inputBuscaConsultas = document.getElementById('buscaConsulta');
    if (inputBuscaConsultas) inputBuscaConsultas.addEventListener('input', renderizarTabelaConsultas);

    const inputBuscaConcluidas = document.getElementById('buscaConsultaConcluida');
    if (inputBuscaConcluidas) inputBuscaConcluidas.addEventListener('input', renderizarTabelaConsultasConcluidas);

    const botaoAbaHistorico = document.getElementById('tab-historico-prontuarios');
    if (botaoAbaHistorico) botaoAbaHistorico.addEventListener('shown.bs.tab', renderizarTabelaProntuarios);

    const botaoAbaPacientes = document.getElementById('tab-pacientes-cadastrados');
    if (botaoAbaPacientes) document.getElementById('tab-pacientes-cadastrados').addEventListener('shown.bs.tab', renderizarTabelaPacientes);

    const botaoAbaConsultas = document.getElementById('tab-consultas-agendadas');
    if (botaoAbaConsultas) botaoAbaConsultas.addEventListener('shown.bs.tab', renderizarTabelaConsultas);

    const botaoAbaConcluidas = document.getElementById('tab-consultas-concluidas');
    if (botaoAbaConcluidas) botaoAbaConcluidas.addEventListener('shown.bs.tab', renderizarTabelaConsultasConcluidas);

    const botaoAbaNovoProntuario = document.getElementById('tab-novo-prontuario');
    if (botaoAbaNovoProntuario) botaoAbaNovoProntuario.addEventListener('shown.bs.tab', atualizarDropdowns);
    
    const botaoAbaNovaConsulta = document.getElementById('tab-nova-consulta');
    if (botaoAbaNovaConsulta) botaoAbaNovaConsulta.addEventListener('shown.bs.tab', atualizarDropdowns);
    
    // Atualiza a tabela caso o perfil mude ou seja clicado
    const botaoAbaPerfil = document.getElementById('tab-perfil-aba');
    if (botaoAbaPerfil) botaoAbaPerfil.addEventListener('shown.bs.tab', () => {
        renderizarMinhasConsultas();
        renderizarMinhasConsultasConcluidas();
    });
});