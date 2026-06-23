// PERFIL

function salvarPerfil(){

    const nome = document.getElementById("nome");
    const email = document.getElementById("email");
    const telefone = document.getElementById("telefone");

    if(nome){
        localStorage.setItem("nome", nome.value);
        localStorage.setItem("email", email.value);
        localStorage.setItem("telefone", telefone.value);

        alert("Perfil salvo com sucesso!");
    }
}

function carregarPerfil(){

    const nome = document.getElementById("nome");

    if(nome){

        document.getElementById("nome").value =
        localStorage.getItem("nome") || "";

        document.getElementById("email").value =
        localStorage.getItem("email") || "";

        document.getElementById("telefone").value =
        localStorage.getItem("telefone") || "";
    }
}

// PRONTUÁRIO

function salvarProntuario(){

    const paciente =
    document.getElementById("paciente");

    const diagnostico =
    document.getElementById("diagnostico");

    if(!paciente || !diagnostico){
        return;
    }

    if(paciente.value === ""){
        alert("Digite o nome do paciente");
        return;
    }

    const historico =
    document.getElementById("historico");

    if(historico){

        historico.innerHTML += `
        <tr>
            <td>${paciente.value}</td>
            <td>${diagnostico.value}</td>
        </tr>
        `;

        alert("Prontuário salvo com sucesso!");

        paciente.value = "";
        diagnostico.value = "";
    }
}

window.onload = function(){
    carregarPerfil();
};