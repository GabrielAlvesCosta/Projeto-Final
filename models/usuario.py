from database.fake_db import Database
from werkzeug.security import generate_password_hash, check_password_hash

class Usuario:
    def __init__(self, nome, email, cargo, crm_coren, senha, admin="nao", assinatura=""):
        self.nome = nome
        self.email = email
        self.cargo = cargo
        self.crm_coren = crm_coren
        self.senha = senha
        self.admin = admin
        self.assinatura = assinatura  # Novo atributo para a imagem

    def salvar(self):
        db = Database()
        hashed_senha = generate_password_hash(self.senha)
        hashed_crm_coren = generate_password_hash(self.crm_coren)
        with db.conectar() as conexao:
            conexao.execute(
                """
                INSERT INTO usuarios (nome, email, cargo, crm_coren, senha, admin, assinatura)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (self.nome, self.email, self.cargo, hashed_crm_coren, hashed_senha, self.admin, self.assinatura),
            )

    @staticmethod
    def atualizar(usuario_id, nome, email, senha, admin, assinatura_filename=None):
        db = Database()
        
        # 1. Prepara a query base (Nome, Email, Admin)
        query = "UPDATE usuarios SET nome = ?, email = ?, admin = ?"
        params = [nome, email, admin]
        
        # 2. Se o admin preencheu uma nova senha, adiciona à query com HASH
        if senha:
            hashed_senha = generate_password_hash(senha)
            query += ", senha = ?"
            params.append(hashed_senha)
            
        # 3. Se enviou uma nova foto de assinatura, adiciona à query
        if assinatura_filename:
            query += ", assinatura = ?"
            params.append(assinatura_filename)
            
        # 4. Finaliza a query com o ID do utilizador
        query += " WHERE id = ?"
        params.append(usuario_id)
        
        with db.conectar() as conexao:
            conexao.execute(query, tuple(params))
            
    @staticmethod
    def buscar_por_email(email):
        db = Database()
        with db.conectar() as conexao:
            cursor = conexao.execute("SELECT * FROM usuarios WHERE email = ?", (email,))
            return cursor.fetchone()

    @staticmethod
    def listar_todos():
        db = Database()
        with db.conectar() as conexao:
            cursor = conexao.execute("SELECT * FROM usuarios ORDER BY id ASC")
            return cursor.fetchall()

    @staticmethod
    def email_existe(email):
        return Usuario.buscar_por_email(email) is not None

    @staticmethod
    def autenticar(login_id, senha):
        db = Database()
        with db.conectar() as conexao:
            cursor = conexao.execute("SELECT * FROM usuarios WHERE email = ?", (login_id,))
            usuario = cursor.fetchone()

            if usuario and check_password_hash(usuario[5], senha):
                return usuario

            cursor = conexao.execute("SELECT * FROM usuarios")
            for usuario in cursor.fetchall():
                if check_password_hash(usuario[4], login_id) and check_password_hash(usuario[5], senha):
                    return usuario

        return None