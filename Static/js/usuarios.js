const lista = document.getElementById("listaUsuarios");
const modal = document.getElementById("modalEditar");
const formEditar = document.getElementById("formEditar");
const fecharBtn = document.querySelector(".fechar");

function carregarUsuarios() {
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    if (usuarios.length === 0 && Array.isArray(window.initialUsuarios) && window.initialUsuarios.length > 0) {
        usuarios = window.initialUsuarios;
        localStorage.setItem("usuarios", JSON.stringify(usuarios));
    }

    lista.innerHTML = "";

    if (usuarios.length === 0) {
        lista.innerHTML = `
            <tr>
                <td colspan="6">Nenhum usuário cadastrado.</td>
            </tr>
        `;
        return;
    }

    usuarios.forEach((usuario) => {
        const linha = document.createElement("tr");

        linha.innerHTML = `
            <td>${usuario.id}</td>
            <td>${usuario.nome}</td>
            <td>${usuario.email}</td>
            <td>${usuario.cargo}</td>
            <td>${usuario.admin === "sim" ? "Sim" : "Não"}</td>
            <td>
                <button class="btn-editar" onclick="abrirModal(${usuario.id})">
                    Editar
                </button>
                <button class="btn-excluir" onclick="excluirUsuario(${usuario.id})">
                    Excluir
                </button>
            </td>
        `;

        lista.appendChild(linha);
    });
}

function abrirModal(id) {
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const usuario = usuarios.find((u) => u.id === id);

    if (usuario) {
        document.getElementById("editId").value = usuario.id;
        document.getElementById("editNome").value = usuario.nome;
        document.getElementById("editEmail").value = usuario.email;
        document.getElementById("editSenha").value = "";
        document.getElementById("editCargo").value = usuario.cargo;
        document.getElementById("editCrmCorem").value = usuario.crm_corem || "";
        
        const adminValue = usuario.admin === "sim" || usuario.admin === true ? "sim" : "nao";
        document.querySelectorAll("input[name='editAdmin']").forEach((radio) => {
            radio.checked = radio.value === adminValue;
        });
        
        modal.style.display = "block";
    }
}

function fecharModal() {
    modal.style.display = "none";
}

function excluirUsuario(id) {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
        let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

        usuarios = usuarios.filter(
            (usuario) => usuario.id !== id
        );

        localStorage.setItem(
            "usuarios",
            JSON.stringify(usuarios)
        );

        carregarUsuarios();
    }
}

formEditar.addEventListener("submit", function (e) {
    e.preventDefault();

    const id = parseInt(document.getElementById("editId").value);
    const nome = document.getElementById("editNome").value.trim();
    const email = document.getElementById("editEmail").value.trim();
    const cargo = document.getElementById("editCargo").value.trim();
    const crm_corem = document.getElementById("editCrmCorem").value.trim();
    const admin = document.querySelector("input[name='editAdmin']:checked").value;

    if (cargo.length > 30) {
        alert("O cargo deve ter no máximo 30 caracteres.");
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    usuarios = usuarios.map((usuario) => {
        if (usuario.id === id) {
            return { id, nome, email, cargo, crm_corem, admin };
        }
        return usuario;
    });

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    fecharModal();
    carregarUsuarios();
});

fecharBtn.addEventListener("click", fecharModal);

window.addEventListener("click", function (e) {
    if (e.target === modal) {
        fecharModal();
    }
});

carregarUsuarios();