const lista = document.getElementById("listaUsuarios");

function carregarUsuarios() {
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    lista.innerHTML = "";

    usuarios.forEach((usuario) => {
        const linha = document.createElement("tr");

        linha.innerHTML = `
            <td>${usuario.id}</td>
            <td>${usuario.nome}</td>
            <td>${usuario.email}</td>
            <td>${usuario.cargo}</td>
            <td>
                <button onclick="excluirUsuario(${usuario.id})">
                    Excluir
                </button>
            </td>
        `;

        lista.appendChild(linha);
    });
}

function excluirUsuario(id) {
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

carregarUsuarios();