from models import get_db
from werkzeug.security import generate_password_hash, check_password_hash

class Usuario:
    def __init__(self, nome, email, cargo, crm_coren, senha, admin="nao", assinatura=""):
        self.nome = nome
        self.email = email
        self.cargo = cargo
        self.crm_coren = crm_coren
        self.senha = senha
        self.admin = admin
        self.assinatura = assinatura

    def salvar(self):
        hashed_senha = generate_password_hash(self.senha)
        with get_db() as conexao:
            conexao.execute(
                """
                INSERT INTO usuarios (nome, email, cargo, crm_coren, senha, admin, assinatura)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (self.nome, self.email, self.cargo, self.crm_coren, hashed_senha, self.admin, self.assinatura)
            )
            conexao.commit()
    
    @staticmethod
    def atualizar_perfil(usuario_id, nome, email, senha=None, assinatura_filename=None):
        # CORREÇÃO: Importamos a conexão correta do nosso models unificado
        from models import get_db 
        
        # Começamos atualizando apenas o básico
        query = "UPDATE usuarios SET nome = ?, email = ?"
        params = [nome, email]

        # Se o usuário digitou uma senha nova, nós a criptografamos e adicionamos na query
        if senha:
            from werkzeug.security import generate_password_hash
            query += ", senha = ?"
            params.append(generate_password_hash(senha))

        # Se o usuário enviou um novo arquivo de assinatura, atualizamos a foto
        if assinatura_filename:
            query += ", assinatura = ?"
            params.append(assinatura_filename)
            
        # Finaliza a query apontando para o usuário correto
        query += " WHERE id = ?"
        params.append(usuario_id)
        
        # CORREÇÃO: Usamos o get_db() em vez de db.conectar()
        with get_db() as conexao:
            conexao.execute(query, tuple(params))
            conexao.commit()
    @staticmethod
    def atualizar(usuario_id, nome, email, senha, admin, assinatura_filename=None):
        query = "UPDATE usuarios SET nome = ?, email = ?, admin = ?"
        params = [nome, email, admin]
        
        if senha:
            hashed_senha = generate_password_hash(senha)
            query += ", senha = ?"
            params.append(hashed_senha)
            
        if assinatura_filename:
            query += ", assinatura = ?"
            params.append(assinatura_filename)
            
        query += " WHERE id = ?"
        params.append(usuario_id)
        
        with get_db() as conexao:
            conexao.execute(query, tuple(params))
            conexao.commit()

    @staticmethod
    def buscar_por_email(email):
        with get_db() as conexao:
            cursor = conexao.execute("SELECT * FROM usuarios WHERE email = ?", (email,))
            return cursor.fetchone()

    @staticmethod
    def listar_todos():
        with get_db() as conexao:
            cursor = conexao.execute("SELECT * FROM usuarios ORDER BY id ASC")
            return cursor.fetchall()

    @staticmethod
    def email_existe(email):
        return Usuario.buscar_por_email(email) is not None

    @staticmethod
    def autenticar(login_id, senha):
        with get_db() as conexao:
            # Permite login por email ou por CRM/COREN
            cursor = conexao.execute("SELECT * FROM usuarios WHERE email = ? OR crm_coren = ?", (login_id, login_id))
            usuario = cursor.fetchone()

            if usuario and check_password_hash(usuario['senha'], senha):
                return dict(usuario) # Devolve os dados limpos para a Sessão
            return None