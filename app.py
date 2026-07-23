import os
import sqlite3
import mimetypes
from datetime import timedelta
from flask import Flask, render_template, session, redirect, url_for, request, Response
from werkzeug.utils import secure_filename

# Combinação das importações necessárias das duas versões
from models import init_db, get_db, cipher, en, de
from controllers import api
from auth_controller import AuthController

# Mantido o static em minúsculo conforme a correção que fizemos
app = Flask(__name__, static_folder='static') 
app.secret_key = "chave_mestra_clinical_pep"

# Adicionado as configurações de segurança de sessão da versão remota
app.config.update({
    'SESSION_COOKIE_HTTPONLY': True,
    'SESSION_COOKIE_SAMESITE': 'Lax',
    'PERMANENT_SESSION_LIFETIME': timedelta(minutes=30)
})

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
        
    pacientes_descriptografados = []
    
    try:
        with get_db() as db:
            db.row_factory = sqlite3.Row
            pacientes_db = db.execute('SELECT * FROM pacientes ORDER BY id DESC').fetchall()
            
            # Mantida a sua lógica de descriptografar os pacientes para exibição no Dashboard HTML
            for p in pacientes_db:
                p_dict = dict(p)
                p_dict['nome'] = de(p_dict.get('nome'))
                p_dict['dataNasc'] = de(p_dict.get('dataNasc'))
                p_dict['genero'] = de(p_dict.get('genero'))
                p_dict['documento'] = de(p_dict.get('documento'))
                p_dict['cartao'] = de(p_dict.get('cartao'))
                p_dict['contato'] = de(p_dict.get('contato'))
                pacientes_descriptografados.append(p_dict)
                
            # Mantida a reordenação alfabética após descriptografar
            pacientes_descriptografados = sorted(pacientes_descriptografados, key=lambda k: (k['nome'] or '').lower())
    except Exception as e:
        print(f"Erro ao carregar dashboard: {e}")
        
    return render_template("dashboard.html", usuario=session["usuario"], pacientes=pacientes_descriptografados)

# Helper de verificação de admin da versão remota
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
    
    # Utilizando o helper is_admin e retornando erro 403 apropriado
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

# Rota de visualização segura de assinaturas da versão remota
@app.route('/assinatura/<path:filename>')
def assinatura(filename):
    if "usuario" not in session:
        return redirect(url_for("login"))

    usuario = session["usuario"]
    if str(usuario.get("admin", "nao")).strip().lower() != "sim" and filename != usuario.get("assinatura"):
        return render_template("403.html"), 403

    secure_name = secure_filename(filename)
    # Aqui ajustamos para 'static' em minúsculo para manter consistência com sua correção
    file_path = os.path.join("static", "uploads", secure_name)
    if not os.path.isfile(file_path):
        return "Arquivo não encontrado", 404

    with open(file_path, "rb") as f:
        encrypted_data = f.read()

    try:
        decrypted_data = cipher.decrypt(encrypted_data)
    except Exception:
        decrypted_data = encrypted_data

    mime_type = mimetypes.guess_type(secure_name)[0] or "application/octet-stream"
    return Response(decrypted_data, mimetype=mime_type)

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
        # Mantida a sua lógica de criptografar os dados sensíveis antes de salvar no banco
        db.execute('''
            INSERT INTO pacientes (nome, dataNasc, genero, documento, cartao, contato)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            en(nome), 
            en(data_nasc_formatada), 
            en(genero), 
            en(documento), 
            en(cartao), 
            en(contato)
        ))
        db.commit()
    
    return redirect(url_for("dashboard"))

if __name__ == '__main__':
    # Mantido o try/except para falhas de porta
    try:
        app.run(debug=True, use_reloader=False, port=5000)
    except OSError as ex:
        print('Falha ao iniciar em 5000. Detalhes:', ex)
        print('Tentando iniciar em 5001...')
        app.run(debug=True, use_reloader=False, port=5001)  