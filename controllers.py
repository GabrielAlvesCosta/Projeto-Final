from flask import Blueprint, request, jsonify
from datetime import datetime

# Importa as funções do nosso ficheiro models.py
from models import get_db, en, de

# Cria um Blueprint (um agrupador de rotas) chamado 'api'
api = Blueprint('api', __name__)

# ==============================================================
# API DE USUÁRIOS / PROFISSIONAIS
# ==============================================================
@api.route('/usuarios', methods=['GET', 'POST', 'PUT'])
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

        c.execute("SELECT cpf, nome, email, foto FROM usuarios")
        return jsonify([dict(row) for row in c.fetchall()])

@api.route('/login', methods=['POST'])
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
# API DE PACIENTES (COM CRIPTOGRAFIA LGPD)
# ==============================================================
@api.route('/pacientes', methods=['GET', 'POST', 'PUT'])
def api_pacientes():
    with get_db() as conn:
        c = conn.cursor()
        
        if request.method == 'POST':
            d = request.json
            c.execute('''INSERT INTO pacientes (nome, dataNasc, genero, idadeAnos, idadeMeses, idadeDias, documento, cartao, contato)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                      (en(d.get('nome')), en(d.get('dataNasc')), en(d.get('genero')), en(d.get('idadeAnos')), 
                       en(d.get('idadeMeses')), en(d.get('idadeDias')), en(d.get('documento')), en(d.get('cartao')), en(d.get('contato'))))
            conn.commit()
            return jsonify({"msg": "Paciente cadastrado com sucesso", "id": c.lastrowid})
            
        if request.method == 'PUT':
            d = request.json
            c.execute('''UPDATE pacientes SET nome=?, dataNasc=?, genero=?, idadeAnos=?, 
                         idadeMeses=?, idadeDias=?, documento=?, cartao=?, contato=? WHERE id=?''',
                      (en(d.get('nome')), en(d.get('dataNasc')), en(d.get('genero')), en(d.get('idadeAnos')), 
                       en(d.get('idadeMeses')), en(d.get('idadeDias')), en(d.get('documento')), en(d.get('cartao')), en(d.get('contato')), d.get('id')))
            conn.commit()
            return jsonify({"msg": "Dados do paciente atualizados"})
            
        c.execute("SELECT * FROM pacientes ORDER BY id DESC")
        pacientes = []
        for row in c.fetchall():
            p = dict(row)
            for k in p.keys():
                if k != 'id': p[k] = de(p[k])
            pacientes.append(p)
        return jsonify(pacientes)

# ==============================================================
# API DE CONSULTAS / AGENDAMENTOS
# ==============================================================
@api.route('/consultas', methods=['GET', 'POST', 'PUT'])
def api_consultas():
    with get_db() as conn:
        c = conn.cursor()
        status_type = request.args.get('status', 'ativas')

        if request.method == 'POST':
            d = request.json
            prof = d.get('profissional')
            data_req = d.get('data')
            hora_req = d.get('horario')
            
            c.execute("SELECT id FROM consultas WHERE profissional=? AND data=? AND horario=? AND status != 'Cancelado'", 
                      (prof, data_req, hora_req))
            if c.fetchone():
                return jsonify({"error": f"O(a) profissional {prof} já tem um agendamento para {data_req} às {hora_req}."}), 400
            
            c.execute('''INSERT INTO consultas (pacienteId, nomePaciente, data, horario, profissional, status)
                         VALUES (?, ?, ?, ?, ?, ?)''',
                      (d.get('pacienteId'), en(d.get('nomePaciente')), data_req, hora_req, prof, d.get('status', 'Agendado')))
            conn.commit()
            return jsonify({"msg": "Consulta agendada com sucesso"})

        if request.method == 'PUT':
            d = request.json
            c.execute("UPDATE consultas SET status=? WHERE id=?", (d.get('status'), d.get('id')))
            conn.commit()
            return jsonify({"msg": "Status da consulta atualizado"})

        c.execute("SELECT * FROM consultas")
        consultas = []
        for row in c.fetchall():
            con = dict(row)
            con['nomePaciente'] = de(con['nomePaciente'])
            if status_type == 'concluidas':
                if con['status'] in ['Atendido', 'Cancelado']:
                    consultas.append(con)
            else:
                if con['status'] in ['Agendado', 'Confirmado']:
                    consultas.append(con)

        def sort_key(item):
            try:
                return datetime.strptime(f"{item['data']}T{item['horario']}", "%Y-%m-%dT%H:%M")
            except:
                return datetime.min

        consultas.sort(key=sort_key, reverse=(status_type == 'concluidas'))
        return jsonify(consultas)

# ==============================================================
# API DE PRONTUÁRIOS E AUDITORIA (COM CRIPTOGRAFIA LGPD)
# ==============================================================
@api.route('/prontuarios', methods=['GET', 'POST'])
def api_prontuarios():
    with get_db() as conn:
        c = conn.cursor()
        
        if request.method == 'POST':
            d = request.json
            
            colunas = [
                'pacienteId', 'nomePaciente', 'dataNascimento', 'genero', 
                'idadeAnos', 'idadeMeses', 'idadeDias', 'documento', 
                'convenioCartao', 'contatoPaciente', 'acompanhante', 'especialidade', 
                'tipoAtendimento', 'prioridade', 'registroProfissional', 
                'carimboAssinatura', 'qp', 'hda', 'hmp', 'alergias', 
                'sinalPA', 'sinalFC', 'sinalFR', 'sinalTEMP', 'sinalSATO2', 
                'estadoGeral', 'cardioResp', 'neuroOutros', 'hipotese', 
                'conduta', 'medicoCPF'
            ]
            
            valores = []
            for col in colunas:
                if col in ['pacienteId', 'medicoCPF']:
                    valores.append(d.get(col, ''))
                else:
                    valores.append(en(d.get(col, '')))
                    
            placeholders = ', '.join(['?'] * len(colunas))
            colunas_str = ', '.join(colunas)
            
            c.execute(f"INSERT INTO prontuarios ({colunas_str}) VALUES ({placeholders})", valores)
            prontuario_id = c.lastrowid 
            
            medico_cpf = d.get('medicoCPF', '')
            data_hora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            c.execute("INSERT INTO auditoria_prontuarios (usuario_cpf, prontuario_id, acao, data_hora) VALUES (?, ?, ?, ?)",
                      (medico_cpf, prontuario_id, 'Criação', data_hora))
            
            conn.commit()
            return jsonify({"msg": "Prontuário salvo com sucesso e Protegido"})

        c.execute("SELECT * FROM prontuarios ORDER BY id DESC")
        prontuarios = []
        for row in c.fetchall():
            pr = dict(row)
            for k in pr.keys():
                if k not in ['id', 'pacienteId', 'medicoCPF']:
                    pr[k] = de(pr[k])
            prontuarios.append(pr)
        return jsonify(prontuarios)

@api.route('/prontuarios/auditoria', methods=['GET', 'POST'])
def api_auditoria():
    with get_db() as conn:
        c = conn.cursor()
        
        if request.method == 'POST':
            d = request.json
            usuario_cpf = d.get('usuario_cpf')
            prontuario_id = d.get('prontuario_id')
            acao = d.get('acao', 'Visualização')
            data_hora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            
            c.execute("INSERT INTO auditoria_prontuarios (usuario_cpf, prontuario_id, acao, data_hora) VALUES (?, ?, ?, ?)",
                      (usuario_cpf, prontuario_id, acao, data_hora))
            conn.commit()
            return jsonify({"msg": "Log de auditoria registrado."})
        
        c.execute('''
            SELECT a.id, a.data_hora, a.acao, a.usuario_cpf, a.prontuario_id,
                   u.nome as nome_profissional, p.nomePaciente as nome_paciente
            FROM auditoria_prontuarios a
            LEFT JOIN usuarios u ON a.usuario_cpf = u.cpf
            LEFT JOIN prontuarios p ON a.prontuario_id = p.id
            ORDER BY a.id DESC
        ''')
        
        logs = []
        for row in c.fetchall():
            l = dict(row)
            l['nome_paciente'] = de(l['nome_paciente'])
            logs.append(l)
        return jsonify(logs)