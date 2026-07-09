from flask import Flask, render_template, session, redirect, url_for

print("[DEBUG] executando app.py")
from controllers.auth_controller import AuthController
from database.fake_db import Database

app = Flask(__name__, static_folder='Static', static_url_path='/Static')
app.secret_key = "123456"

fake_db = Database()
fake_db.criar_tabela()

@app.route("/")
def home():
    if "usuario" in session:
        admin_value = str(session["usuario"].get("admin", "nao")).strip().lower()
        if admin_value == "sim":
            return redirect(url_for("usuarios"))
        return redirect(url_for("teste"))
    return redirect(url_for("cadastro"))

@app.route("/cadastro", methods=["GET", "POST"])
def cadastro():
    return AuthController.cadastro()

@app.route("/login", methods=["GET", "POST"])
def login():
    return AuthController.login()

@app.route("/usuarios")
def usuarios():
    if "usuario" not in session:
        return redirect(url_for("login"))
    admin_value = str(session["usuario"].get("admin", "nao")).strip().lower()
    if admin_value != "sim":
        return redirect(url_for("teste"))
    return AuthController.usuarios()

@app.route("/teste")
def teste():
    if "usuario" not in session:
        return redirect(url_for("login"))
    return render_template("teste.html", usuario=session["usuario"])

@app.route("/configuracoes")
def configuracoes():
    if "usuario" not in session:
        return redirect(url_for("login"))

    if session["usuario"].get("admin") != "sim":
        return redirect(url_for("usuarios"))

    return render_template("configuracoes.html")
    
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

if __name__ == "__main__":
    app.run(debug=True, port= 5001)