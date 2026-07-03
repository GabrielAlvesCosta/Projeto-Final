from flask import Flask, request, jsonify
import json
import os
import time
from datetime import datetime

# Configura o Flask para servir os arquivos estáticos da mesma pasta
app = Flask(__name__, static_folder='.', static_url_path='')
DB_FILE = 'banco_clinica.json'

def carregar_banco():
    if not os.path.exists(DB_FILE):
        return {"pacientes": [], "consultas": [], "prontuarios": [], "usuarios": []}
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        try:
            db = json.load(f)
            # Garante que a chave de usuários exista no arquivo JSON
            if "usuarios" not in db:
                db["usuarios"] = []
            return db
        except:
            return {"pacientes": [], "consultas": [], "prontuarios": [], "usuarios": []}

def salvar_banco(db):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=4, ensure_ascii=False)

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
    db = carregar_banco()
    
    if request.method == 'POST':
        novo_usuario = request.json
        # Evita duplicação por CPF
        for u in db['usuarios']:
            if u.get('cpf') == novo_usuario.get('cpf'):
                return jsonify({"msg": "Profissional já cadastrado com este CPF."}), 400
                
        db['usuarios'].append(novo_usuario)
        salvar_banco(db)
        return jsonify({"msg": "Cadastro realizado com sucesso!"}), 201

    if request.method == 'PUT':
        dados = request.json
        for i, u in enumerate(db['usuarios']):
            if u.get('cpf') == dados.get('cpf'):
                db['usuarios'][i].update(dados)
                salvar_banco(db)
                return jsonify({"msg": "Perfil atualizado!"})
        return jsonify({"msg": "Usuário não encontrado"}), 404

    # Retorna todos os profissionais para alimentar os dropdowns do painel
    return jsonify(db['usuarios'])

@app.route('/api/login', methods=['POST'])
def api_login():
    db = carregar_banco()
    dados = request.json
    cpf = dados.get('cpf', '').replace('.', '').replace('-', '')
    senha = dados.get('senha', '')

    for u in db['usuarios']:
        u_cpf = u.get('cpf', '').replace('.', '').replace('-', '')
        if u_cpf == cpf and u.get('senha') == senha:
            return jsonify({"sucesso": True, "usuario": u})

    return jsonify({"sucesso": False, "msg": "Usuário ou senha incorretos."}), 401

# ==============================================================
# API DE PACIENTES
# ==============================================================
@app.route('/api/pacientes', methods=['GET', 'POST', 'PUT'])
def api_pacientes():
    db = carregar_banco()
    
    if request.method == 'POST':
        novo = request.json
        novo['id'] = int(time.time() * 1000) 
        db['pacientes'].insert(0, novo)
        salvar_banco(db)
        return jsonify({"msg": "Paciente cadastrado com sucesso"})
        
    if request.method == 'PUT':
        dados = request.json
        for i, p in enumerate(db['pacientes']):
            if p.get('id') == dados.get('id'):
                db['pacientes'][i].update(dados)
                salvar_banco(db)
                break
        return jsonify({"msg": "Dados do paciente atualizados"})
        
    return jsonify(db['pacientes'])

# ==============================================================
# API DE CONSULTAS / AGENDAMENTOS
# ==============================================================
@app.route('/api/consultas', methods=['GET', 'POST', 'PUT'])
def api_consultas():
    db = carregar_banco()
    status_type = request.args.get('status', 'ativas')

    if request.method == 'POST':
        nova = request.json
        
        # ================================================================
        # NOVA REGRA: EVITAR CONFLITO DE HORÁRIO PARA O MESMO MÉDICO
        # ================================================================
        data_solicitada = nova.get('data')
        horario_solicitado = nova.get('horario')
        profissional_solicitado = nova.get('profissional')

        for c in db['consultas']:
            # Verifica se já existe uma consulta para este médico, neste mesmo dia e hora
            # Ignora as consultas "Canceladas", pois estas libertam o horário
            if (c.get('profissional') == profissional_solicitado and 
                c.get('data') == data_solicitada and 
                c.get('horario') == horario_solicitado and 
                c.get('status') != 'Cancelado'):
                
                return jsonify({"error": f"O(a) profissional {profissional_solicitado} já tem um agendamento para {data_solicitada} às {horario_solicitado}."}), 400
        # ================================================================

        nova['id'] = int(time.time() * 1000)
        if 'status' not in nova:
            nova['status'] = 'Agendado'
        db['consultas'].insert(0, nova)
        salvar_banco(db)
        return jsonify({"msg": "Consulta agendada com sucesso"})

    if request.method == 'PUT':
        dados = request.json
        for i, c in enumerate(db['consultas']):
            if c.get('id') == dados.get('id'):
                db['consultas'][i].update(dados)
                salvar_banco(db)
                break
        return jsonify({"msg": "Status da consulta atualizado"})

    consultas_filtradas = []
    for c in db['consultas']:
        if status_type == 'concluidas':
            if c.get('status') in ['Atendido', 'Cancelado']:
                consultas_filtradas.append(c)
        else:
            if c.get('status') in ['Agendado', 'Confirmado']:
                consultas_filtradas.append(c)

    def sort_key(item):
        try:
            return datetime.strptime(f"{item.get('data')}T{item.get('horario')}", "%Y-%m-%dT%H:%M")
        except:
            return datetime.min

    reverse_order = (status_type == 'concluidas')
    consultas_filtradas.sort(key=sort_key, reverse=reverse_order)
    return jsonify(consultas_filtradas)

# ==============================================================
# API DE PRONTUÁRIOS (PEP)
# ==============================================================
@app.route('/api/prontuarios', methods=['GET', 'POST', 'PUT'])
def api_prontuarios():
    db = carregar_banco()
    
    if request.method == 'POST':
        novo = request.json
        novo['id'] = int(time.time() * 1000)
        db['prontuarios'].insert(0, novo)
        salvar_banco(db)
        return jsonify({"msg": "Prontuário salvo com sucesso"})
        
    if request.method == 'PUT':
        dados = request.json
        for i, p in enumerate(db['prontuarios']):
            if p.get('id') == dados.get('id'):
                db['prontuarios'][i].update(dados)
                salvar_banco(db)
                break
        return jsonify({"msg": "Evolução clínica atualizada"})

    return jsonify(db['prontuarios'])

if __name__ == '__main__':
    app.run(debug=True, port=5000)