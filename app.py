import os
import sqlite3
import mimetypes
from datetime import timedelta
from flask import Flask, render_template, session, redirect, url_for, request, Response
from werkzeug.utils import secure_filename
from models import init_db, cipher
from controllers import api
from auth_controller import AuthController

app = Flask(__name__, static_folder='Static')
app.secret_key = os.urandom(32)
app.config.update({
    'SESSION_COOKIE_HTTPONLY': True,
    'SESSION_COOKIE_SAMESITE': 'Lax',
    'PERMANENT_SESSION_LIFETIME': timedelta(minutes=30)
})

# 1. Inicia o banco de dados e cria tabelas
init_db()

# 2. Regista as rotas antigas de API (Pacientes, Consultas, Prontuarios)
app.register_blueprint(api, url_prefix='/api')

# ==============================================================
# ROTAS FRONTEND E DE SESSÃO
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

# A MÁGICA: O Dashboard agora é injetado pelo Flask!
@app.route("/dashboard")
def dashboard():
    if "usuario" not in session:
        return redirect(url_for("login"))
        
    from models import get_db
    pacientes_lista = []
    
    try:
        with get_db() as db:
            # Tenta buscar os pacientes (se a tabela já existir)
            db.row_factory = sqlite3.Row # Para podermos aceder pelo nome da coluna
            pacientes_lista = db.execute('SELECT * FROM pacientes ORDER BY nome ASC').fetchall()
    except:
        pass # Se a tabela ainda não existir, envia uma lista vazia
        
    # Enviamos a lista de pacientes para o HTML!
    return render_template("dashboard.html", usuario=session["usuario"], pacientes=pacientes_lista)

def is_admin():
    return "usuario" in session and str(session["usuario"].get("admin", "nao")).strip().lower() == "sim"

@app.route("/admin")
def admin():
    if "usuario" not in session:
        return redirect(url_for("login"))
    if not is_admin():
        return render_template("403.html"), 403
    return AuthController.usuarios()

@app.route("/usuarios")
def usuarios():
    if "usuario" not in session:
        return redirect(url_for("login"))
    
    if not is_admin():
        return render_template("403.html"), 403
        
    return AuthController.usuarios()

@app.route("/usuarios/editar/<int:id>", methods=["POST"])
def editar_usuario(id):
    if "usuario" not in session:
        return redirect(url_for("login"))
    if not is_admin():
        return render_template("403.html"), 403
    return AuthController.editar_usuario_post(id)

@app.route('/assinatura/<path:filename>')
def assinatura(filename):
    if "usuario" not in session:
        return redirect(url_for("login"))

    usuario = session["usuario"]
    if str(usuario.get("admin", "nao")).strip().lower() != "sim" and filename != usuario.get("assinatura"):
        return render_template("403.html"), 403

    secure_name = secure_filename(filename)
    file_path = os.path.join("Static", "uploads", secure_name)
    if not os.path.isfile(file_path):
        return "Arquivo não encontrado", 404

    with open(file_path, "rb") as f:
        encrypted_data = f.read()

    try:
        decrypted_data = cipher.decrypt(encrypted_data)
    except Exception:
        # Se a assinatura estiver armazenada em formato legível antigo,
        # retornamos os dados brutos para compatibilidade com arquivos existentes.
        decrypted_data = encrypted_data

    mime_type = mimetypes.guess_type(secure_name)[0] or "application/octet-stream"
    return Response(decrypted_data, mimetype=mime_type)

@app.route("/perfil", methods=["GET", "POST"])
def perfil():
    # Se não estiver logado, manda pro login
    if "usuario" not in session:
        return redirect(url_for("login"))
        
    # Se tentar recarregar a página ou acessar por link (GET), mandamos pro Dashboard
    if request.method == "GET":
        return redirect(url_for("dashboard"))
        
    # Se estiver enviando o formulário (POST), o controlador processa a atualização
    return AuthController.perfil()

@app.route("/cadastrar_paciente", methods=["POST"])
def cadastrar_paciente():
    if "usuario" not in session:
        return redirect(url_for("login"))
    
    # Capturar dados do formulário
# O segundo parâmetro é o valor padrão caso venha vazio do HTML
    nome = request.form.get("nome", "Sem Nome").strip()
    data_nasc_crua = request.form.get("data_nasc", "").strip() 
    
    # 2. Converte a data de AAAA-MM-DD para DD/MM/AAAA
    data_nasc_formatada = "00/00/0000"
    if data_nasc_crua:
        partes_data = data_nasc_crua.split("-") # Separa o Ano, Mês e Dia
        if len(partes_data) == 3:
            data_nasc_formatada = f"{partes_data[2]}/{partes_data[1]}/{partes_data[0]}"
    genero = request.form.get("genero", "Não informado")
    documento = request.form.get("documento", "Não informado").strip()
    cartao = request.form.get("cartao", "Não informado").strip()
    contato = request.form.get("contato", "Não informado").strip()
    
    # Ligar à base de dados e guardar
    from models import get_db
    with get_db() as db:
        
        # Garantir que a tabela existe
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
        
        # Inserir o novo paciente
        db.execute('''
            INSERT INTO pacientes (nome, dataNasc, genero, documento, cartao, contato)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (nome, data_nasc_formatada, genero, documento, cartao, contato))
        db.commit()
    
    return redirect(url_for("dashboard"))

if __name__ == '__main__':
    try:
        app.run(debug=True, use_reloader=False, port=5001)
    except OSError as ex:
        print('Falha ao iniciar em 5001. Detalhes:', ex)
        print('Tentando iniciar em 5002...')
        app.run(debug=True, use_reloader=False, port=5002)