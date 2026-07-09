from flask import Flask, request, jsonify
import sqlite3
import os
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='')
DB_FILE = 'clinica.db'

def get_db():
    conn = sqlite3.connect(DB_FILE)
    # Permite retornar os resultados do banco de dados como Dicionários (facilita pro JSON)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        c = conn.cursor()
        
        # 1. Tabela de Usuários (Profissionais)
        c.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                cpf TEXT PRIMARY KEY,
                nome TEXT,
                email TEXT,
                senha TEXT,
                foto TEXT
            )
        ''')
        
        # 2. Tabela de Pacientes (Nomes exatos do dashboard.js)
        c.execute('''
            CREATE TABLE IF NOT EXISTS pacientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT,
                dataNasc TEXT,
                genero TEXT,
                idadeAnos TEXT,
                idadeMeses TEXT,
                idadeDias TEXT,
                documento TEXT,
                cartao TEXT
            )
        ''')
        
        # 3. Tabela de Consultas (Nomes exatos do dashboard.js)
        c.execute('''
            CREATE TABLE IF NOT EXISTS consultas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pacienteId INTEGER,
                nomePaciente TEXT,
                data TEXT,
                horario TEXT,
                profissional TEXT,
                status TEXT
            )
        ''')
        
        # 4. Tabela de Prontuários PEP (Nomes exatos do dashboard.js - 30 colunas!)
        c.execute('''
            CREATE TABLE IF NOT EXISTS prontuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pacienteId INTEGER,
                nomePaciente TEXT,
                dataNascimento TEXT,
                genero TEXT,
                idadeAnos TEXT,
                idadeMeses TEXT,
                idadeDias TEXT,
                documento TEXT,
                convenioCartao TEXT,
                acompanhante TEXT,
                especialidade TEXT,
                tipoAtendimento TEXT,
                prioridade TEXT,
                registroProfissional TEXT,
                carimboAssinatura TEXT,
                qp TEXT,
                hda TEXT,
                hmp TEXT,
                alergias TEXT,
                sinalPA TEXT,
                sinalFC TEXT,
                sinalFR TEXT,
                sinalTEMP TEXT,
                sinalSATO2 TEXT,
                estadoGeral TEXT,
                cardioResp TEXT,
                neuroOutros TEXT,
                hipotese TEXT,
                conduta TEXT,
                medicoCPF TEXT
            )
        ''')
        conn.commit()

# Inicializa o banco de dados no momento em que o Flask rodar
init_db()

@app.route('/')
def index():
    return app.send_static_file('dashboard.html')

@app.route('/<path:path>')
def serve_files(path):
    return app.send_static_file(path)

# ==============================================================
# API DE USUÁRIOS / PROFISSIONAIS (Autenticação e Dropdowns)
# ==============================================================
@app.route('/api/usuarios', methods=['GET', 'POST', 'PUT'])
def api_usuarios():
    with get_db() as conn:
        c = conn.cursor()
        
        if request.method == 'POST':
            d = request.json
            cpf = d.get('cpf', '').replace('.', '').replace('-', '')
            
            c.execute("SELECT cpf FROM usuarios WHERE cpf=?", (cpf,))
            if c.fetchone():
                return jsonify({"msg": "Profissional já cadastrado com este CPF."}), 400
                
            c.execute('''INSERT INTO usuarios (cpf, nome, email, senha, foto) 
                         VALUES (?, ?, ?, ?, ?)''', 
                      (cpf, d.get('nome'), d.get('email'), d.get('senha'), d.get('foto', '')))
            conn.commit()
            return jsonify({"msg": "Cadastro realizado com sucesso!"}), 201

        if request.method == 'PUT':
            d = request.json
            cpf = d.get('cpf')
            c.execute('''UPDATE usuarios SET nome=?, email=?, foto=? WHERE cpf=?''', 
                      (d.get('nome'), d.get('email'), d.get('foto'), cpf))
            conn.commit()
            return jsonify({"msg": "Perfil atualizado!"})

        # GET: Retorna os usuários para o Dropdown
        c.execute("SELECT cpf, nome, email, foto FROM usuarios")
        return jsonify([dict(row) for row in c.fetchall()])

@app.route('/api/login', methods=['POST'])
def api_login():
    d = request.json
    cpf = d.get('cpf', '').replace('.', '').replace('-', '')
    senha = d.get('senha', '')

    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM usuarios WHERE cpf=? AND senha=?", (cpf, senha))
        user = c.fetchone()
        
        if user:
            return jsonify({"sucesso": True, "usuario": dict(user)})
        return jsonify({"sucesso": False, "msg": "Usuário ou senha incorretos."}), 401

# ==============================================================
# API DE PACIENTES
# ==============================================================
@app.route('/api/pacientes', methods=['GET', 'POST', 'PUT'])
def api_pacientes():
    with get_db() as conn:
        c = conn.cursor()
        
        if request.method == 'POST':
            d = request.json
            c.execute('''INSERT INTO pacientes (nome, dataNasc, genero, idadeAnos, idadeMeses, idadeDias, documento, cartao)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                      (d.get('nome'), d.get('dataNasc'), d.get('genero'), d.get('idadeAnos'), 
                       d.get('idadeMeses'), d.get('idadeDias'), d.get('documento'), d.get('cartao')))
            conn.commit()
            return jsonify({"msg": "Paciente cadastrado com sucesso", "id": c.lastrowid})
            
        if request.method == 'PUT':
            d = request.json
            c.execute('''UPDATE pacientes SET nome=?, dataNasc=?, genero=?, idadeAnos=?, 
                         idadeMeses=?, idadeDias=?, documento=?, cartao=? WHERE id=?''',
                      (d.get('nome'), d.get('dataNasc'), d.get('genero'), d.get('idadeAnos'), 
                       d.get('idadeMeses'), d.get('idadeDias'), d.get('documento'), d.get('cartao'), d.get('id')))
            conn.commit()
            return jsonify({"msg": "Dados do paciente atualizados"})
            
        c.execute("SELECT * FROM pacientes ORDER BY id DESC")
        return jsonify([dict(row) for row in c.fetchall()])

