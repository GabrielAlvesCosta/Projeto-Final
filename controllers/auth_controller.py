from flask import render_template, request, redirect, url_for, session
from models.usuario import Usuario
import sqlite3

class AuthController:

    @staticmethod
    def cadastro():
        if request.method == "POST":

            nome = request.form.get("nome", "").strip()
            email = request.form.get("email", "").strip()
            cargo = request.form.get("cargo", "").strip()
            crm_coren = (request.form.get("crm_coren") or request.form.get("crm_corem") or "").strip()
            senha = request.form.get("senha", "").strip()

            if not nome or not email or not cargo or not crm_coren or not senha:
                return render_template(
                    "cadastro.html",
                    error="Preencha todos os campos",
                    nome=nome,
                    email=email,
                    cargo=cargo,
                    crm_coren=crm_coren,
                )

            admin = request.form.get("admin", "nao").strip().lower()
            if admin not in ("sim", "nao"):
                admin = "nao"

            if Usuario.email_existe(email):
                return render_template(
                    "cadastro.html",
                    error="Email já cadastrado",
                    nome=nome,
                    email=email,
                    cargo=cargo,
                    crm_coren=crm_coren,
                    admin=admin,
                )

            if Usuario.buscar_por_crm_coren(crm_coren):
                return render_template(
                    "cadastro.html",
                    error="CRM/COREM já cadastrado",
                    nome=nome,
                    email=email,
                    cargo=cargo,
                    crm_coren=crm_coren,
                    admin=admin,
                )

            usuario = Usuario(nome, email, cargo, crm_coren, senha, admin)
            try:
                usuario.salvar()
            except sqlite3.IntegrityError:
                return render_template(
                    "cadastro.html",
                    error="Email já cadastrado",
                    nome=nome,
                    email=email,
                    cargo=cargo,
                    crm_coren=crm_coren,
                    admin=admin,
                )

            return redirect(url_for("login"))

        return render_template("cadastro.html")

    @staticmethod
    def login():
        if request.method == "POST":

            login_id = request.form.get("email", "").strip()
            # aceitar tanto 'senha' quanto 'password' vindo do template
            senha = request.form.get("senha") or request.form.get("password") or ""
            senha = senha.strip()

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

            return render_template("login.html", error="CRM/COREM ou senha inválidos")

        return render_template("login.html")

    @staticmethod
    def usuarios():
        if "usuario" not in session:
            return redirect(url_for("login"))

        usuarios = Usuario.listar_todos()
        usuarios = [
            {
                "id": usuario[0],
                "nome": usuario[1],
                "email": usuario[2],
                "cargo": usuario[3],
                "crm_coren": usuario[4],
                "senha": usuario[5],
                "admin": usuario[6] if len(usuario) > 6 else "nao",
            }
            for usuario in usuarios
        ]
        return render_template(
            "usuarios.html",
            usuario=session["usuario"],
            usuarios=usuarios,
        )