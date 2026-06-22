document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registration-form");

    function validaCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) {
            return false;
        }
        let soma = 0;
        let resto;
        for (let i = 1; i <= 9; i++) {
            soma += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
        }
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10), 10)) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) {
            soma += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
        }
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11), 10)) return false;
        return true;
    }

    function validaSenha(senha) {
        return senha.length >= 8 &&
            /[a-z]/.test(senha) &&
            /[A-Z]/.test(senha) &&
            /[0-9]/.test(senha) &&
            /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(senha);
    }

    function validaEmail(email) {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    }

    function validaTelefone(telefone) {
        const digitos = telefone.replace(/\D/g, '');
        return digitos.length === 11;
    }

    function validaNomeCompleto(nome) {
        const conectores = ['da', 'de', 'do', 'dos', 'das', 'e'];
        const partes = nome.trim().split(' ').filter(Boolean);
        if (partes.length < 2) return false;
        return partes.every(palavra => {
            if (conectores.includes(palavra.toLowerCase())) {
                return true;
            }
            return /^[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+$/.test(palavra);
        });
    }

    function validaEndereco(endereco) {
        const enderecoTrim = endereco.trim();
        return enderecoTrim.length >= 8 && /\d/.test(enderecoTrim);
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const nome = document.getElementById("name").value.trim();
        const cpf = document.getElementById("cpf").value.replace(/\D/g, "");
        const email = document.getElementById("email").value.trim();
        const telefone = document.getElementById("telefone").value.trim();
        const endereco = document.getElementById("endereco").value.trim();
        const senha = document.getElementById("password").value.trim();
        const confirmarSenha = document.getElementById("confirm-password").value.trim();

        const erros = [];
        if (nome === '' || !validaNomeCompleto(nome)) {
            erros.push('Informe seu nome completo corretamente (nome e sobrenome com inicial maiúscula).');
        }
        if (!validaCPF(cpf)) {
            erros.push('CPF inválido. Digite 11 números válidos.');
        } else if (localStorage.getItem(cpf)) {
            erros.push('Este CPF já está cadastrado.');
        }
        if (!validaEmail(email)) {
            erros.push('E-mail inválido.');
        }
        if (!validaTelefone(telefone)) {
            erros.push('Telefone inválido. Use o DDD e o número com 11 dígitos.');
        }
        if (!validaEndereco(endereco)) {
            erros.push('Endereço inválido. Informe rua/avenida e número.');
        }
        if (!validaSenha(senha)) {
            erros.push('Senha fraca. Use mínimo 8 caracteres, incluindo maiúscula, minúscula, número e símbolo.');
        }
        if (senha !== confirmarSenha) {
            erros.push('As senhas não coincidem.');
        }

        if (erros.length > 0) {
            alert(erros.join('\n'));
            return;
        }

        const userData = {
            nome,
            cpf,
            email,
            // Convertendo telefone e endereco para arrays, para bater com a lógica do seu Painel!
            telefones: [telefone], 
            enderecos: [endereco],
            senha,
            tipo: document.getElementById("operated").value || 'nao' // Pega o select de operador
        };

        const fileInput = document.getElementById("photo");

        // Função para finalizar o cadastro
        const finalizarCadastro = (dadosParaSalvar) => {
            localStorage.setItem(cpf, JSON.stringify(dadosParaSalvar));
            localStorage.setItem('lastRegisteredCPF', cpf);
            alert('Cadastro realizado com sucesso! Agora faça o login.');
            window.location.href = 'login.html';
        };

        // Verifica se o usuário anexou uma foto
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                userData.foto = e.target.result; // Salva a imagem em base64 no userData
                finalizarCadastro(userData);
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            // Se não enviou foto, salva sem foto mesmo
            finalizarCadastro(userData);
        }
    });
});