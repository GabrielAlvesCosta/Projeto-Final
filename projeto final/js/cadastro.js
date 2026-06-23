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

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = senhaInput.value;
    const confirmarSenha = confirmarInput.value;
    const cargo = document.getElementById("cargo").value.trim();
    const crm_corem = document.getElementById("crm_corem").value.trim();
    const admin = document.querySelector("input[name='admin']:checked").value;

    if (cargo.length > 30) {
        alert("O cargo deve ter no máximo 30 caracteres.");
        return;
    }

    if (senha.length < 6) {
        senhaErro.classList.add("active");
        senhaInput.classList.add("invalid");
        return;
    }

    if (senha !== confirmarSenha) {
        confirmarErro.classList.add("active");
        confirmarInput.classList.add("invalid");
        return;
    }

    if (!validarSenha()) {
        return;
    }

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    usuarios.push({
        id: Date.now(),
        nome,
        email,
        senha,
        cargo,
        crm_corem,
        admin
    });

    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    alert("Usuário cadastrado com sucesso!");
    form.reset();
});