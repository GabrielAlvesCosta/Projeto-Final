(function() {
    const usuarioLogado = localStorage.getItem('loggedInUserCPF');
    if (!usuarioLogado) window.location.replace('login.html');
})();

function previewFoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { document.getElementById('perfilFoto').src = e.target.result; }
        reader.readAsDataURL(input.files[0]);
    }
}

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
    if (!cpfLogado) return alert("Erro de sessão.");

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
    alert("Dados atualizados com sucesso!");
}

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
        if (!res.ok) return;
        const usuarios = await res.json();
        const optionsHTML = '<option value="">Selecione o Médico / Especialista...</option>' + 
            usuarios.map(u => {
                const nome = u.nome || u.username || 'Profissional Desconhecido';
                return `<option value="${nome}">${nome}</option>`;
            }).join('');
        selectProfissional.innerHTML = optionsHTML;
    } catch(e){}
}

async function cadastrarPaciente(event) {
    event.preventDefault();
    const radioGenero = document.querySelector('input[name="pacienteGenero"]:checked');
    const novoPaciente = {
        nome: document.getElementById('pacienteNome').value,
        dataNasc: document.getElementById('pacienteDataNasc').value,
        genero: radioGenero ? radioGenero.value : "Não informado",
        idadeAnos: document.getElementById('pacienteIdadeAnos').value,
        idadeMeses: document.getElementById('pacienteIdadeMeses').value,
        idadeDias: document.getElementById('pacienteIdadeDias').value,
        documento: document.getElementById('pacienteDocumento').value,
        cartao: document.getElementById('pacienteCartao').value,
        contato: document.getElementById('pacienteContato').value // ADICIONADO AQUI
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
            bootstrap.Tab.getOrCreateInstance(document.getElementById('tab-pacientes-cadastrados')).show();
        }
    } catch(e) {}
}

