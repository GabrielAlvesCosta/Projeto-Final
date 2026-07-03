(function() {
    // Validação imediata de Sessão/Token local
    const usuarioLogado = localStorage.getItem('loggedInUserCPF');
    if (!usuarioLogado) {
        window.location.replace('login.html');
    }
})();

// ====================================================================
// GESTÃO DE MÍDIA / PREVIEWS
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

// ====================================================================
// PERFIL DO PROFISSIONAL E CONECTIVIDADE LOCAL
// ====================================================================
function obterNomeProfissionalLogado() {
    const cpfLogado = localStorage.getItem('loggedInUserCPF');
    if (cpfLogado) {
        const dados = localStorage.getItem(cpfLogado);
        if (dados) {
            try {
                const user = JSON.parse(dados);
                if (user && user.nome) return user.nome;
            } catch(e){}
        }
    }
    return "";
}

function carregarDadosPerfil() {
    const cpfLogado = localStorage.getItem('loggedInUserCPF');
    if (cpfLogado) {
        const dados = localStorage.getItem(cpfLogado);
        if (dados) {
            try {
                const user = JSON.parse(dados);
                const display = document.getElementById('user-display-name');
                if (display) display.textContent = user.nome ? "Profissional: " + user.nome.split(' ')[0] : 'Profissional';
                if (document.getElementById('perfilNome')) document.getElementById('perfilNome').value = user.nome || '';
                if (document.getElementById('perfilEmail')) document.getElementById('perfilEmail').value = user.email || '';
                if (document.getElementById('perfilCPF')) document.getElementById('perfilCPF').value = user.cpf || '';
                if (document.getElementById('perfilFoto') && user.foto) document.getElementById('perfilFoto').src = user.foto;
            } catch(e){}
        }
    }
}

async function salvarPerfil() {
    const cpfLogado = localStorage.getItem('loggedInUserCPF');
    if (!cpfLogado) return alert("Erro de sessão do profissional.");

    let user = {};
    const dados = localStorage.getItem(cpfLogado);
    if (dados) { try { user = JSON.parse(dados); } catch(e){} }

    user.nome = document.getElementById('perfilNome').value;
    user.email = document.getElementById('perfilEmail').value;
    user.foto = document.getElementById('perfilFoto').src;

    localStorage.setItem(cpfLogado, JSON.stringify(user));
    
    try {
        await fetch('/api/usuarios', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
    } catch(e) {}

    carregarDadosPerfil();
    await atualizarDropdownProfissionais();
    await renderizarMinhasConsultas();
    await renderizarMinhasConsultasConcluidas();

    alert("Dados salvos e atualizados com sucesso!");
}

// ====================================================================
// DROPDOWNS (SELECTS) DINÂMICOS - CONECTADOS AO BACKEND
// ====================================================================
async function atualizarDropdownPacientes() {
    const selectProntuario = document.getElementById('prontuarioPacienteSelect');
    const selectConsulta = document.getElementById('consultaPacienteSelect');
    if (!selectProntuario && !selectConsulta) return;

    try {
        const res = await fetch('/api/pacientes');
        if (!res.ok) return;
        const pacientes = await res.json();
        
        const optionsHTML = '<option value="">Selecione um paciente cadastrado...</option>' + 
            pacientes.map(p => `<option value="${p.id}">${p.nome} (Doc: ${p.documento || 'S/N'})</option>`).join('');

        if (selectProntuario) selectProntuario.innerHTML = optionsHTML;
        if (selectConsulta) selectConsulta.innerHTML = optionsHTML;
    } catch(e){}
}

async function atualizarDropdownProfissionais() {
    const selectProfissional = document.getElementById('consultaProfissional');
    if (!selectProfissional) return;

    try {
        const res = await fetch('/api/usuarios');
        if (!res.ok) throw new Error("Erro na requisição da API");

        const usuarios = await res.json();
        
        const optionsHTML = '<option value="">Selecione o Médico / Especialista...</option>' + 
            usuarios.map(u => {
                const nome = u.nome || u.username || 'Profissional Desconhecido';
                return `<option value="${nome}">${nome}</option>`;
            }).join('');

        selectProfissional.innerHTML = optionsHTML;
    } catch(e){}
}

// ====================================================================
// REQUISITOS DA API EM PYTHON (FLASK) - PACIENTES
// ====================================================================
async function cadastrarPaciente(event) {
    event.preventDefault();

    const radioGenero = document.querySelector('input[name="pacienteGenero"]:checked');
    const generoSelecionado = radioGenero ? radioGenero.value : "Não informado";

    const novoPaciente = {
        nome: document.getElementById('pacienteNome').value,
        dataNasc: document.getElementById('pacienteDataNasc').value,
        genero: generoSelecionado,
        idadeAnos: document.getElementById('pacienteIdadeAnos').value,
        idadeMeses: document.getElementById('pacienteIdadeMeses').value,
        idadeDias: document.getElementById('pacienteIdadeDias').value,
        documento: document.getElementById('pacienteDocumento').value,
        cartao: document.getElementById('pacienteCartao').value
    };

    try {
        const res = await fetch('/api/pacientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoPaciente)
        });
        if (res.ok) {
            alert("Paciente cadastrado com sucesso!");
            document.getElementById('formNovoPaciente').reset();
            await atualizarDropdownPacientes();
            await renderizarTabelaPacientes();
            const tab = document.getElementById('tab-pacientes-cadastrados');
            if (tab) bootstrap.Tab.getOrCreateInstance(tab).show();
        }
    } catch(e) { alert("Erro ao cadastrar o paciente."); }
}

