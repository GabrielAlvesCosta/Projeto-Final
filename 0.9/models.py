import sqlite3
import os

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
# CONFIGURAÇÃO DO BANCO DE DADOS
# ==============================================================
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