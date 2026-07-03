document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registration-form");

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

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            // Captura segura (evita quebra se o campo não existir no HTML de Maquinaria)
            const nomeInput = document.getElementById("name");
            const cpfInput = document.getElementById("cpf");
            const emailInput = document.getElementById("email");
            const phoneInput = document.getElementById("phone");
            const addressInput = document.getElementById("address");
            const passwordInput = document.getElementById("password");
            const confirmPasswordInput = document.getElementById("confirm-password");
            const operatedInput = document.getElementById("operated");

            const nome = nomeInput ? nomeInput.value.trim() : "";
            let cpf = cpfInput ? cpfInput.value.trim().replace(/\D/g, '') : "";
            const email = emailInput ? emailInput.value.trim() : "";
            const telefone = phoneInput ? phoneInput.value.trim() : "";
            const endereco = addressInput ? addressInput.value.trim() : "";
            const senha = passwordInput ? passwordInput.value.trim() : "";
            const confirmaSenha = confirmPasswordInput ? confirmPasswordInput.value.trim() : "";
            const tipo = operatedInput ? operatedInput.value : "nao";

            let erros = [];
            if (!validaCPF(cpf)) erros.push('CPF inválido.');
            if (senha.length < 6) erros.push('A senha deve ter pelo menos 6 caracteres.');
            if (senha !== confirmaSenha) erros.push('As senhas não coincidem.');

            if (erros.length > 0) {
                alert(erros.join('\n'));
                return;
            }

            const userData = {
                nome,
                cpf,
                email,
                telefones: telefone ? [telefone] : [], 
                enderecos: endereco ? [endereco] : [],
                senha,
                tipo
            };

            const fileInput = document.getElementById("photo");

            const finalizarCadastro = async (dadosParaSalvar) => {
                try {
                    const response = await fetch('/api/usuarios', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dadosParaSalvar)
                    });

                    const resultado = await response.json();

                    if (response.ok) {
                        localStorage.setItem('lastRegisteredCPF', cpf);
                        alert('Cadastro realizado com sucesso via servidor Python! Redirecionando...');
                        window.location.href = 'login.html';
                    } else {
                        alert(resultado.msg || 'Erro ao realizar o cadastro no servidor.');
                    }
                } catch (error) {
                    console.error("Erro na API:", error);
                    alert('Erro de comunicação. Garanta que o Flask (app.py) esteja em execução.');
                }
            };

            if (fileInput && fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    userData.foto = e.target.result; 
                    finalizarCadastro(userData);
                };
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                finalizarCadastro(userData);
            }
        });
    }
});