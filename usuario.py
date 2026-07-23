from models import get_db, en, de, crm_coren_tag
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
        encrypted_crm = en(self.crm_coren)
        crm_tag = crm_coren_tag(self.crm_coren)
        with get_db() as conexao:
            conexao.execute(
                """
                INSERT INTO usuarios (nome, email, cargo, crm_coren, crm_coren_tag, senha, admin, assinatura)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (self.nome, self.email, self.cargo, encrypted_crm, crm_tag, hashed_senha, self.admin, self.assinatura)
            )
            conexao.commit()
    
    @staticmethod
    def atualizar_perfil(usuario_id, nome, email, senha=None, assinatura_filename=None):
        from models import get_db 
        
        query = "UPDATE usuarios SET nome = ?, email = ?"
        params = [nome, email]

        if senha:
            from werkzeug.security import generate_password_hash
            query += ", senha = ?"
            params.append(generate_password_hash(senha))

        if assinatura_filename:
            query += ", assinatura = ?"
            params.append(assinatura_filename)
            
        query += " WHERE id = ?"
        params.append(usuario_id)
        
        with get_db() as conexao:
            conexao.execute(query, tuple(params))
            conexao.commit()

    @staticmethod
    def atualizar(usuario_id, nome, email, cargo, crm_coren, senha, admin, assinatura_filename=None):
        query = "UPDATE usuarios SET nome = ?, email = ?, cargo = ?, admin = ?"
        params = [nome, email, cargo, admin]

        if crm_coren is not None:
            encrypted_crm = en(crm_coren)
            crm_tag = crm_coren_tag(crm_coren)
            query += ", crm_coren = ?, crm_coren_tag = ?"
            params.extend([encrypted_crm, crm_tag])

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
            usuarios = []
            for row in cursor.fetchall():
                usuario = dict(row)
                usuario['crm_coren'] = de(usuario.get('crm_coren'))
                usuarios.append(usuario)
            return usuarios

    @staticmethod
    def email_existe(email):
        return Usuario.buscar_por_email(email) is not None

    @staticmethod
    def crm_coren_existe(crm_coren, exclude_id=None):
        if not crm_coren or str(crm_coren).strip() == "":
            return False
        tag = crm_coren_tag(crm_coren)
        if not tag:
            return False
        with get_db() as conexao:
            if exclude_id:
                cursor = conexao.execute("SELECT id FROM usuarios WHERE crm_coren_tag = ? AND id != ?", (tag, exclude_id))
            else:
                cursor = conexao.execute("SELECT id FROM usuarios WHERE crm_coren_tag = ?", (tag,))
            return cursor.fetchone() is not None

    @staticmethod
    def autenticar(login_id, senha):
        login_id = str(login_id or "").strip()
        tag = crm_coren_tag(login_id)
        with get_db() as conexao:
            if tag:
                cursor = conexao.execute("SELECT * FROM usuarios WHERE email = ? OR crm_coren_tag = ?", (login_id, tag))
            else:
                cursor = conexao.execute("SELECT * FROM usuarios WHERE email = ?", (login_id,))
            usuario = cursor.fetchone()

            if usuario and check_password_hash(usuario['senha'], senha):
                usuario = dict(usuario)
                usuario['crm_coren'] = de(usuario.get('crm_coren'))
                return usuario
            return None