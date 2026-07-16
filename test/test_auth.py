import pytest

from app import app
import database.fake_db as fake_db_module


@pytest.fixture
def client(tmp_path, monkeypatch):
    temp_db_path = str(tmp_path / "test.db")

    class TempDatabase(fake_db_module.Database):
        def __init__(self, db_path=None):
            self.db_path = str(db_path or temp_db_path)

    import app as app_module
    import models.usuario as usuario_module

    monkeypatch.setattr(fake_db_module, "Database", TempDatabase)
    monkeypatch.setattr(usuario_module, "Database", TempDatabase)
    monkeypatch.setattr(app_module, "Database", TempDatabase)

    app_module.fake_db = TempDatabase()
    app_module.fake_db.criar_tabela()

    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_home_redireciona_para_cadastro_sem_sessao(client):
    response = client.get("/", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/cadastro")


def test_cadastro_com_dados_validos_cria_usuario(client):
    response = client.post(
        "/cadastro",
        data={
            "nome": "Maria",
            "email": "maria@email.com",
            "cargo": "Enfermeira",
            "crm_coren": "CR123",
            "senha": "123456",
            "admin": "nao",
        },
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/login")

    db = fake_db_module.Database()
    with db.conectar() as conexao:
        usuario = conexao.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0]

    assert usuario == 1


def test_cadastro_armazenando_senha_com_hash(client):
    client.post(
        "/cadastro",
        data={
            "nome": "Maria",
            "email": "maria@email.com",
            "cargo": "Enfermeira",
            "crm_coren": "CR123",
            "senha": "123456",
            "admin": "nao",
        },
        follow_redirects=False,
    )

    db = fake_db_module.Database()
    with db.conectar() as conexao:
        senha_armazenada = conexao.execute(
            "SELECT senha FROM usuarios WHERE email = ?",
            ("maria@email.com",),
        ).fetchone()[0]

    assert senha_armazenada != "123456"
    assert "$" in senha_armazenada


def test_crm_coren_armazenado_com_hash(client):
    client.post(
        "/cadastro",
        data={
            "nome": "Paula",
            "email": "paula@email.com",
            "cargo": "Técnica",
            "crm_coren": "COREM999",
            "senha": "senha456",
            "admin": "nao",
        },
        follow_redirects=False,
    )

    db = fake_db_module.Database()
    with db.conectar() as conexao:
        crm_armazenado = conexao.execute(
            "SELECT crm_coren FROM usuarios WHERE email = ?",
            ("paula@email.com",),
        ).fetchone()[0]

    assert crm_armazenado != "COREM999"
    assert "$" in crm_armazenado


def test_login_com_crm_redireciona_para_teste(client):
    client.post(
        "/cadastro",
        data={
            "nome": "Lucas",
            "email": "lucas@email.com",
            "cargo": "Médico",
            "crm_coren": "CRM1234",
            "senha": "senha789",
            "admin": "nao",
        },
        follow_redirects=False,
    )

    response = client.post(
        "/login",
        data={"email": "CRM1234", "senha": "senha789"},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/teste")


def test_cadastro_com_campos_vazios_exibe_erro(client):
    response = client.post(
        "/cadastro",
        data={
            "nome": "",
            "email": "",
            "cargo": "",
            "crm_coren": "",
            "senha": "",
        },
        follow_redirects=False,
    )

    assert response.status_code == 200
    assert b"Preencha todos os campos" in response.data


def test_login_com_dados_validos_redireciona_para_teste(client):
    client.post(
        "/cadastro",
        data={
            "nome": "Joao",
            "email": "joao@email.com",
            "cargo": "Medico",
            "crm_coren": "CRM456",
            "senha": "senha123",
            "admin": "nao",
        },
        follow_redirects=False,
    )

    response = client.post(
        "/login",
        data={"email": "joao@email.com", "senha": "senha123"},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/teste")


def test_login_admin_redireciona_para_usuarios(client):
    client.post(
        "/cadastro",
        data={
            "nome": "Admin",
            "email": "admin@email.com",
            "cargo": "Coordenador",
            "crm_coren": "COREM789",
            "senha": "admin123",
            "admin": "sim",
        },
        follow_redirects=False,
    )

    response = client.post(
        "/login",
        data={"email": "admin@email.com", "senha": "admin123"},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/usuarios")


def test_acesso_sem_login_redireciona_para_login(client):
    response = client.get("/usuarios", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/login")
