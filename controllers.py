from flask import Blueprint, request, jsonify, session
import sqlite3
from datetime import datetime
from models import get_db

api = Blueprint('api', __name__)

# ==========================================
# ROTAS DE PACIENTES
# ==========================================
@api.route('/pacientes', methods=['GET'])
def get_pacientes():
    with get_db() as db:
        db.row_factory = sqlite3.Row
        rows = db.execute('SELECT * FROM pacientes ORDER BY id DESC').fetchall()
        return jsonify([dict(r) for r in rows])

@api.route('/pacientes', methods=['POST'])
def post_paciente():
    data = request.get_json() or {}
    with get_db() as db:
        db.execute('''
            CREATE TABLE IF NOT EXISTS pacientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                dataNasc TEXT,
                genero TEXT,
                documento TEXT,
                cartao TEXT,
                contato TEXT
            )
        ''')
        cursor = db.execute('''
            INSERT INTO pacientes (nome, dataNasc, genero, documento, cartao, contato)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data.get('nome', 'Sem Nome'),
            data.get('dataNasc', ''),
            data.get('genero', 'Não informado'),
            data.get('documento', ''),
            data.get('cartao', ''),
            data.get('contato', '')
        ))
        db.commit()
        return jsonify({"status": "sucesso", "id": cursor.lastrowid}), 201

@api.route('/pacientes', methods=['PUT'])
def put_paciente():
    data = request.get_json() or {}
    with get_db() as db:
        db.execute('''
            UPDATE pacientes SET
                nome=?, dataNasc=?, genero=?, documento=?, cartao=?, contato=?
            WHERE id=?
        ''', (
            data.get('nome'), data.get('dataNasc'), data.get('genero'),
            data.get('documento'), data.get('cartao'), data.get('contato'),
            data.get('id')
        ))
        db.commit()
        return jsonify({"status": "sucesso"}), 200

# ==========================================
# ROTAS DE CONSULTAS
# ==========================================
@api.route('/consultas', methods=['GET'])
def get_consultas():
    status = request.args.get('status', 'ativas')
    with get_db() as db:
        db.row_factory = sqlite3.Row
        db.execute('''
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
        if status == 'ativas':
            rows = db.execute("SELECT * FROM consultas WHERE status NOT IN ('Atendido', 'Cancelado') ORDER BY data ASC, horario ASC").fetchall()
        else:
            rows = db.execute("SELECT * FROM consultas WHERE status IN ('Atendido', 'Cancelado') ORDER BY data DESC, horario DESC").fetchall()
        return jsonify([dict(r) for r in rows])

@api.route('/consultas', methods=['POST'])
def post_consulta():
    data = request.get_json() or {}
    with get_db() as db:
        db.execute('''
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
        cursor = db.execute('''
            INSERT INTO consultas (pacienteId, nomePaciente, data, horario, medicoId, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data.get('pacienteId'), data.get('nomePaciente'), data.get('data'),
            data.get('horario'), data.get('medicoId'), data.get('status', 'Agendado')
        ))
        db.commit()
        return jsonify({"status": "sucesso", "id": cursor.lastrowid}), 201

@api.route('/consultas', methods=['PUT'])
def put_consulta():
    data = request.get_json() or {}
    with get_db() as db:
        db.execute("UPDATE consultas SET status=? WHERE id=?", (data.get('status'), data.get('id')))
        db.commit()
        return jsonify({"status": "sucesso"}), 200

# ==========================================
# ROTAS DE PRONTUÁRIOS E AUDITORIA
# ==========================================
@api.route('/prontuarios', methods=['GET'])
def get_prontuarios():
    with get_db() as db:
        db.row_factory = sqlite3.Row
        db.execute('''
            CREATE TABLE IF NOT EXISTS prontuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pacienteId INTEGER,
                nomePaciente TEXT,
                dataNascimento TEXT,
                genero TEXT,
                documento TEXT,
                convenioCartao TEXT,
                contatoPaciente TEXT,
                acompanhante TEXT,
                especialidade TEXT,
                tipoAtendimento TEXT,
                prioridade TEXT,
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
                medicoCPF TEXT,
                registroProfissional TEXT,
                carimboAssinatura TEXT
            )
        ''')
        rows = db.execute('SELECT * FROM prontuarios ORDER BY id DESC').fetchall()
        return jsonify([dict(r) for r in rows])

@api.route('/prontuarios', methods=['POST'])
def post_prontuario():
    data = request.get_json() or {}
    try:
        with get_db() as db:
            # 1. Garante que as tabelas necessárias existem
            db.execute('''
                CREATE TABLE IF NOT EXISTS prontuarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pacienteId INTEGER,
                    nomePaciente TEXT,
                    dataNascimento TEXT,
                    genero TEXT,
                    documento TEXT,
                    convenioCartao TEXT,
                    contatoPaciente TEXT,
                    acompanhante TEXT,
                    especialidade TEXT,
                    tipoAtendimento TEXT,
                    prioridade TEXT,
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
                    medicoCPF TEXT,
                    registroProfissional TEXT,
                    carimboAssinatura TEXT
                )
            ''')
            db.execute('''
                CREATE TABLE IF NOT EXISTS auditoria (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    data_hora TEXT,
                    nome_profissional TEXT,
                    usuario_cpf TEXT,
                    acao TEXT,
                    prontuario_id INTEGER,
                    nome_paciente TEXT
                )
            ''')

            # 2. Inserção do Prontuário Clínico
            cursor = db.execute('''
                INSERT INTO prontuarios (
                    pacienteId, nomePaciente, dataNascimento, genero,
                    documento, convenioCartao, contatoPaciente, acompanhante, especialidade, tipoAtendimento,
                    prioridade, qp, hda, hmp, alergias, sinalPA, sinalFC, sinalFR, sinalTEMP, sinalSATO2,
                    estadoGeral, cardioResp, neuroOutros, hipotese, conduta, medicoCPF, registroProfissional, carimboAssinatura
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('pacienteId'), data.get('nomePaciente'), data.get('dataNascimento'), data.get('genero'),
                data.get('documento'), data.get('convenioCartao'), data.get('contatoPaciente'), data.get('acompanhante'), data.get('especialidade'),
                data.get('tipoAtendimento'), data.get('prioridade'), data.get('qp'), data.get('hda'),
                data.get('hmp'), data.get('alergias'), data.get('sinalPA'), data.get('sinalFC'),
                data.get('sinalFR'), data.get('sinalTEMP'), data.get('sinalSATO2'), data.get('estadoGeral'),
                data.get('cardioResp'), data.get('neuroOutros'), data.get('hipotese'), data.get('conduta'),
                data.get('medicoCPF'), data.get('registroProfissional'), data.get('carimboAssinatura')
            ))
            
            prontuario_id = cursor.lastrowid

            # 3. Inserção Automática do Log de Auditoria
            data_hora_atual = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            usuario_sessao = session.get('usuario', {})
            nome_prof = usuario_sessao.get('nome', 'Profissional')
            cpf_prof = data.get('medicoCPF') or usuario_sessao.get('cpf', 'S/N')

            db.execute('''
                INSERT INTO auditoria (data_hora, nome_profissional, usuario_cpf, acao, prontuario_id, nome_paciente)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                data_hora_atual,
                nome_prof,
                cpf_prof,
                'Criação',
                prontuario_id,
                data.get('nomePaciente', 'Paciente')
            ))

            db.commit()
            return jsonify({"status": "sucesso", "id": prontuario_id}), 201

    except Exception as e:
        return jsonify({"error": f"Erro interno no servidor: {str(e)}"}), 500

