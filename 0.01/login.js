// login.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const cpfInput = document.getElementById('cpf');
    const senhaInput = document.getElementById('password');
    const mensagemLogin = document.getElementById('login-message');

    // Se já estiver logado, manda direto pro painel
    if (DB.getUsuarioLogado()) {
        window.location.replace('dashboard.html');
    }

    function validaCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return false;
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10), 10)) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11), 10)) return false;
        return true;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        mensagemLogin.textContent = '';

        const cpf = cpfInput.value.trim();
        const senha = senhaInput.value.trim();
        const erros = [];

        if (cpf === '') erros.push('O campo CPF é obrigatório.');
        else if (!validaCPF(cpf)) erros.push('CPF inválido.');
        
        if (senha === '') erros.push('O campo Senha é obrigatório.');

        if (erros.length > 0) {
            mensagemLogin.innerHTML = erros.join('<br>');
            mensagemLogin.style.color = 'red';
            return;
        }

        const cpfApenasNumeros = cpf.replace(/\D/g, '');
        const usuarioGuardadoString = localStorage.getItem(cpfApenasNumeros);

        if (!usuarioGuardadoString) {
            mensagemLogin.textContent = 'Usuário ou senha inválido.';
            mensagemLogin.style.color = 'red';
            return;
        }

        const usuario = JSON.parse(usuarioGuardadoString);
        if (usuario.senha !== senha) {
            mensagemLogin.textContent = 'Usuário ou senha inválido.';
            mensagemLogin.style.color = 'red';
            return;
        }

        // Sucesso
        localStorage.setItem('loggedInUserCPF', cpfApenasNumeros);
        mensagemLogin.textContent = 'Login bem-sucedido! Redirecionando...';
        mensagemLogin.style.color = 'green';

        setTimeout(() => {
            window.location.replace('dashboard.html');
        }, 800);
    });

    const ultimoCadastroCPF = localStorage.getItem('lastRegisteredCPF');
    if (ultimoCadastroCPF) {
        cpfInput.value = ultimoCadastroCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
});