async function renderizarTabelaPacientes() {
    const tabela = document.getElementById('tabelaPacientes');
    if (!tabela) return;
    try {
        const res = await fetch('/api/pacientes');
        if (!res.ok) return;
        const pacientes = await res.json();
        const termoBusca = document.getElementById('buscaPacienteLista')?.value.toLowerCase().trim() || '';
        tabela.innerHTML = '';
        const filtrados = pacientes.filter(p => (p.nome || '').toLowerCase().includes(termoBusca));

        if (filtrados.length === 0) {
            tabela.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhum paciente localizado.</td></tr>`;
            return;
        }
        filtrados.forEach(p => {
            // MOSTRANDO O CONTATO AQUI
            tabela.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><strong class="text-dark">${p.nome}</strong></td>
                    <td>${formatarDataBR(p.dataNasc)} / <span class="text-muted">${p.genero || 'N/I'}</span></td>
                    <td>${p.documento || 'Não informado'}</td>
                    <td>${p.cartao}</td>
                    <td>${p.contato || 'N/I'}</td>
                    <td class="text-end text-nowrap">
                        <button class="btn btn-sm btn-outline-primary" onclick="abrirEdicaoPaciente(${p.id})"><i class="bi bi-pencil-square"></i> Editar</button>
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
        if (!paciente) return;
        document.getElementById('editPacienteId').value = paciente.id;
        document.getElementById('editPacienteNome').value = paciente.nome;
        document.getElementById('editPacienteDataNasc').value = paciente.dataNasc;
        document.getElementById('editPacienteGenero').value = paciente.genero || 'Masculino';
        document.getElementById('editPacienteIdadeAnos').value = paciente.idadeAnos || '';
        document.getElementById('editPacienteIdadeMeses').value = paciente.idadeMeses || '';
        document.getElementById('editPacienteIdadeDias').value = paciente.idadeDias || '';
        document.getElementById('editPacienteDocumento').value = paciente.documento || '';
        document.getElementById('editPacienteCartao').value = paciente.cartao || '';
        document.getElementById('editPacienteContato').value = paciente.contato || ''; // EXIBINDO CONTATO NO MODAL
        
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditarPaciente')).show();
    } catch(e){}
}

async function salvarEdicaoPaciente() {
    const pacienteAtualizado = {
        id: parseInt(document.getElementById('editPacienteId').value),
        nome: document.getElementById('editPacienteNome').value,
        dataNasc: document.getElementById('editPacienteDataNasc').value,
        genero: document.getElementById('editPacienteGenero').value,
        idadeAnos: document.getElementById('editPacienteIdadeAnos').value,
        idadeMeses: document.getElementById('editPacienteIdadeMeses').value,
        idadeDias: document.getElementById('editPacienteIdadeDias').value,
        documento: document.getElementById('editPacienteDocumento').value,
        cartao: document.getElementById('editPacienteCartao').value,
        contato: document.getElementById('editPacienteContato').value // SALVANDO EDIÇÃO DE CONTATO
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
        }
    } catch(e){}
}

async function agendarConsulta(event) {
    event.preventDefault();
    const pacienteId = parseInt(document.getElementById('consultaPacienteSelect').value);
    const dataInput = document.getElementById('consultaData').value;
    const horarioInput = document.getElementById('consultaHorario').value;
    const profissionalInput = document.getElementById('consultaProfissional').value;
    
    if (!pacienteId || !dataInput || !horarioInput || !profissionalInput) return alert("Preencha todos os campos.");

    const dataHoraConsulta = new Date(`${dataInput}T${horarioInput}`);
    if (dataHoraConsulta < new Date()) return alert("Não é possível agendar em um horário no passado!");

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
        if (response.ok) {
            alert("Consulta agendada!");
            document.getElementById('formNovaConsulta').reset();
            await renderizarTabelaConsultas();
            await renderizarTabelaConsultasConcluidas();
            await renderizarMinhasConsultas();
            await atualizarPainelAtendimentos();
            bootstrap.Tab.getOrCreateInstance(document.getElementById('tab-consultas-agendadas')).show();
        } else {
            const err = await response.json();
            alert(err.error || "Erro ao agendar consulta.");
        }
    } catch (e) {}
}

function obterClasseStatusConsulta(status) {
    if (status === 'Confirmado') return 'bg-success text-white';
    if (status === 'Cancelado') return 'bg-danger text-white';
    if (status === 'Atendido') return 'bg-info text-dark';
    return 'bg-primary text-white';
}

async function renderizarTabelaConsultas() {
    const tabela = document.getElementById('tabelaConsultas');
    if (!tabela) return;
    try {
        const res = await fetch('/api/consultas?status=ativas');
        if (!res.ok) return;
        const consultas = await res.json();
        const termoBusca = document.getElementById('buscaConsulta')?.value.toLowerCase().trim() || '';
        tabela.innerHTML = '';
        
        const filtradas = consultas.filter(c => (c.nomePaciente || '').toLowerCase().includes(termoBusca) || (c.profissional || '').toLowerCase().includes(termoBusca));

        if (filtradas.length === 0) {
            tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Nenhuma consulta ativa.</td></tr>`;
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
                            <button class="btn btn-outline-success" onclick="alterarStatusConsulta(${c.id}, 'Confirmado')"><i class="bi bi-check-lg"></i></button>
                            <button class="btn btn-outline-info" onclick="alterarStatusConsulta(${c.id}, 'Atendido')"><i class="bi bi-person-check"></i></button>
                            <button class="btn btn-outline-danger" onclick="alterarStatusConsulta(${c.id}, 'Cancelado')"><i class="bi bi-x-lg"></i></button>
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
        const termoBusca = document.getElementById('buscaConsultaConcluida')?.value.toLowerCase().trim() || '';
        tabela.innerHTML = '';

        const filtradas = consultas.filter(c => (c.nomePaciente || '').toLowerCase().includes(termoBusca) || (c.profissional || '').toLowerCase().includes(termoBusca));

        if (filtradas.length === 0) {
            tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Sem histórico.</td></tr>`;
            return;
        }

        filtradas.forEach(c => {
            tabela.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><strong class="text-dark">${c.nomePaciente}</strong></td>
                    <td><i class="bi bi-calendar-check text-secondary"></i> ${formatarDataBR(c.data)} às <strong>${c.horario}</strong></td>
                    <td><span class="badge bg-secondary">${c.profissional}</span></td>
                    <td><span class="badge ${obterClasseStatusConsulta(c.status)}">${c.status}</span></td>
                    <td class="text-end"><button class="btn btn-sm btn-outline-secondary" onclick="alterarStatusConsulta(${c.id}, 'Agendado')"><i class="bi bi-arrow-counterclockwise"></i> Reativar</button></td>
                </tr>
            `);
        });
    } catch(e){}
}

