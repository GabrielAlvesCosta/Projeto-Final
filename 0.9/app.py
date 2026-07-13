from flask import Flask, request, jsonify
import sqlite3
import os
from datetime import datetime

# ==============================================================
# CONFIGURAÇÃO DE CRIPTOGRAFIA (LGPD)
# ==============================================================
try:
    from cryptography.fernet import Fernet
except ImportError:
    print("ERRO FATAL: Biblioteca 'cryptography' não encontrada.")
    print("Abra o terminal e instale executando: pip install cryptography")
    exit()

KEY_FILE = 'lgpd_secret.key'
# Gera a chave mestra se ela ainda não existir na pasta
if not os.path.exists(KEY_FILE):
    with open(KEY_FILE, 'wb') as f:
        f.write(Fernet.generate_key())

with open(KEY_FILE, 'rb') as f:
    FERNET_KEY = f.read()

cipher = Fernet(FERNET_KEY)

# Função para Criptografar (Embaralhar)
def en(value):
    if value is None or str(value).strip() == '': return value
    return cipher.encrypt(str(value).encode('utf-8')).decode('utf-8')

# Função para Descriptografar (Desembaralhar)
def de(value):
    if value is None or str(value).strip() == '': return value
    try:
        return cipher.decrypt(str(value).encode('utf-8')).decode('utf-8')
    except:
        return value # Retorna o original caso sejam dados antigos (não criptografados)

# ==============================================================
# INICIALIZAÇÃO DO FLASK E BANCO DE DADOS
# ==============================================================
app = Flask(__name__, static_folder='.', static_url_path='')
DB_FILE = 'clinica.db'

def get_db():
    conn = sqlite3.connect(DB_FILE)
    # Ativa a verificação e a obrigatoriedade das Chaves Estrangeiras (FOREIGN KEYS) no SQLite
    conn.execute("PRAGMA foreign_keys = ON") 
    # Permite retornar os resultados do banco de dados como Dicionários
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
        
        # 2. Tabela de Pacientes 
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
                cartao TEXT,
                contato TEXT
            )
        ''')
        
        # 3. Tabela de Consultas 
        c.execute('''
            CREATE TABLE IF NOT EXISTS consultas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pacienteId INTEGER,
                nomePaciente TEXT,
                data TEXT,
                horario TEXT,
                profissional TEXT,
                status TEXT,
                FOREIGN KEY (pacienteId) REFERENCES pacientes(id)
            )
        ''')
        
        # 4. Tabela de Prontuários PEP 
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
                contatoPaciente TEXT, 
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
                medicoCPF TEXT,
                FOREIGN KEY (pacienteId) REFERENCES pacientes(id),
                FOREIGN KEY (medicoCPF) REFERENCES usuarios(cpf)
            )
        ''')

        # 5. Tabela de LOG DE AUDITORIA DE ACESSOS E CRIAÇÃO
        c.execute('''
            CREATE TABLE IF NOT EXISTS auditoria_prontuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_cpf TEXT,
                prontuario_id INTEGER,
                acao TEXT,
                data_hora TEXT,
                FOREIGN KEY (usuario_cpf) REFERENCES usuarios(cpf),
                FOREIGN KEY (prontuario_id) REFERENCES prontuarios(id)
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
# API DE USUÁRIOS / PROFISSIONAIS
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
# API DE PACIENTES (COM CRIPTOGRAFIA LGPD)
# ==============================================================
@app.route('/api/pacientes', methods=['GET', 'POST', 'PUT'])
def api_pacientes():
    with get_db() as conn:
        c = conn.cursor()
        
        if request.method == 'POST':
            d = request.json
            # Criptografa os dados antes de inserir no banco
            c.execute('''INSERT INTO pacientes (nome, dataNasc, genero, idadeAnos, idadeMeses, idadeDias, documento, cartao, contato)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                      (en(d.get('nome')), en(d.get('dataNasc')), en(d.get('genero')), en(d.get('idadeAnos')), 
                       en(d.get('idadeMeses')), en(d.get('idadeDias')), en(d.get('documento')), en(d.get('cartao')), en(d.get('contato'))))
            conn.commit()
            return jsonify({"msg": "Paciente cadastrado com sucesso", "id": c.lastrowid})
            
        if request.method == 'PUT':
            d = request.json
            # Criptografa os dados antes de atualizar
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
            # Descriptografa os dados para a interface
            for k in p.keys():
                if k != 'id': p[k] = de(p[k])
            pacientes.append(p)
        return jsonify(pacientes)

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
            
            c.execute("SELECT id FROM consultas WHERE profissional=? AND data=? AND horario=? AND status != 'Cancelado'", 
                      (prof, data_req, hora_req))
            if c.fetchone():
                return jsonify({"error": f"O(a) profissional {prof} já tem um agendamento para {data_req} às {hora_req}."}), 400
            
            # Criptografa o nome do paciente na consulta
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
            # Descriptografa o nome do paciente
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
@app.route('/api/prontuarios', methods=['GET', 'POST'])
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
                # Não criptografa chaves estrangeiras (senão o banco quebra)
                if col in ['pacienteId', 'medicoCPF']:
                    valores.append(d.get(col, ''))
                else:
                    # Criptografa toda a evolução clínica e dados pessoais
                    valores.append(en(d.get(col, '')))
                    
            placeholders = ', '.join(['?'] * len(colunas))
            colunas_str = ', '.join(colunas)
            
            # Insere o prontuário criptografado
            c.execute(f"INSERT INTO prontuarios ({colunas_str}) VALUES ({placeholders})", valores)
            prontuario_id = c.lastrowid 
            
            # --- SALVA LOG DE AUDITORIA AUTOMÁTICO PARA A CRIAÇÃO ---
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
            # Descriptografa tudo exceto as chaves de relacionamento
            for k in pr.keys():
                if k not in ['id', 'pacienteId', 'medicoCPF']:
                    pr[k] = de(pr[k])
            prontuarios.append(pr)
        return jsonify(prontuarios)

@app.route('/api/prontuarios/auditoria', methods=['GET', 'POST'])
def api_auditoria():
    with get_db() as conn:
        c = conn.cursor()
        
        # POST: Registra uma Visualização vinda do Frontend
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
        
        # GET: Retorna a lista de logs cruzando os nomes
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
            # Descriptografa o nome do paciente para aparecer certinho no LOG
            l['nome_paciente'] = de(l['nome_paciente'])
            logs.append(l)
        return jsonify(logs)

if __name__ == '__main__':
    app.run(debug=True, port=5000)