async function renderizarTabelaPacientes() {
    const tabela = document.getElementById('tabelaPacientes');
    if (!tabela) return;

    try {
        const res = await fetch('/api/pacientes');
        if (!res.ok) return;
        const pacientes = await res.json();
        const inputBusca = document.getElementById('buscaPacienteLista');
        const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : '';

        tabela.innerHTML = '';

        const filtrados = pacientes.filter(p => (p.nome || '').toLowerCase().includes(termoBusca));

        if (filtrados.length === 0) {
            tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Nenhum paciente localizado.</td></tr>`;
            return;
        }

        filtrados.forEach(p => {
            tabela.insertAdjacentHTML('beforeend', `
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
            `);
        });
    } catch(e){}
}

async function abrirEdicaoPaciente(id) {
    try {
        const res = await fetch('/api/pacientes');
        const pacientes = await res.json();
        const paciente = pacientes.find(p => p.id === id);
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

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditarPaciente')).show();
    } catch(e){}
}

async function salvarEdicaoPaciente() {
    const id = parseInt(document.getElementById('editPacienteId').value);
    const pacienteAtualizado = {
        id: id,
        nome: document.getElementById('editPacienteNome').value,
        dataNasc: document.getElementById('editPacienteDataNasc').value,
        genero: document.getElementById('editPacienteGenero').value,
        idadeAnos: document.getElementById('editPacienteIdadeAnos').value,
        idadeMeses: document.getElementById('editPacienteIdadeMeses').value,
        idadeDias: document.getElementById('editPacienteIdadeDias').value,
        documento: document.getElementById('editPacienteDocumento').value,
        cartao: document.getElementById('editPacienteCartao').value
    };

    try {
        const res = await fetch('/api/pacientes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pacienteAtualizado)
        });
        if (res.ok) {
            await atualizarDropdownPacientes();
            await renderizarTabelaPacientes();
            bootstrap.Modal.getInstance(document.getElementById('modalEditarPaciente')).hide();
            alert("Dados cadastrais do paciente atualizados!");
        }
    } catch(e){}
}

// ====================================================================
// REQUISITOS DA API EM PYTHON - CONSULTAS
// ====================================================================
async function agendarConsulta(event) {
    event.preventDefault();

    const pacienteId = parseInt(document.getElementById('consultaPacienteSelect').value);
    if (!pacienteId) return alert("Por favor, selecione um paciente.");

    const dataInput = document.getElementById('consultaData').value;
    const horarioInput = document.getElementById('consultaHorario').value;
    const profissionalInput = document.getElementById('consultaProfissional').value;

    if (!dataInput || !horarioInput) {
        return alert("Por favor, selecione a data e o horário da consulta.");
    }
    if (!profissionalInput) {
        return alert("Por favor, selecione o médico / especialista responsável.");
    }

    const dataHoraConsulta = new Date(`${dataInput}T${horarioInput}`);
    const agora = new Date();

    if (dataHoraConsulta < agora) {
        return alert("Erro crítico: Não é possível agendar uma consulta para uma data ou horário que já passou!");
    }

    const selectPac = document.getElementById('consultaPacienteSelect');
    const nomePaciente = selectPac.options[selectPac.selectedIndex].text.split(' (Doc:')[0];

    const novaConsulta = {
        pacienteId: pacienteId,
        nomePaciente: nomePaciente,
        data: dataInput,
        horario: horarioInput,
        profissional: profissionalInput,
        status: 'Agendado'
    };

    try {
        const response = await fetch('/api/consultas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novaConsulta)
        });

        if (!response.ok) {
            const errData = await response.json();
            return alert(errData.error || "Erro ao agendar consulta.");
        }

        alert("Consulta agendada com sucesso!");
        document.getElementById('formNovaConsulta').reset();
        
        await renderizarTabelaConsultas();
        await renderizarTabelaConsultasConcluidas();
        await renderizarMinhasConsultas();
        await renderizarMinhasConsultasConcluidas();
        await atualizarPainelAtendimentos();

        const tab = document.getElementById('tab-consultas-agendadas');
        if (tab) bootstrap.Tab.getOrCreateInstance(tab).show();
    } catch (error) {
        alert("Erro de comunicação com o servidor.");
    }
}

function obterClasseStatusConsulta(status) {
    if (status === 'Confirmado') return 'bg-success text-white';
    if (status === 'Cancelado') return 'bg-danger text-white';
    if (status === 'Atendido') return 'bg-info text-dark';
    return 'bg-primary text-white';
}

// === MURAL GERAL DE CONSULTAS ===
async function renderizarTabelaConsultas() {
    const tabela = document.getElementById('tabelaConsultas');
    if (!tabela) return;

    try {
        const res = await fetch('/api/consultas?status=ativas');
        if (!res.ok) return;
        const consultas = await res.json();
        
        const inputBusca = document.getElementById('buscaConsulta');
        const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : '';

        tabela.innerHTML = '';

        const filtradas = consultas.filter(c => {
            const pac = (c.nomePaciente || '').toLowerCase();
            const med = (c.profissional || '').toLowerCase();
            return pac.includes(termoBusca) || med.includes(termoBusca);
        });

        if (filtradas.length === 0) {
            tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Nenhuma consulta ativa agendada.</td></tr>`;
            return;
        }

        filtradas.forEach(c => {
            tabela.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><strong class="text-dark">${c.nomePaciente}</strong></td>
                    <td><i class="bi bi-calendar3 text-primary"></i> ${formatarDataBR(c.data)} às <strong>${c.horario}</strong></td>
                    <td><span class="badge bg-secondary">${c.profissional}</span></td>
                    <td><span class="badge ${obterClasseStatusConsulta(c.status)}">${c.status}</span></td>
                    <td class="text-end text-nowrap">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-success" onclick="alterarStatusConsulta(${c.id}, 'Confirmado')" title="Confirmar Presença"><i class="bi bi-check-lg"></i></button>
                            <button class="btn btn-outline-info" onclick="alterarStatusConsulta(${c.id}, 'Atendido')" title="Finalizar Atendimento"><i class="bi bi-person-check"></i></button>
                            <button class="btn btn-outline-danger" onclick="alterarStatusConsulta(${c.id}, 'Cancelado')" title="Cancelar Horário"><i class="bi bi-x-lg"></i></button>
                        </div>
                    </td>
                </tr>
            `);
        });
    } catch(e){}
}

async function renderizarTabelaConsultasConcluidas() {
    const tabela = document.getElementById('tabelaConsultasConcluidas');
    if (!tabela) return;

    try {
        const res = await fetch('/api/consultas?status=concluidas');
        if (!res.ok) return;
        const consultas = await res.json();
        
        const inputBusca = document.getElementById('buscaConsultaConcluida');
        const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : '';

        tabela.innerHTML = '';

        const filtradas = consultas.filter(c => {
            const pac = (c.nomePaciente || '').toLowerCase();
            const med = (c.profissional || '').toLowerCase();
            return pac.includes(termoBusca) || med.includes(termoBusca);
        });

        if (filtradas.length === 0) {
            tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Nenhuma consulta finalizada ou cancelada localizada.</td></tr>`;
            return;
        }

        filtradas.forEach(c => {
            tabela.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><strong class="text-dark">${c.nomePaciente}</strong></td>
                    <td><i class="bi bi-calendar-check text-secondary"></i> ${formatarDataBR(c.data)} às <strong>${c.horario}</strong></td>
                    <td><span class="badge bg-secondary">${c.profissional}</span></td>
                    <td><span class="badge ${obterClasseStatusConsulta(c.status)}">${c.status}</span></td>
                    <td class="text-end text-nowrap">
                        <button class="btn btn-sm btn-outline-secondary" onclick="alterarStatusConsulta(${c.id}, 'Agendado')" title="Reativar para o Mural"><i class="bi bi-arrow-counterclockwise"></i> Reativar</button>
                    </td>
                </tr>
            `);
        });
    } catch(e){}
}

// === EXCLUSIVO DO PERFIL "MEU PAINEL DE ATENDIMENTOS" ===
async function renderizarMinhasConsultas() {
    const tabela = document.getElementById('tabelaMinhasConsultas');
    if (!tabela) return;

    const meuNome = obterNomeProfissionalLogado();
    if (!meuNome) return;

    try {
        const res = await fetch('/api/consultas?status=ativas');
        if (!res.ok) return;
        
        const todasAtivas = await res.json();
        const minhasAtivas = todasAtivas.filter(c => c.profissional === meuNome);

        tabela.innerHTML = '';
        if (minhasAtivas.length === 0) {
            tabela.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Você não possui agendamentos pendentes.</td></tr>`;
            return;
        }

        minhasAtivas.forEach(c => {
            tabela.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><strong class="text-dark">${c.nomePaciente}</strong></td>
                    <td><i class="bi bi-calendar3 text-primary"></i> ${formatarDataBR(c.data)}<br><strong>${c.horario}</strong></td>
                    <td><span class="badge ${obterClasseStatusConsulta(c.status)}">${c.status}</span></td>
                    <td class="text-end text-nowrap">
                        <div class="btn-group btn-group-sm d-flex flex-column gap-1">
                            <button class="btn btn-outline-success" onclick="alterarStatusConsulta(${c.id}, 'Confirmado')" title="Confirmar"><i class="bi bi-check-lg"></i></button>
                            <button class="btn btn-outline-info" onclick="alterarStatusConsulta(${c.id}, 'Atendido')" title="Finalizar"><i class="bi bi-person-check"></i></button>
                            <button class="btn btn-outline-danger" onclick="alterarStatusConsulta(${c.id}, 'Cancelado')" title="Cancelar"><i class="bi bi-x-lg"></i></button>
                        </div>
                    </td>
                </tr>
            `);
        });
    } catch(e){}
}

async function renderizarMinhasConsultasConcluidas() {
    const tabela = document.getElementById('tabelaMinhasConsultasConcluidas');
    if (!tabela) return;

    const meuNome = obterNomeProfissionalLogado();
    if (!meuNome) return;

    try {
        const res = await fetch('/api/consultas?status=concluidas');
        if (!res.ok) return;
        
        const todasConcluidas = await res.json();
        const minhasConcluidas = todasConcluidas.filter(c => c.profissional === meuNome);

        tabela.innerHTML = '';
        if (minhasConcluidas.length === 0) {
            tabela.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Você não possui histórico concluído.</td></tr>`;
            return;
        }

        minhasConcluidas.forEach(c => {
            tabela.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><strong class="text-dark">${c.nomePaciente}</strong></td>
                    <td><i class="bi bi-calendar-check text-secondary"></i> ${formatarDataBR(c.data)}<br><strong>${c.horario}</strong></td>
                    <td><span class="badge ${obterClasseStatusConsulta(c.status)}">${c.status}</span></td>
                    <td class="text-end text-nowrap">
                        <button class="btn btn-sm btn-outline-secondary" onclick="alterarStatusConsulta(${c.id}, 'Agendado')" title="Reativar"><i class="bi bi-arrow-counterclockwise"></i></button>
                    </td>
                </tr>
            `);
        });
    } catch(e){}
}

async function atualizarPainelAtendimentos() {
    try {
        const resAtivas = await fetch('/api/consultas?status=ativas');
        const ativas = await resAtivas.json();

        const resConcluidas = await fetch('/api/consultas?status=concluidas');
        const concluidas = await resConcluidas.json();

        const resProntuarios = await fetch('/api/prontuarios');
        const prontuarios = await resProntuarios.json();

        const cpfLogado = localStorage.getItem('loggedInUserCPF');
        const nomeProfissional = obterNomeProfissionalLogado();

        const ativasDoProfissional = ativas.filter(c => c.profissional === nomeProfissional);
        const concluidasDoProfissional = concluidas.filter(c => c.profissional === nomeProfissional);
        const prontuariosDoProfissional = prontuarios.filter(p => p.medicoCPF === cpfLogado);

        if (document.getElementById('count-consultas-ativas')) document.getElementById('count-consultas-ativas').textContent = ativasDoProfissional.length;
        if (document.getElementById('count-consultas-concluidas')) document.getElementById('count-consultas-concluidas').textContent = concluidasDoProfissional.length;
        if (document.getElementById('count-prontuarios')) document.getElementById('count-prontuarios').textContent = prontuariosDoProfissional.length;
    } catch(e){}
}

// === CENTRAL DE ATUALIZAÇÃO ===
async function alterarStatusConsulta(id, novoStatus) {
    try {
        const res = await fetch('/api/consultas', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, status: novoStatus })
        });
        if (res.ok) {
            await renderizarTabelaConsultas();
            await renderizarTabelaConsultasConcluidas();
            await renderizarMinhasConsultas();
            await renderizarMinhasConsultasConcluidas();
            await atualizarPainelAtendimentos();
        }
    } catch(e){}
}

// ====================================================================
// REQUISITOS DA API EM PYTHON - PRONTUÁRIOS (PEP)
// ====================================================================
async function publicarProntuario(event) {
    event.preventDefault();

    const pacienteId = parseInt(document.getElementById('prontuarioPacienteSelect').value);
    if (!pacienteId) return alert("Por favor, selecione um paciente cadastrado.");

    try {
        const pRes = await fetch('/api/pacientes');
        const pacientes = await pRes.json();
        const pacienteSelecionado = pacientes.find(p => p.id === pacienteId);
        if (!pacienteSelecionado) return alert("Erro ao identificar o paciente.");

        const carimboImg = document.getElementById('prontuarioCarimboPreview').src;
        const carimboSalvar = carimboImg.startsWith('data:image') ? carimboImg : '';

        const novoProntuario = {
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
            medicoCPF: localStorage.getItem('loggedInUserCPF') || 'anonimo'
        };

        const res = await fetch('/api/prontuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoProntuario)
        });

        if (res.ok) {
            alert("Prontuário clínico aberto e autenticado!");
            document.getElementById('formNovoProntuario').reset();
            const preview = document.getElementById('prontuarioCarimboPreview');
            if (preview) { preview.src = ""; preview.classList.add('d-none'); }
            
            await renderizarTabelaProntuarios();
            await atualizarPainelAtendimentos();
            
            const tab = document.getElementById('tab-historico-prontuarios');
            if (tab) bootstrap.Tab.getOrCreateInstance(tab).show();
        }
    } catch(e){}
}

async function renderizarTabelaProntuarios() {
    const tabela = document.getElementById('tabelaProntuarios');
    if (!tabela) return;

    try {
        const res = await fetch('/api/prontuarios');
        const prontuarios = await res.json();
        const inputBusca = document.getElementById('buscaPaciente');
        const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : '';

        tabela.innerHTML = '';

        const filtrados = prontuarios.filter(p => (p.nomePaciente || '').toLowerCase().includes(termoBusca));

        if (filtrados.length === 0) {
            tabela.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Nenhum prontuário localizado.</td></tr>`;
            return;
        }

        filtrados.forEach(p => {
            let cl = p.prioridade === 'Urgente' ? 'bg-warning text-dark' : (p.prioridade === 'Emergência' ? 'bg-danger text-white' : 'bg-success text-white');
            const imgCarimbo = p.carimboAssinatura || 'https://cdn-icons-png.flaticon.com/512/2965/2965879.png';
            
            tabela.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            <img src="${imgCarimbo}" class="rounded-circle object-fit-cover shadow-sm bg-white" style="width: 50px; height: 50px; border: 1px solid #dee2e6;">
                            <div>
                                <h6 class="mb-1 fw-bold text-dark">${p.nomePaciente}</h6>
                                <div class="text-muted small">${p.tipoAtendimento} > ${p.convenioCartao || 'Sem convênio'}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-secondary mb-1">${p.especialidade}</span><br>
                        <span class="badge ${cl}">${p.prioridade}</span>
                    </td>
                    <td class="text-dark small">
                        <strong>Nasc:</strong> ${formatarDataBR(p.dataNascimento)}<br>
                        <span class="text-muted small">Gênero: ${p.genero || 'N/I'}</span>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary" onclick="abrirEdicaoProntuario(${p.id})">
                            <i class="bi bi-file-earmark-medical"></i> Abrir
                        </button>
                    </td>
                </tr>
            `);
        });
    } catch(e){}
}

async function abrirEdicaoProntuario(id) {
    try {
        const res = await fetch('/api/prontuarios');
        const prontuarios = await res.json();
        const prontuario = prontuarios.find(p => p.id === id);
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
        if (prontuario.carimboAssinatura) {
            imgCarimbo.src = prontuario.carimboAssinatura;
            wrapper.classList.remove('d-none');
        } else {
            imgCarimbo.src = "";
            wrapper.classList.add('d-none');
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditarProntuario')).show();
    } catch(e){}
}

async function salvarEdicaoProntuario() {
    const id = parseInt(document.getElementById('editProntuarioId').value);
    const dadosAlterados = {
        id: id,
        prioridade: document.getElementById('editProntuarioPrioridade').value,
        conduta: document.getElementById('editProntuarioConduta').value
    };

    try {
        const res = await fetch('/api/prontuarios', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosAlterados)
        });
        if (res.ok) {
            await renderizarTabelaProntuarios();
            bootstrap.Modal.getInstance(document.getElementById('modalEditarProntuario')).hide();
            alert("Evolução clínica atualizada com sucesso!");
        }
    } catch(e){}
}

function formatarDataBR(dataString) {
    if (!dataString) return 'Não informada';
    const partes = dataString.split('-');
    if (partes.length !== 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ====================================================================
// INICIALIZAÇÃO ASSÍNCRONA E LISTENERS DO ECOSSISTEMA DOM
// ====================================================================
document.addEventListener('DOMContentLoaded', async () => {
    carregarDadosPerfil();
    
    // Alimenta dropdowns do sistema com dados do BD
    await atualizarDropdownPacientes();
    await atualizarDropdownProfissionais();
    
    // Renderiza listagens Iniciais
    await renderizarTabelaPacientes();
    await renderizarTabelaConsultas();
    await renderizarTabelaConsultasConcluidas();
    await renderizarTabelaProntuarios();
    
    // Renderiza painel específico do profissional
    await renderizarMinhasConsultas();
    await renderizarMinhasConsultasConcluidas();
    await atualizarPainelAtendimentos();

    // UX: Configura limite visual no calendário (Impede agendamento no passado)
    const inputDataConsulta = document.getElementById('consultaData');
    if (inputDataConsulta) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        inputDataConsulta.min = `${ano}-${mes}-${dia}`;
    }

    // Monitoramento dos Inputs de Busca Dinâmica
    document.getElementById('buscaPaciente')?.addEventListener('input', renderizarTabelaProntuarios);
    document.getElementById('buscaPacienteLista')?.addEventListener('input', renderizarTabelaPacientes);
    document.getElementById('buscaConsulta')?.addEventListener('input', renderizarTabelaConsultas);
    document.getElementById('buscaConsultaConcluida')?.addEventListener('input', renderizarTabelaConsultasConcluidas);

    // Sincronização em tempo real das Abas do Bootstrap
    document.getElementById('tab-historico-prontuarios')?.addEventListener('shown.bs.tab', renderizarTabelaProntuarios);
    document.getElementById('tab-pacientes-cadastrados')?.addEventListener('shown.bs.tab', renderizarTabelaPacientes);
    document.getElementById('tab-consultas-agendadas')?.addEventListener('shown.bs.tab', renderizarTabelaConsultas);
    document.getElementById('tab-consultas-concluidas')?.addEventListener('shown.bs.tab', renderizarTabelaConsultasConcluidas);
    
    // Atualiza os dropdowns ao abrir as abas "Agendar Nova Consulta" e "Novo Prontuário"
    document.getElementById('tab-novo-prontuario')?.addEventListener('shown.bs.tab', atualizarDropdownPacientes);
    document.getElementById('tab-nova-consulta')?.addEventListener('shown.bs.tab', async () => {
        await atualizarDropdownPacientes();
        await atualizarDropdownProfissionais();
    });

    // Atualiza as tabelas exclusivas e as estatísticas ao abrir "Meu Perfil"
    document.getElementById('tab-perfil-aba')?.addEventListener('shown.bs.tab', async () => {
        await atualizarPainelAtendimentos();
        await renderizarMinhasConsultas();
        await renderizarMinhasConsultasConcluidas();
    });
});