const configForm = document.getElementById("configForm");

configForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const configuracoes = {
        nomeSistema: document.getElementById("nomeSistema").value,
        emailSuporte: document.getElementById("emailSuporte").value,
        manutencao: document.getElementById("manutencao").checked
    };

    localStorage.setItem(
        "configuracoes",
        JSON.stringify(configuracoes)
    );

    alert("Configurações salvas!");
});

window.addEventListener("load", () => {
    const configuracoes = JSON.parse(
        localStorage.getItem("configuracoes")
    );

    if (!configuracoes) return;

    document.getElementById("nomeSistema").value =
        configuracoes.nomeSistema || "";

    document.getElementById("emailSuporte").value =
        configuracoes.emailSuporte || "";

    document.getElementById("manutencao").checked =
        configuracoes.manutencao || false;
});