async function renderizarMinhasConsultas() {
    const tabela = document.getElementById('tabelaMinhasConsultas');
    const meuNome = obterNomeProfissionalLogado();
    if (!tabela || !meuNome) return;
    try {
        const res = await fetch('/api/consultas?status=ativas');
        const todasAtivas = await res.json();
        const minhasAtivas = todasAtivas.filter(c => c.profissional === meuNome);
        tabela.innerHTML = '';

        if (minhasAtivas.length === 0) {
            tabela.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Sem pendências.</td></tr>`;
            return;
        }
        minhasAtivas.forEach(c => {
            tabela.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><strong class="text-dark">${c.nomePaciente}</strong></td>
                    <td>${formatarDataBR(c.data)}<br><strong>${c.horario}</strong></td>
                    <td><span class="badge ${obterClasseStatusConsulta(c.status)}">${c.status}</span></td>
                    <td class="text-end">
                        <div class="btn-group btn-group-sm d-flex flex-column gap-1">
                            <button class="btn btn-outline-success" onclick="alterarStatusConsulta(${c.id}, 'Confirmado')"><i class="bi bi-check-lg"></i></button>
                            <button class="btn btn-outline-info" onclick="alterarStatusConsulta(${c.id}, 'Atendido')"><i class="bi bi-person-check"></i></button>
                            <button class="btn btn-outline-danger" onclick="alterarStatusConsulta(${c.id}, 'Cancelado')"><i class="bi bi-x-lg"></i></button>
                        </div>
                    </td>
                </tr>
            `);
        });
    } catch(e){}
}

async function renderizarMinhasConsultasConcluidas() {
    const tabela = document.getElementById('tabelaMinhasConsultasConcluidas');
    const meuNome = obterNomeProfissionalLogado();
    if (!tabela || !meuNome) return;
    try {
        const res = await fetch('/api/consultas?status=concluidas');
        const concluidas = await res.json();
        const minhasConcluidas = concluidas.filter(c => c.profissional === meuNome);
        tabela.innerHTML = '';
        if (minhasConcluidas.length === 0) return tabela.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Sem histórico concluído.</td></tr>`;
        
        minhasConcluidas.forEach(c => {
            tabela.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><strong class="text-dark">${c.nomePaciente}</strong></td>
                    <td>${formatarDataBR(c.data)}<br><strong>${c.horario}</strong></td>
                    <td><span class="badge ${obterClasseStatusConsulta(c.status)}">${c.status}</span></td>
                    <td class="text-end"><button class="btn btn-sm btn-outline-secondary" onclick="alterarStatusConsulta(${c.id}, 'Agendado')"><i class="bi bi-arrow-counterclockwise"></i></button></td>
                </tr>
            `);
        });
    } catch(e){}
}

