const form = document.getElementById("cadastroForm");
const senhaInput = document.getElementById("senha");
const confirmarInput = document.getElementById("confirmar_senha");
const senhaErro = document.getElementById("senhaErro");
const confirmarErro = document.getElementById("confirmarErro");

function validarSenha() {
    let valido = true;

    if (senhaInput.value.length > 0 && senhaInput.value.length < 6) {
        senhaErro.classList.add("active");
        senhaInput.classList.add("invalid");
        valido = false;
    } else {
        senhaErro.classList.remove("active");
        senhaInput.classList.remove("invalid");
    }

    if (confirmarInput.value.length > 0 && confirmarInput.value !== senhaInput.value) {
        confirmarErro.classList.add("active");
        confirmarInput.classList.add("invalid");
        valido = false;
    } else {
        confirmarErro.classList.remove("active");
        confirmarInput.classList.remove("invalid");
    }

    return valido;
}

senhaInput.addEventListener("input", validarSenha);
confirmarInput.addEventListener("input", validarSenha);

const togglePasswordButtons = document.querySelectorAll(".toggle-password");
togglePasswordButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
        event.preventDefault();
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;

        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        const icon = button.querySelector("i");
        if (icon) {
            if (isPassword) {
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        }
        button.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
    });
});

form.addEventListener("submit", (e) => {
    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = senhaInput.value;
    const confirmarSenha = confirmarInput.value;
    const cargo = document.getElementById("cargo").value.trim();
    const crm_coren = document.getElementById("crm_coren").value.trim();
    const adminRadio = document.querySelector("input[name='admin']:checked");
    const admin = adminRadio ? adminRadio.value : "nao";

    if (cargo.length > 30) {
        e.preventDefault();
        alert("O cargo deve ter no máximo 30 caracteres.");
        return;
    }

    if (senha.length < 6) {
        e.preventDefault();
        senhaErro.classList.add("active");
        senhaInput.classList.add("invalid");
        return;
    }

    if (senha !== confirmarSenha) {
        e.preventDefault();
        confirmarErro.classList.add("active");
        confirmarInput.classList.add("invalid");
        return;
    }

    if (!validarSenha()) {
        e.preventDefault();
        return;
    }

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    usuarios.push({
        id: Date.now(),
        nome,
        email,
        senha,
        cargo,
        crm_coren,
        admin
    });

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
});