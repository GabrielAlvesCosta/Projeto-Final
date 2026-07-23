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
        
        # Utilizamos LEFT JOIN para buscar o nome do médico baseado no crm_coren
        query = '''
            SELECT c.*, u.nome as profissional
            FROM consultas c
            LEFT JOIN usuarios u ON c.crm_coren = u.crm_coren
        '''
        
        if status == 'ativas':
            query += " WHERE c.status NOT IN ('Atendido', 'Cancelado') ORDER BY c.data ASC, c.horario ASC"
        else:
            query += " WHERE c.status IN ('Atendido', 'Cancelado') ORDER BY c.data DESC, c.horario DESC"
            
        rows = db.execute(query).fetchall()
        return jsonify([dict(r) for r in rows])

@api.route('/consultas', methods=['POST'])
def post_consulta():
    data = request.get_json() or {}
    paciente_id = data.get('pacienteId')
    crm_coren = data.get('crm_coren')

    if not paciente_id or not crm_coren:
        return jsonify({"error": "Paciente e Profissional (CRM/COREN) são obrigatórios."}), 400

    try:
        with get_db() as db:
            # Valida se o paciente existe
            paciente = db.execute('SELECT id FROM pacientes WHERE id = ?', (paciente_id,)).fetchone()
            if not paciente:
                return jsonify({"error": "O paciente selecionado não existe no banco de dados."}), 400

            # Valida se o usuario/profissional existe
            usuario = db.execute('SELECT crm_coren FROM usuarios WHERE crm_coren = ?', (crm_coren,)).fetchone()
            if not usuario:
                return jsonify({"error": f"O profissional com CRM/COREN '{crm_coren}' não está cadastrado no sistema."}), 400

            # Insere a consulta com segurança
            cursor = db.execute('''
                INSERT INTO consultas (pacienteId, nomePaciente, data, horario, crm_coren, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                paciente_id, 
                data.get('nomePaciente'), 
                data.get('data'),
                data.get('horario'), 
                crm_coren, 
                data.get('status', 'Agendado')
            ))
            db.commit()
            return jsonify({"status": "sucesso", "id": cursor.lastrowid}), 201

    except Exception as e:
        print(f"Erro ao salvar consulta: {str(e)}")
        return jsonify({"error": f"Erro interno ao agendar consulta: {str(e)}"}), 500

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
        rows = db.execute('SELECT * FROM prontuarios ORDER BY id DESC').fetchall()
        return jsonify([dict(r) for r in rows])

@api.route('/prontuarios', methods=['POST'])
def post_prontuario():
    data = request.get_json() or {}
    try:
        with get_db() as db:
            # 1. Captura os dados da sessão
            usuario_sessao = session.get('usuario', {})
            crm_coren_logado = usuario_sessao.get('crm_coren') or data.get('crm_coren', 'S/N')
            nome_profissional = usuario_sessao.get('nome', 'Profissional')
            
            # CORREÇÃO: Prioriza a imagem enviada via JSON; se vazia, pega da sessão
            carimbo_enviado = data.get('carimboAssinatura')
            carimbo_sessao = usuario_sessao.get('assinatura')
            assinatura_final = carimbo_enviado if (carimbo_enviado and carimbo_enviado.strip() != '') else (carimbo_sessao or '')

            # 2. Insere o Prontuário Clínico
            cursor = db.execute('''
                INSERT INTO prontuarios (
                    pacienteId, nomePaciente, dataNascimento, genero,
                    documento, convenioCartao, contatoPaciente, acompanhante, especialidade, tipoAtendimento,
                    prioridade, qp, hda, hmp, alergias, sinalPA, sinalFC, sinalFR, sinalTEMP, sinalSATO2,
                    estadoGeral, cardioResp, neuroOutros, hipotese, conduta, crm_coren, registroProfissional, carimboAssinatura
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('pacienteId'), data.get('nomePaciente'), data.get('dataNascimento'), data.get('genero'),
                data.get('documento'), data.get('convenioCartao'), data.get('contatoPaciente'), data.get('acompanhante'), data.get('especialidade'),
                data.get('tipoAtendimento'), data.get('prioridade'), data.get('qp'), data.get('hda'),
                data.get('hmp'), data.get('alergias'), data.get('sinalPA'), data.get('sinalFC'),
                data.get('sinalFR'), data.get('sinalTEMP'), data.get('sinalSATO2'), data.get('estadoGeral'),
                data.get('cardioResp'), data.get('neuroOutros'), data.get('hipotese'), data.get('conduta'),
                crm_coren_logado, crm_coren_logado, assinatura_final
            ))
            
            prontuario_id = cursor.lastrowid

            # 3. Grava Log na Auditoria
            data_hora_atual = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            db.execute('''
                INSERT INTO auditoria (data_hora, nome_profissional, crm_coren, acao, prontuario_id, nome_paciente)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                data_hora_atual,
                nome_profissional,
                crm_coren_logado,
                'Criação',
                prontuario_id,
                data.get('nomePaciente', 'N/A')
            ))

            db.commit()
            return jsonify({"status": "sucesso", "id": prontuario_id}), 201

    except Exception as e:
        print(f"Erro Crítico ao salvar prontuário: {str(e)}")
        return jsonify({"error": f"Erro interno no servidor: {str(e)}"}), 500

@api.route('/prontuarios/<int:id>', methods=['GET'])
def get_prontuario_por_id(id):
    try:
        with get_db() as db:
            db.row_factory = sqlite3.Row
            # 1. Busca o prontuário no banco
            prontuario = db.execute('SELECT * FROM prontuarios WHERE id = ?', (id,)).fetchone()
            
            if not prontuario:
                return jsonify({"error": "Prontuário não encontrado"}), 404
            
            # 2. Captura os dados do usuário logado na sessão
            usuario_sessao = session.get('usuario', {})
            nome_prof = usuario_sessao.get('nome', 'Profissional')
            crm_logado = usuario_sessao.get('crm_coren', 'N/A')
            data_hora_atual = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            
            # 3. GRAVA AUTOMATICAMENTE A VISUALIZAÇÃO NA TABELA AUDITORIA
            db.execute('''
                INSERT INTO auditoria (data_hora, nome_profissional, crm_coren, acao, prontuario_id, nome_paciente)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                data_hora_atual,
                nome_prof,
                crm_logado,
                'Visualização',
                id,
                prontuario['nomePaciente']
            ))
            db.commit()
            
            return jsonify(dict(prontuario)), 200

    except Exception as e:
        print(f"Erro ao visualizar prontuário: {str(e)}")
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500

@api.route('/prontuarios/auditoria', methods=['GET'])
def get_auditoria():
    with get_db() as db:
        db.row_factory = sqlite3.Row
        rows = db.execute('SELECT * FROM auditoria ORDER BY id DESC').fetchall()
        return jsonify([dict(r) for r in rows])

@api.route('/prontuarios/auditoria', methods=['POST'])
def post_auditoria():
    data = request.get_json() or {}
    with get_db() as db:
        data_hora_atual = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        usuario_sessao = session.get('usuario', {})
        nome_prof = usuario_sessao.get('nome', 'Profissional')
        crm_logado = usuario_sessao.get('crm_coren', 'N/A')
        
        db.execute('''
            INSERT INTO auditoria (data_hora, nome_profissional, crm_coren, acao, prontuario_id, nome_paciente)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data_hora_atual,
            nome_prof,
            data.get('crm_coren', crm_logado),
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