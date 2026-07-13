// ====================================================================
// login.js - AUTENTICAÇÃO INTEGRADA COM O SERVIDOR REST (FLASK)
// ====================================================================

async function efetuarLogin() {
    const cpfInput = document.getElementById('cpf');
    const senhaInput = document.getElementById('password');
    const mensagemLogin = document.getElementById('login-message');

    if (!cpfInput || !senhaInput || !mensagemLogin) {
        alert("Erro estrutural: Elementos da tela de login não foram localizados.");
        return;
    }

    mensagemLogin.textContent = '';
    mensagemLogin.className = 'form-message mt-3'; 

    const cpfRaw = cpfInput.value.trim();
    const senha = senhaInput.value.trim();
    const cpfApenasNumeros = cpfRaw.replace(/\D/g, '');

    if (cpfApenasNumeros.length !== 11 || senha === '') {
        mensagemLogin.textContent = 'Por favor, preencha o CPF (11 dígitos) e a senha corretamente.';
        mensagemLogin.classList.add('text-danger');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf: cpfApenasNumeros, senha: senha })
        });

        const resultado = await response.json();

        if (response.ok && resultado.sucesso) {
            // Salva a sessão ativa exigida pelo db.js e dashboard.js
            localStorage.setItem('loggedInUserCPF', cpfApenasNumeros);
            localStorage.setItem(cpfApenasNumeros, JSON.stringify(resultado.usuario));

            mensagemLogin.textContent = 'Autenticação bem-sucedida! Abrindo o Painel Clínico...';
            mensagemLogin.classList.add('text-success');

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 600);
        } else {
            mensagemLogin.textContent = resultado.msg || 'Credenciais inválidas.';
            mensagemLogin.classList.add('text-danger');
        }

    } catch (error) {
        mensagemLogin.textContent = 'Erro ao se conectar ao servidor central. O arquivo app.py está rodando?';
        mensagemLogin.classList.add('text-danger');
        console.error("Erro na requisição de login:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogado = localStorage.getItem('loggedInUserCPF');
    if (usuarioLogado) {
        window.location.replace('dashboard.html');
    }

    const cpfInput = document.getElementById('cpf');
    const ultimoCadastroCPF = localStorage.getItem('lastRegisteredCPF');
    if (ultimoCadastroCPF && cpfInput) {
        cpfInput.value = ultimoCadastroCPF;
    }
});