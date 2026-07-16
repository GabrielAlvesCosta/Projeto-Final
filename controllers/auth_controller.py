import os
import time
from werkzeug.utils import secure_filename
from flask import render_template, request, redirect, url_for, session
from models.usuario import Usuario

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
        if request.method == "POST":
            login_id = request.form.get("email", "").strip()
            senha = request.form.get("senha", "").strip()

            if not login_id or not senha:
                return render_template("login.html", error="CRM/COREM e senha são obrigatórios")

            usuario = Usuario.autenticar(login_id, senha)

            if usuario:
                admin_value = str(usuario[6] or "nao").strip().lower()
                session["usuario"] = {
                    "id": usuario[0],
                    "nome": usuario[1],
                    "email": usuario[2],
                    "cargo": usuario[3],
                    "crm_coren": usuario[4],
                    "admin": admin_value,
                }
                if admin_value == "sim":
                    return redirect(url_for("usuarios"))
                return redirect(url_for("teste"))

            return render_template("login.html", error="Credenciais inválidas")

        return render_template("login.html")

    @staticmethod
    def usuarios():
        if "usuario" not in session:
            return redirect(url_for("login"))

        usuarios_db = Usuario.listar_todos()
        usuarios_lista = []
        for u in usuarios_db:
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