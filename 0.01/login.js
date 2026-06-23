// ====================================================================
// login.js - AUTENTICAÇÃO DO SISTEMA CLÍNICO (GATILHO DIRETO)
// ====================================================================

function efetuarLogin() {
    const cpfInput = document.getElementById('cpf');
    const senhaInput = document.getElementById('password');
    const mensagemLogin = document.getElementById('login-message');

    // Validação de segurança caso algum elemento mude de ID acidentalmente
    if (!cpfInput || !senhaInput || !mensagemLogin) {
        alert("Erro crítico no sistema: Elementos de login não foram localizados.");
        return;
    }

    // Limpa mensagens anteriores
    mensagemLogin.textContent = '';
    mensagemLogin.className = 'form-message mt-3'; 

    const cpf = cpfInput.value.trim();
    const senha = senhaInput.value.trim();
    const erros = [];

    // Validação inicial dos campos vazios
    if (cpf === '') {
        erros.push('O campo CPF é obrigatório.');
    } else {
        const cpfNumeros = cpf.replace(/\D/g, '');
        if (cpfNumeros.length !== 11) {
            erros.push('O CPF deve conter exatamente 11 dígitos numéricos.');
        }
    }
    
    if (senha === '') {
        erros.push('O campo Senha é obrigatório.');
    }

    // Se houver erros de preenchimento, exibe no ecrã e interrompe a execução
    if (erros.length > 0) {
        mensagemLogin.innerHTML = erros.join('<br>');
        mensagemLogin.classList.add('text-danger');
        return;
    }

    const cpfApenasNumeros = cpf.replace(/\D/g, '');
    const usuarioGuardadoString = localStorage.getItem(cpfApenasNumeros);

    // Procura o utilizador cadastrado no LocalStorage
    if (!usuarioGuardadoString) {
        mensagemLogin.textContent = 'Profissional não encontrado. Verifique o CPF ou realize o cadastro.';
        mensagemLogin.classList.add('text-danger');
        return;
    }

    try {
        const usuario = JSON.parse(usuarioGuardadoString);
        
        // Validação da senha informada
        if (usuario.senha !== senha) {
            mensagemLogin.textContent = 'Senha incorreta. Tente novamente.';
            mensagemLogin.classList.add('text-danger');
            return;
        }

        // --- SUCESSO: Guarda credencial ativa e redireciona ---
        localStorage.setItem('loggedInUserCPF', cpfApenasNumeros);
        mensagemLogin.textContent = 'Autenticação bem-sucedida! Abrindo prontuários...';
        mensagemLogin.classList.add('text-success');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 600);

    } catch (error) {
        mensagemLogin.textContent = 'Erro ao processar as credenciais salvas.';
        mensagemLogin.classList.add('text-danger');
        console.error(error);
    }
}

// Executado automaticamente ao abrir a página para otimizar os testes locais
document.addEventListener('DOMContentLoaded', () => {
    // Redireciona se a sessão já estiver aberta
    if (typeof DB !== 'undefined' && DB.getUsuarioLogado && DB.getUsuarioLogado()) {
        window.location.replace('dashboard.html');
    }

    // Preenche o campo automaticamente se encontrar o rasto do último cadastro realizado
    const cpfInput = document.getElementById('cpf');
    const ultimoCadastroCPF = localStorage.getItem('lastRegisteredCPF');
    if (ultimoCadastroCPF && cpfInput) {
        cpfInput.value = ultimoCadastroCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
});