@api.route('/prontuarios/auditoria', methods=['GET'])
def get_auditoria():
    with get_db() as db:
        db.row_factory = sqlite3.Row
        db.execute('''
            CREATE TABLE IF NOT EXISTS auditoria (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data_hora TEXT,
                nome_profissional TEXT,
                usuario_cpf TEXT,
                acao TEXT,
                prontuario_id INTEGER,
                nome_paciente TEXT
            )
        ''')
        rows = db.execute('SELECT * FROM auditoria ORDER BY id DESC').fetchall()
        return jsonify([dict(r) for r in rows])

@api.route('/prontuarios/auditoria', methods=['POST'])
def post_auditoria():
    data = request.get_json() or {}
    with get_db() as db:
        db.execute('''
            CREATE TABLE IF NOT EXISTS auditoria (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data_hora TEXT,
                nome_profissional TEXT,
                usuario_cpf TEXT,
                acao TEXT,
                prontuario_id INTEGER,
                nome_paciente TEXT
            )
        ''')
        
        data_hora_atual = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        usuario_sessao = session.get('usuario', {})
        nome_prof = usuario_sessao.get('nome', 'Profissional')
        
        db.execute('''
            INSERT INTO auditoria (data_hora, nome_profissional, usuario_cpf, acao, prontuario_id, nome_paciente)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data_hora_atual,
            nome_prof,
            data.get('usuario_cpf', 'N/A'),
            data.get('acao', 'Visualização'),
            data.get('prontuario_id'),
            data.get('nome_paciente', 'N/A')
        ))
        db.commit()
        return jsonify({"status": "sucesso"}), 201

@api.route('/usuarios', methods=['GET'])
def get_usuarios():
    try:
        with get_db() as db:
            db.row_factory = sqlite3.Row
            # Seleciona todos os usuários cadastrados
            rows = db.execute('SELECT * FROM usuarios').fetchall()
            return jsonify([dict(r) for r in rows])
            
    except Exception as e:
        print(f"Erro ao buscar usuários: {e}")
        # FALLBACK: Se der erro no banco, retorna pelo menos o próprio usuário logado para o Select não ficar vazio
        if "usuario" in session:
            return jsonify([session["usuario"]])
        return jsonify([])