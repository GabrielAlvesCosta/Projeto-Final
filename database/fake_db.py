import sqlite3
import os


class Database:
    def __init__(self, db_path=None):
        base_dir = os.path.dirname(__file__)
        self.db_path = db_path or os.path.join(base_dir, "database.db")

    def conectar(self):
        return sqlite3.connect(self.db_path, timeout=10, check_same_thread=False)

    def criar_tabela(self):
        with self.conectar() as conn:
            conn.execute(
                '''
                CREATE TABLE IF NOT EXISTS usuarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT,
                    email TEXT UNIQUE,
                    cargo TEXT,
                    crm_coren TEXT,
                    senha TEXT,
                    admin TEXT DEFAULT 'nao'
                )
                '''
            )
            columns = [row[1] for row in conn.execute("PRAGMA table_info(usuarios)")]
            if "admin" not in columns:
                conn.execute("ALTER TABLE usuarios ADD COLUMN admin TEXT DEFAULT 'nao'")
