from database.fake_db import Database
from werkzeug.security import generate_password_hash, check_password_hash


class Usuario:
    def __init__(self, nome, email, cargo, crm_coren, senha, admin="nao"):
        self.nome = nome
        self.email = email
        self.cargo = cargo
        self.crm_coren = crm_coren
        self.senha = senha
        self.admin = admin

    def salvar(self):
        db = Database()
        hashed_senha = generate_password_hash(self.senha)
        with db.conectar() as conexao:
            conexao.execute(
                """
                INSERT INTO usuarios (nome, email, cargo, crm_coren, senha, admin)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (self.nome, self.email, self.cargo, self.crm_coren, hashed_senha, self.admin),
            )

    @staticmethod
    def buscar_por_email(email):
        db = Database()
        with db.conectar() as conexao:
            cursor = conexao.execute(
                """
                SELECT * FROM usuarios WHERE email = ?
                """,
                (email,),
            )
            return cursor.fetchone()

    @staticmethod
    def buscar_por_crm_coren(crm_coren):
        db = Database()
        with db.conectar() as conexao:
            cursor = conexao.execute(
                """
                SELECT * FROM usuarios WHERE crm_coren = ?
                """,
                (crm_coren,),
            )
            return cursor.fetchone()

    @staticmethod
    def listar_todos():
        db = Database()
        with db.conectar() as conexao:
            cursor = conexao.execute(
                """
                SELECT * FROM usuarios ORDER BY id ASC
                """
            )
            return cursor.fetchall()

    @staticmethod
    def email_existe(email):
        return Usuario.buscar_por_email(email) is not None

    @staticmethod
    def autenticar(login_id, senha):
        db = Database()
        with db.conectar() as conexao:
            cursor = conexao.execute(
                """
                SELECT * FROM usuarios WHERE email = ? OR crm_coren = ?
                """,
                (login_id, login_id),
            )
            usuario = cursor.fetchone()

        if usuario and check_password_hash(usuario[5], senha):
            return usuario
        return None
        