# ==============================================================
# API DE CONSULTAS / AGENDAMENTOS
# ==============================================================
@app.route('/api/consultas', methods=['GET', 'POST', 'PUT'])
def api_consultas():
    with get_db() as conn:
        c = conn.cursor()
        status_type = request.args.get('status', 'ativas')

        if request.method == 'POST':
            d = request.json
            prof = d.get('profissional')
            data_req = d.get('data')
            hora_req = d.get('horario')
            
            # Validação: Impedir duplo agendamento para o mesmo profissional
            c.execute("SELECT id FROM consultas WHERE profissional=? AND data=? AND horario=? AND status != 'Cancelado'", 
                      (prof, data_req, hora_req))
            if c.fetchone():
                return jsonify({"error": f"O(a) profissional {prof} já possui um agendamento para {data_req} às {hora_req}."}), 400
            
            c.execute('''INSERT INTO consultas (pacienteId, nomePaciente, data, horario, profissional, status)
                         VALUES (?, ?, ?, ?, ?, ?)''',
                      (d.get('pacienteId'), d.get('nomePaciente'), data_req, hora_req, prof, d.get('status', 'Agendado')))
            conn.commit()
            return jsonify({"msg": "Consulta agendada com sucesso"})

        if request.method == 'PUT':
            d = request.json
            c.execute("UPDATE consultas SET status=? WHERE id=?", (d.get('status'), d.get('id')))
            conn.commit()
            return jsonify({"msg": "Status da consulta atualizado"})

        # GET: Listar e Filtrar Consultas
        c.execute("SELECT * FROM consultas")
        consultas = [dict(row) for row in c.fetchall()]
        
        filtradas = []
        for con in consultas:
            if status_type == 'concluidas':
                if con['status'] in ['Atendido', 'Cancelado']:
                    filtradas.append(con)
            else:
                if con['status'] in ['Agendado', 'Confirmado']:
                    filtradas.append(con)

        def sort_key(item):
            try:
                return datetime.strptime(f"{item['data']}T{item['horario']}", "%Y-%m-%dT%H:%M")
            except:
                return datetime.min

        filtradas.sort(key=sort_key, reverse=(status_type == 'concluidas'))
        return jsonify(filtradas)

# ==============================================================
# API DE PRONTUÁRIOS (PEP)
# ==============================================================
@app.route('/api/prontuarios', methods=['GET', 'POST', 'PUT'])
def api_prontuarios():
    with get_db() as conn:
        c = conn.cursor()
        
        if request.method == 'POST':
            d = request.json
            
            # Lista exata das 30 colunas vindas do front-end
            colunas = [
                'pacienteId', 'nomePaciente', 'dataNascimento', 'genero', 
                'idadeAnos', 'idadeMeses', 'idadeDias', 'documento', 
                'convenioCartao', 'acompanhante', 'especialidade', 
                'tipoAtendimento', 'prioridade', 'registroProfissional', 
                'carimboAssinatura', 'qp', 'hda', 'hmp', 'alergias', 
                'sinalPA', 'sinalFC', 'sinalFR', 'sinalTEMP', 'sinalSATO2', 
                'estadoGeral', 'cardioResp', 'neuroOutros', 'hipotese', 
                'conduta', 'medicoCPF'
            ]
            
            placeholders = ', '.join(['?'] * len(colunas))
            colunas_str = ', '.join(colunas)
            valores = [d.get(coluna, '') for coluna in colunas]
            
            c.execute(f"INSERT INTO prontuarios ({colunas_str}) VALUES ({placeholders})", valores)
            conn.commit()
            return jsonify({"msg": "Prontuário salvo com sucesso"})
            
        if request.method == 'PUT':
            d = request.json
            c.execute("UPDATE prontuarios SET prioridade=?, conduta=? WHERE id=?", 
                      (d.get('prioridade'), d.get('conduta'), d.get('id')))
            conn.commit()
            return jsonify({"msg": "Evolução clínica atualizada"})

        c.execute("SELECT * FROM prontuarios ORDER BY id DESC")
        return jsonify([dict(row) for row in c.fetchall()])

if __name__ == '__main__':
    app.run(debug=True, port=5000)