async function atualizarPainelAtendimentos() {
    try {
        const cpfLogado = localStorage.getItem('loggedInUserCPF');
        const nomeProfissional = obterNomeProfissionalLogado();
        
        const [resAtivas, resConcluidas, resProntuarios] = await Promise.all([
            fetch('/api/consultas?status=ativas'),
            fetch('/api/consultas?status=concluidas'),
            fetch('/api/prontuarios')
        ]);
        
        const ativas = await resAtivas.json();
        const concluidas = await resConcluidas.json();
        const prontuarios = await resProntuarios.json();

        if (document.getElementById('count-consultas-ativas')) document.getElementById('count-consultas-ativas').textContent = ativas.filter(c => c.profissional === nomeProfissional).length;
        if (document.getElementById('count-consultas-concluidas')) document.getElementById('count-consultas-concluidas').textContent = concluidas.filter(c => c.profissional === nomeProfissional).length;
        if (document.getElementById('count-prontuarios')) document.getElementById('count-prontuarios').textContent = prontuarios.filter(p => p.medicoCPF === cpfLogado).length;
    } catch(e){}
}

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

async function publicarProntuario(event) {
    event.preventDefault();

    const pacienteId = parseInt(document.getElementById('prontuarioPacienteSelect').value);
    if (!pacienteId) return alert("Selecione o paciente.");

    const cpfLogado = localStorage.getItem('loggedInUserCPF');
    let registroAutenticado = cpfLogado;
    let carimboAutenticado = '';
    const avatarPadrao = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

    if (cpfLogado) {
        const dados = localStorage.getItem(cpfLogado);
        if (dados) {
            try {
                const user = JSON.parse(dados);
                registroAutenticado = user.cpf || cpfLogado;
                if (user.foto && user.foto !== avatarPadrao && user.foto !== "") {
                    carimboAutenticado = user.foto;
                }
            } catch(e) {}
        }
    }

    if (!carimboAutenticado) {
        alert("Aviso: Como você não possui uma foto de perfil ou carimbo salvo, a assinatura visual não sairá no registro. O seu CRM/CPF foi anexado para auditoria.");
    }

    try {
        const pRes = await fetch('/api/pacientes');
        const pacientes = await pRes.json();
        const paciente = pacientes.find(p => p.id === pacienteId);

        const novoProntuario = {
            pacienteId: paciente.id,
            nomePaciente: paciente.nome,
            dataNascimento: paciente.dataNasc,
            genero: paciente.genero,
            idadeAnos: paciente.idadeAnos,
            idadeMeses: paciente.idadeMeses,
            idadeDias: paciente.idadeDias,
            documento: paciente.documento,
            convenioCartao: paciente.cartao,
            contatoPaciente: paciente.telefone || paciente.celular || paciente.contato || 'Não cadastrado',
            acompanhante: document.getElementById('prontuarioAcompanhante').value,
            especialidade: document.getElementById('prontuarioEspecialidade').value,
            tipoAtendimento: document.getElementById('prontuarioTipoAtendimento').value,
            prioridade: document.getElementById('prontuarioPrioridade').value,
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
            medicoCPF: cpfLogado || 'anonimo',
            registroProfissional: registroAutenticado,
            carimboAssinatura: carimboAutenticado
        };

        const res = await fetch('/api/prontuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoProntuario)
        });

        if (res.ok) {
            alert("Prontuário clínico aberto e autenticado digitalmente!");
            document.getElementById('formNovoProntuario').reset();
            await renderizarTabelaProntuarios();
            await atualizarPainelAtendimentos();
            bootstrap.Tab.getOrCreateInstance(document.getElementById('tab-historico-prontuarios')).show();
        }
    } catch(e){}
}

