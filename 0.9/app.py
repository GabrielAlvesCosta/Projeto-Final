from flask import Flask

# Importa as funções de inicialização do models.py
from models import init_db

# Importa o Blueprint contendo todas as rotas da API do controllers.py
from controllers import api

# ==============================================================
# INICIALIZAÇÃO DO FLASK
# ==============================================================
app = Flask(__name__, static_folder='.', static_url_path='')

# Inicializa o banco de dados e as tabelas
init_db()

# Registra as rotas importadas. O prefixo '/api' será adicionado a todas elas.
app.register_blueprint(api, url_prefix='/api')

# ==============================================================
# ROTAS ESTÁTICAS (FRONTEND)
# ==============================================================
@app.route('/')
def index():
    return app.send_static_file('dashboard.html')

@app.route('/<path:path>')
def serve_files(path):
    return app.send_static_file(path)

# ==============================================================
# INICIA O SERVIDOR
# ==============================================================
if __name__ == '__main__':
    app.run(debug=True, port=5000)