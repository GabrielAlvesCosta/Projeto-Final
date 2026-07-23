import sqlite3
import os
import hashlib
import hmac
from cryptography.fernet import Fernet

# Configuração das chaves de Criptografia LGPD
KEY_FILE = 'lgpd_secret.key'
if not os.path.exists(KEY_FILE):
    with open(KEY_FILE, 'wb') as f:
        f.write(Fernet.generate_key())

with open(KEY_FILE, 'rb') as f:
    FERNET_KEY = f.read()

cipher = Fernet(FERNET_KEY)
HMAC_KEY = hashlib.sha256(FERNET_KEY).digest()

# Funções de normalização e Criptografia
def normalize_sensitive(value):
    if value is None:
        return ''
    return str(value).strip()

def crm_coren_tag(value):
    normalized = normalize_sensitive(value).lower()
    if normalized == '':
        return None
    return hmac.new(HMAC_KEY, normalized.encode('utf-8'), hashlib.sha256).hexdigest()

def en(value):
    if value is None or str(value).strip() == '': return value
    return cipher.encrypt(str(value).encode('utf-8')).decode('utf-8')

def de(value):
    if value is None or str(value).strip() == '': return value
    try: return cipher.decrypt(str(value).encode('utf-8')).decode('utf-8')
    except: return value

DB_FILE = 'clinica.db'

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.execute("PRAGMA foreign_keys = ON") 
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        c = conn.cursor()
        
        # TABELA DEFINITIVA DE USUÁRIOS
        c.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT,
                email TEXT UNIQUE,
                cargo TEXT,
                crm_coren TEXT,
                crm_coren_tag TEXT UNIQUE,
                senha TEXT,
                admin TEXT DEFAULT 'nao',
                assinatura TEXT DEFAULT ''
            )
        ''')
        
        # Garante que o campo de tag sensível existe e faz a migração dos dados se necessário
        c.execute('PRAGMA table_info(usuarios)')
        existing_columns = [row[1] for row in c.fetchall()]
        if 'crm_coren_tag' not in existing_columns:
            c.execute('ALTER TABLE usuarios ADD COLUMN crm_coren_tag TEXT')
        c.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_crm_coren_tag ON usuarios(crm_coren_tag)')

        c.execute('SELECT id, crm_coren FROM usuarios')
        for usuario_id, crm_val in c.fetchall():
            if crm_val is None or str(crm_val).strip() == '':
                continue
            raw = str(crm_val).strip()
            try:
                raw_decrypted = cipher.decrypt(raw.encode('utf-8')).decode('utf-8')
            except Exception:
                raw_decrypted = raw
                c.execute('UPDATE usuarios SET crm_coren = ? WHERE id = ?', (en(raw_decrypted), usuario_id))
            tag = crm_coren_tag(raw_decrypted)
            if tag:
                c.execute('UPDATE usuarios SET crm_coren_tag = ? WHERE id = ?', (tag, usuario_id))
        
        # TABELAS CLÍNICAS (Ligadas ao ID do Usuário)
        c.execute('''
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
        
        # Correção LGPD: Utilização do medicoId (ID) em vez do CRM/COREN puro para evitar falha no relacionamento
        c.execute('''
            CREATE TABLE IF NOT EXISTS consultas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pacienteId INTEGER, nomePaciente TEXT, data TEXT, horario TEXT,
                medicoId INTEGER, status TEXT,
                FOREIGN KEY (pacienteId) REFERENCES pacientes(id),
                FOREIGN KEY (medicoId) REFERENCES usuarios(id)
            )
        ''')
        
        # Mesclado: Possui idadeAnos, idadeMeses, idadeDias (Remoto) + peso e altura (Local)
        c.execute('''
            CREATE TABLE IF NOT EXISTS prontuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pacienteId INTEGER, nomePaciente TEXT, dataNascimento TEXT, genero TEXT,
                idadeAnos TEXT, idadeMeses TEXT, idadeDias TEXT,
                documento TEXT, convenioCartao TEXT, contatoPaciente TEXT, acompanhante TEXT,
                especialidade TEXT, tipoAtendimento TEXT, prioridade TEXT,
                registroProfissional TEXT, carimboAssinatura TEXT, qp TEXT, hda TEXT, hmp TEXT, alergias TEXT,
                sinalPA TEXT, sinalFC TEXT, sinalFR TEXT, sinalTEMP TEXT, sinalSATO2 TEXT,
                peso TEXT, altura TEXT,
                estadoGeral TEXT, cardioResp TEXT, neuroOutros TEXT, hipotese TEXT, conduta TEXT,
                medicoId INTEGER,
                FOREIGN KEY (pacienteId) REFERENCES pacientes(id),
                FOREIGN KEY (medicoId) REFERENCES usuarios(id)
            )
        ''')

        # Mesclado: Nome e campos originais da sua versão, utilizando usuario_id como chave de segurança
        c.execute('''
            CREATE TABLE IF NOT EXISTS auditoria (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data_hora TEXT,
                usuario_id INTEGER,
                nome_profissional TEXT,
                crm_coren TEXT,
                acao TEXT,
                prontuario_id INTEGER,
                nome_paciente TEXT,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
                FOREIGN KEY (prontuario_id) REFERENCES prontuarios(id)
            )
        ''')
        conn.commit()