async function renderizarTabelaProntuarios() {
    const tabela = document.getElementById('tabelaProntuarios');
    if (!tabela) return;
    try {
        const res = await fetch('/api/prontuarios');
        const prontuarios = await res.json();
        const termoBusca = document.getElementById('buscaPaciente')?.value.toLowerCase().trim() || '';
        tabela.innerHTML = '';
        
        const filtrados = prontuarios.filter(p => (p.nomePaciente || '').toLowerCase().includes(termoBusca));
        if (filtrados.length === 0) return tabela.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Nenhum prontuário.</td></tr>`;

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
                                <div class="text-muted small">${p.tipoAtendimento} > ${p.convenioCartao || 'S/N'}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-secondary mb-1">${p.especialidade}</span><br>
                        <span class="badge ${cl}">${p.prioridade}</span>
                    </td>
                    <td class="text-dark small">
                        <strong>Nasc:</strong> ${formatarDataBR(p.dataNascimento)}<br>
                        <span class="text-muted small">Gênero: ${p.genero || 'N/I'}</span><br>
                        <!-- LINHA NOVA: O Contato agora aparece direto na tabela -->
                        <span class="text-primary fw-medium">Contato: ${p.contatoPaciente || 'N/I'}</span>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-info" onclick="abrirEdicaoProntuario(${p.id})"><i class="bi bi-eye"></i> Ver</button>
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
        if (!prontuario) return;

        document.getElementById('editProntuarioNome').textContent = prontuario.nomePaciente || 'N/I';
        document.getElementById('editProntuarioNasc').textContent = formatarDataBR(prontuario.dataNascimento);
        document.getElementById('editProntuarioGenero').textContent = prontuario.genero || 'N/I';
        document.getElementById('editProntuarioCartao').textContent = prontuario.convenioCartao || 'N/I';

        document.getElementById('editProntuarioContato').textContent = prontuario.contatoPaciente || 'Não informado';

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
        
        document.getElementById('editProntuarioRegistro').textContent = prontuario.registroProfissional || 'Autenticado (Sistema)';

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

function formatarDataBR(d) {
    if (!d) return 'N/I';
    const parts = d.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
}

document.addEventListener('DOMContentLoaded', async () => {
    carregarDadosPerfil();
    await atualizarDropdownPacientes();
    await atualizarDropdownProfissionais();
    await renderizarTabelaPacientes();
    await renderizarTabelaConsultas();
    await renderizarTabelaConsultasConcluidas();
    await renderizarTabelaProntuarios();
    await renderizarMinhasConsultas();
    await renderizarMinhasConsultasConcluidas();
    await atualizarPainelAtendimentos();

    const dt = document.getElementById('consultaData');
    if (dt) { const h = new Date(); dt.min = `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`; }

    document.getElementById('buscaPaciente')?.addEventListener('input', renderizarTabelaProntuarios);
    document.getElementById('buscaPacienteLista')?.addEventListener('input', renderizarTabelaPacientes);
    document.getElementById('buscaConsulta')?.addEventListener('input', renderizarTabelaConsultas);
    document.getElementById('buscaConsultaConcluida')?.addEventListener('input', renderizarTabelaConsultasConcluidas);

    document.getElementById('tab-historico-prontuarios')?.addEventListener('shown.bs.tab', renderizarTabelaProntuarios);
    document.getElementById('tab-pacientes-cadastrados')?.addEventListener('shown.bs.tab', renderizarTabelaPacientes);
    document.getElementById('tab-consultas-agendadas')?.addEventListener('shown.bs.tab', renderizarTabelaConsultas);
    document.getElementById('tab-consultas-concluidas')?.addEventListener('shown.bs.tab', renderizarTabelaConsultasConcluidas);
    
    document.getElementById('tab-novo-prontuario')?.addEventListener('shown.bs.tab', atualizarDropdownPacientes);
    document.getElementById('tab-nova-consulta')?.addEventListener('shown.bs.tab', async () => { await atualizarDropdownPacientes(); await atualizarDropdownProfissionais(); });
    document.getElementById('tab-perfil-aba')?.addEventListener('shown.bs.tab', async () => { await atualizarPainelAtendimentos(); await renderizarMinhasConsultas(); await renderizarMinhasConsultasConcluidas(); });
});