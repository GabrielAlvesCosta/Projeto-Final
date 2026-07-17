import os
import time
from werkzeug.utils import secure_filename
from flask import render_template, request, redirect, url_for, session
from usuario import Usuario

class AuthController:

    @staticmethod
    def cadastro():
        if request.method == "POST":
            nome = request.form.get("nome", "").strip()
            email = request.form.get("email", "").strip()
            cargo = request.form.get("cargo", "").strip()
            crm_coren = (request.form.get("crm_coren") or request.form.get("crm_corem") or "").strip()
            senha = request.form.get("senha", "").strip()
            admin = request.form.get("admin", "nao").strip().lower()

            if not nome or not email or not cargo or not senha:
                return render_template("cadastro.html", error="Preencha os campos obrigatórios")

            if admin not in ("sim", "nao"):
                admin = "nao"

            if Usuario.email_existe(email):
                return render_template("cadastro.html", error="Email já cadastrado")

            # Upload da Assinatura Digital
            file = request.files.get("assinatura")
            assinatura_filename = ""
            if file and file.filename != "":
                filename = f"{int(time.time())}_{secure_filename(file.filename)}"
                upload_path = os.path.join("Static", "uploads")
                os.makedirs(upload_path, exist_ok=True)
                file.save(os.path.join(upload_path, filename))
                assinatura_filename = filename

            usuario = Usuario(nome, email, cargo, crm_coren, senha, admin, assinatura_filename)
            usuario.salvar()
            return redirect(url_for("login"))

        return render_template("cadastro.html")

    @staticmethod
    def login():
        if "usuario" in session:
            usuario = session["usuario"]
            # Acesso seguro ao admin na sessão (que sempre armazena como dicionário)
            admin_value = str(usuario.get("admin", "nao")).strip().lower()
            if admin_value == "sim":
                return redirect(url_for("usuarios"))
            return redirect(url_for("teste"))

        if request.method == "POST":
            email = request.form.get("email", "").strip()
            senha = request.form.get("senha", "").strip()

            if not email or not senha:
                return render_template("login.html", error="Preencha todos os campos")

            usuario = Usuario.autenticar(email, senha)
            if usuario:
                # Tratamento robusto para suportar tanto dicionários/Row quanto tuplas do banco
                try:
                    # Tenta acessar usando chaves de texto (Dicionário / sqlite3.Row)
                    dados_sessao = {
                        "id": usuario["id"],
                        "nome": usuario["nome"],
                        "email": usuario["email"],
                        "cargo": usuario["cargo"],
                        "crm_coren": usuario["crm_coren"],
                        "admin": usuario["admin"],
                        "assinatura": usuario["assinatura"]
                    }
                    admin_value = str(usuario["admin"] or "nao").strip().lower()
                except (KeyError, TypeError):
                    # Se falhar (for uma tupla simples), acessa por índices numéricos
                    dados_sessao = {
                        "id": usuario[0],
                        "nome": usuario[1],
                        "email": usuario[2],
                        "cargo": usuario[3],
                        "crm_coren": usuario[4],
                        "admin": usuario[6],
                        "assinatura": usuario[7]
                    }
                    admin_value = str(usuario[6] or "nao").strip().lower()

                # Salva os dados tratados na sessão
                session["usuario"] = dados_sessao

                if admin_value == "sim":
                    return redirect(url_for("usuarios"))
                return redirect(url_for("dashboard"))
            else:
                return render_template("login.html", error="Email ou senha incorretos")

        return render_template("login.html")

    @staticmethod
    def usuarios():
        if "usuario" not in session:
            return redirect(url_for("login"))
        
        usuarios_db = Usuario.listar_todos()
        usuarios_lista = []
        for u in usuarios_db:
            try:
                # Tenta mapear como dicionário
                usuarios_lista.append({
                    "id": u["id"],
                    "nome": u["nome"],
                    "email": u["email"],
                    "cargo": u["cargo"],
                    "crm_coren": u["crm_coren"],
                    "admin": u.get("admin", "nao"),
                    "assinatura": u.get("assinatura", "")
                })
            except (KeyError, TypeError):
                # Fallback caso seja uma tupla
                usuarios_lista.append({
                    "id": u[0],
                    "nome": u[1],
                    "email": u[2],
                    "cargo": u[3],
                    "crm_coren": u[4],
                    "admin": u[6] if len(u) > 6 else "nao",
                    "assinatura": u[7] if len(u) > 7 else ""
                })
        return render_template("usuarios.html", usuarios=usuarios_lista)

    @staticmethod
    def logout():
        session.clear()
        return redirect(url_for("login"))

    @staticmethod
    def editar_usuario_post(usuario_id):
        nome = request.form.get("nome", "").strip()
        email = request.form.get("email", "").strip()
        senha = request.form.get("senha", "").strip() # Agora capturamos a nova senha
        admin = request.form.get("admin", "nao").strip().lower()

        file = request.files.get("assinatura")
        assinatura_filename = None

        if file and file.filename != "":
            filename = f"{int(time.time())}_{secure_filename(file.filename)}"
            upload_path = os.path.join("Static", "uploads")
            os.makedirs(upload_path, exist_ok=True)
            file.save(os.path.join(upload_path, filename))
            assinatura_filename = filename

        # Passamos a "senha" para o banco de dados em vez do "cargo"
        Usuario.atualizar(usuario_id, nome, email, senha, admin, assinatura_filename)
        return redirect(url_for("usuarios"))
    
    @staticmethod
    def perfil():
        # Se o usuário enviou o formulário (Clicou em Salvar)
        if request.method == "POST":
            usuario_id = session["usuario"]["id"]
            nome = request.form.get("nome", "").strip()
            email = request.form.get("email", "").strip()
            senha = request.form.get("senha", "").strip()
            
            # Repare: Nós NÃO capturamos 'cargo' nem 'crm_coren' do request.form.
            # Mesmo que um hacker tente forçar o envio desses dados, o Python vai ignorar.

            file = request.files.get("assinatura")
            assinatura_filename = None

            # Lógica de salvar a imagem
            if file and file.filename != "":
                filename = f"{int(time.time())}_{secure_filename(file.filename)}"
                upload_path = os.path.join("Static", "uploads")
                os.makedirs(upload_path, exist_ok=True)
                file.save(os.path.join(upload_path, filename))
                assinatura_filename = filename

            # Chama a função que criamos no usuario.py
            from usuario import Usuario
            Usuario.atualizar_perfil(usuario_id, nome, email, senha if senha else None, assinatura_filename)

            # Atualiza os dados na "memória" (sessão) para a tela não mostrar dados antigos
            session["usuario"]["nome"] = nome
            session["usuario"]["email"] = email
            if assinatura_filename:
                session["usuario"]["assinatura"] = assinatura_filename
            session.modified = True

            # Redireciona de volta para a tela de perfil para ver as mudanças
            return redirect(url_for("dashboard"))

        # Se a requisição for GET (Apenas acessando a página)
        return render_template("perfil.html", usuario=session["usuario"])