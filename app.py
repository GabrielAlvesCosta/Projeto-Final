from flask import Flask, render_template, session, redirect, url_for, request
import sqlite3
from models import init_db
from controllers import api
from auth_controller import AuthController
from models import get_db

app = Flask(__name__, static_folder='Static') 
app.secret_key = "chave_mestra_clinical_pep"

# 1. Inicia a estrutura do banco de dados
init_db()

# 2. Registra o Blueprint das APIs (/api/pacientes, /api/prontuarios, etc.)
app.register_blueprint(api, url_prefix='/api')

# ==============================================================
# ROTAS FRONTEND E GESTÃO DE SESSÃO
# ==============================================================
@app.route("/")
def home():
    if "usuario" in session:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))

@app.route("/cadastro", methods=["GET", "POST"])
def cadastro():
    return AuthController.cadastro()

@app.route("/login", methods=["GET", "POST"])
def login():
    return AuthController.login()

@app.route("/logout")
def logout():
    return AuthController.logout()

@app.route("/dashboard")
def dashboard():
    if "usuario" not in session:
        return redirect(url_for("login"))
        
    from models import get_db
    pacientes_lista = []
    
    try:
        with get_db() as db:
            db.row_factory = sqlite3.Row
            pacientes_lista = db.execute('SELECT * FROM pacientes ORDER BY nome ASC').fetchall()
    except Exception:
        pass
        
    return render_template("dashboard.html", usuario=session["usuario"], pacientes=pacientes_lista)

@app.route("/usuarios")
def usuarios():
    if "usuario" not in session:
        return redirect(url_for("login"))
    
    if str(session["usuario"].get("admin", "nao")).lower() != "sim":
        return redirect(url_for("dashboard"))
        
    return AuthController.usuarios()

@app.route("/usuarios/editar/<int:id>", methods=["POST"])
def editar_usuario(id):
    if "usuario" not in session:
        return redirect(url_for("login"))
    return AuthController.editar_usuario_post(id)

@app.route("/perfil", methods=["GET", "POST"])
def perfil():
    if "usuario" not in session:
        return redirect(url_for("login"))
        
    if request.method == "GET":
        return redirect(url_for("dashboard"))
        
    return AuthController.perfil()

@app.route("/cadastrar_paciente", methods=["POST"])
def cadastrar_paciente():
    if "usuario" not in session:
        return redirect(url_for("login"))
    
    nome = request.form.get("nome", "Sem Nome").strip()
    data_nasc_crua = request.form.get("data_nasc", "").strip() 
    
    data_nasc_formatada = "00/00/0000"
    if data_nasc_crua:
        partes_data = data_nasc_crua.split("-")
        if len(partes_data) == 3:
            data_nasc_formatada = f"{partes_data[2]}/{partes_data[1]}/{partes_data[0]}"
            
    genero = request.form.get("genero", "Não informado")
    documento = request.form.get("documento", "Não informado").strip()
    cartao = request.form.get("cartao", "Não informado").strip()
    contato = request.form.get("contato", "Não informado").strip()
    
    
    with get_db() as db:
        db.execute('''
            CREATE TABLE IF NOT EXISTS pacientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                dataNasc TEXT NOT NULL,
                genero TEXT NOT NULL,
                documento TEXT NOT NULL,
                cartao TEXT NOT NULL,
                contato TEXT NOT NULL
            )
        ''')
        
        db.execute('''
            INSERT INTO pacientes (nome, dataNasc, genero, documento, cartao, contato)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (nome, data_nasc_formatada, genero, documento, cartao, contato))
        db.commit()
    
    return redirect(url_for("dashboard"))

if __name__ == '__main__':
    app.run(debug=True, port=5000)