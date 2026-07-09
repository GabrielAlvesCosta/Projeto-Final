import os
import tempfile
import app as app_module
import database.fake_db as fake_db_module
import models.usuario as usuario_module

with tempfile.TemporaryDirectory() as tmpdir:
    db_path = os.path.join(tmpdir, 'test.db')

    class TempDatabase(fake_db_module.Database):
        def __init__(self, db_path=None):
            self.db_path = db_path or os.path.join(tmpdir, 'test.db')

    fake_db_module.Database = TempDatabase
    usuario_module.Database = TempDatabase
    app_module.Database = TempDatabase
    app_module.fake_db = TempDatabase()
    app_module.fake_db.criar_tabela()

    client = app_module.app.test_client()
    response = client.post('/cadastro', data={'nome':'Maria','email':'maria@email.com','cargo':'Enfermeira','crm_coren':'CR123','senha':'123456','admin':'nao'}, follow_redirects=False)
    print('status', response.status_code)
    print('location', response.headers.get('Location'))
    print(response.data.decode('utf-8', 'ignore'))
    
    # Esse arquivo serve para verificar se o cadastro está funcionando e qual resposta a aplicação está retornando sem mexer no banco real do projeto.
