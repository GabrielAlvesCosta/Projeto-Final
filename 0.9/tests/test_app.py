import pytest
import os
import json
import sqlite3
import app as meu_app  # Importa o módulo real da sua aplicação

# ==============================================================================
# SETUP: AMBIENTE DE TESTE ISOLADO E DESCARTÁVEL (O SEGREDO DO SUCESSO)
# ==============================================================================
@pytest.fixture
def client():
    # 1. Configura o Flask para modo de teste
    meu_app.app.config['TESTING'] = True
    
    # 2. Desvia a Base de Dados APENAS para os testes (protege o seu clinica.db real)
    TEST_DB = 'test_clinica.db'
    meu_app.DB_FILE = TEST_DB
    
    # 3. Limpa qualquer rasto se o teste anterior tiver falhado
    if os.path.exists(TEST_DB):
        try: os.remove(TEST_DB)
        except: pass
        
    # 4. Inicializa as tabelas do zero
    with meu_app.app.app_context():
        meu_app.init_db()
        
    with meu_app.app.test_client() as client:
        # 5. INJETA DADOS BASE PARA SATISFAZER AS CHAVES ESTRANGEIRAS
        # Médico Padrão
        client.post('/api/usuarios', json={
            "cpf": "11122233344", "nome": "Dr. Teste Base", "email": "base@teste.com", "senha": "123"
        })
        # Pacientes Padrão (ID 1 e ID 2)
        client.post('/api/pacientes', json={"nome": "Paciente Base 1"})
        client.post('/api/pacientes', json={"nome": "Paciente Base 2"})
        
        # Prontuário Padrão (ID 1)
        client.post('/api/prontuarios', json={
            "pacienteId": 1, "medicoCPF": "11122233344", "hipotese": "Base"
        })
        
        yield client  # <-- AQUI É ONDE CADA TESTE RODA INDIVIDUALMENTE
        
    # 6. Limpeza final: apaga a BD de testes ao terminar
    if os.path.exists(TEST_DB):
        try: os.remove(TEST_DB)
        except: pass

# ==============================================================================
# MÓDULO 1: PACIENTES E ENCRIPTAÇÃO (LGPD)
# ==============================================================================

def test_01_criar_paciente_dados_completos(client):
    res = client.post('/api/pacientes', json={
        "nome": "João Silva", "dataNasc": "1980-05-15", "genero": "Masculino", 
        "idadeAnos": "46", "idadeMeses": "2", "idadeDias": "10", 
        "documento": "123456789", "cartao": "987654", "contato": "11999999999"
    })
    assert res.status_code == 200

def test_02_criar_paciente_campos_vazios(client):
    res = client.post('/api/pacientes', json={"nome": "Maria Souza", "documento": "", "contato": ""})
    assert res.status_code == 200

def test_03_atualizar_dados_paciente(client):
    res_post = client.post('/api/pacientes', json={"nome": "Carlos Velho", "contato": "0000"})
    p_id = json.loads(res_post.data)["id"]
    res_put = client.put('/api/pacientes', json={"id": p_id, "nome": "Carlos Atualizado", "contato": "1111"})
    assert res_put.status_code == 200
    pacientes = json.loads(client.get('/api/pacientes').data)
    paciente_editado = next((p for p in pacientes if p['id'] == p_id), None)
    assert paciente_editado['nome'] == "Carlos Atualizado"

def test_04_listagem_pacientes_ordem_decrescente(client):
    client.post('/api/pacientes', json={"nome": "Paciente A"})
    client.post('/api/pacientes', json={"nome": "Paciente B"})
    pacientes = json.loads(client.get('/api/pacientes').data)
    assert pacientes[0]['nome'] == "Paciente B"

def test_05_validar_encriptacao_paciente_direto_no_banco(client):
    client.post('/api/pacientes', json={"nome": "Segredo Absoluto", "contato": "99999999"})
    conn = sqlite3.connect('test_clinica.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT nome FROM pacientes ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    conn.close()
    assert row["nome"] != "Segredo Absoluto"
    assert row["nome"].startswith("gAAAAA")

# ==============================================================================
# MÓDULO 2: CONSULTAS (AGENDAMENTOS E ESTADOS)
# ==============================================================================

def test_06_agendar_consulta_sucesso(client):
    res = client.post('/api/consultas', json={
        "pacienteId": 1, "nomePaciente": "Ana", "data": "2026-10-10", 
        "horario": "10:00", "profissional": "Dr. Teste Base", "status": "Agendado"
    })
    assert res.status_code == 200

def test_07_choque_horario_profissionais_diferentes(client):
    client.post('/api/consultas', json={"pacienteId": 1, "data": "2026-10-10", "horario": "14:00", "profissional": "Dr. A"})
    res = client.post('/api/consultas', json={"pacienteId": 2, "data": "2026-10-10", "horario": "14:00", "profissional": "Dr. B"})
    assert res.status_code == 200 

def test_08_mudar_status_consulta_confirmado(client):
    client.post('/api/consultas', json={"data": "2026-11-11", "horario": "09:00", "profissional": "Dr. Teste Base", "status": "Agendado"})
    c_id = json.loads(client.get('/api/consultas?status=ativas').data)[0]['id']
    res = client.put('/api/consultas', json={"id": c_id, "status": "Confirmado"})
    assert res.status_code == 200

def test_09_mudar_status_consulta_cancelado(client):
    client.post('/api/consultas', json={"data": "2026-11-11", "horario": "10:00", "profissional": "Dr. Teste Base", "status": "Agendado"})
    c_id = json.loads(client.get('/api/consultas?status=ativas').data)[0]['id']
    client.put('/api/consultas', json={"id": c_id, "status": "Cancelado"})
    ativas = json.loads(client.get('/api/consultas?status=ativas').data)
    assert not any(c['id'] == c_id for c in ativas)

def test_10_mudar_status_consulta_atendido(client):
    client.post('/api/consultas', json={"data": "2026-11-11", "horario": "11:00", "profissional": "Dr. Teste Base", "status": "Agendado"})
    c_id = json.loads(client.get('/api/consultas?status=ativas').data)[0]['id']
    client.put('/api/consultas', json={"id": c_id, "status": "Atendido"})
    concluidas = json.loads(client.get('/api/consultas?status=concluidas').data)
    assert any(c['id'] == c_id for c in concluidas)

def test_11_filtros_consultas_ativas(client):
    ativas = json.loads(client.get('/api/consultas?status=ativas').data)
    for c in ativas: assert c['status'] in ['Agendado', 'Confirmado']

def test_12_filtros_consultas_concluidas(client):
    concluidas = json.loads(client.get('/api/consultas?status=concluidas').data)
    for c in concluidas: assert c['status'] in ['Cancelado', 'Atendido']

# ==============================================================================
# MÓDULO 3: PRONTUÁRIOS ELETRÔNICOS (PEP)
# ==============================================================================

def test_13_criar_prontuario_completo(client):
    res = client.post('/api/prontuarios', json={
        "pacienteId": 1, "nomePaciente": "Ana", "qp": "Dor no peito", "hda": "Há 3 dias",
        "medicoCPF": "11122233344", "prioridade": "Normal"
    })
    assert res.status_code == 200

def test_14_criar_prontuario_dados_parciais(client):
    res = client.post('/api/prontuarios', json={
        "pacienteId": 1, "qp": "Retorno de rotina", "medicoCPF": "11122233344"
    })
    assert res.status_code == 200

def test_15_listagem_prontuarios_desencriptada(client):
    client.post('/api/prontuarios', json={"pacienteId": 1, "hipotese": "Diagnóstico Secreto", "medicoCPF": "11122233344"})
    prontuarios = json.loads(client.get('/api/prontuarios').data)
    assert prontuarios[0]["hipotese"] == "Diagnóstico Secreto"

def test_16_validar_encriptacao_prontuario_banco(client):
    client.post('/api/prontuarios', json={"pacienteId": 1, "qp": "Sintoma X", "medicoCPF": "11122233344"})
    conn = sqlite3.connect('test_clinica.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT qp FROM prontuarios ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    conn.close()
    assert row["qp"] != "Sintoma X"
    assert row["qp"].startswith("gAAAAA")

# ==============================================================================
# MÓDULO 4: AUDITORIA DE ACESSOS E VISUALIZAÇÕES
# ==============================================================================

def test_17_auditoria_criacao_automatica(client):
    client.post('/api/prontuarios', json={"pacienteId": 1, "medicoCPF": "11122233344"})
    logs = json.loads(client.get('/api/prontuarios/auditoria').data)
    assert logs[0]['acao'] == "Criação"
    assert logs[0]['usuario_cpf'] == "11122233344"

def test_18_auditoria_visualizacao_manual(client):
    res_post = client.post('/api/prontuarios/auditoria', json={
        "usuario_cpf": "11122233344", "prontuario_id": 1, "acao": "Visualização"
    })
    assert res_post.status_code == 200
    logs = json.loads(client.get('/api/prontuarios/auditoria').data)
    assert any(log['acao'] == "Visualização" for log in logs)

# ==============================================================================
# MÓDULO 5: TESTES AVANÇADOS E EDGE CASES (O QUE ESTAVA A FALHAR ANTES!)
# ==============================================================================

# ==============================================================================
# MÓDULO EXTRA: COBERTURA DOS TESTES 19, 20 E 21 (REGRAS E SEGURANÇA)
# ==============================================================================

def test_19_consulta_status_padrao_agendado(client):
    """Garante que se não for enviado o campo 'status' via frontend, a base de dados assume 'Agendado'."""
    client.post('/api/consultas', json={
        "pacienteId": 1, "data": "2026-12-31", "horario": "15:00", "profissional": "Dr. Teste Base"
    })
    ativas = json.loads(client.get('/api/consultas?status=ativas').data)
    # Procura a consulta específica pela data
    consulta_criada = next(c for c in ativas if c['data'] == "2026-12-31")
    assert consulta_criada['status'] == "Agendado"

def test_20_prontuario_paciente_fantasma_seguranca(client):
    """
    TESTE DE SEGURANÇA: Tentar criar um prontuário para um Paciente que NÃO existe (ID 9999).
    A Foreign Key constraint do SQLite DEVE bloquear a inserção, evitando dados órfãos.
    """
    with pytest.raises(Exception) as erro:
        client.post('/api/prontuarios', json={
            "pacienteId": 9999, "medicoCPF": "11122233344", "qp": "Teste Invasão"
        })
    assert "FOREIGN KEY" in str(erro.value) or "IntegrityError" in str(type(erro.value))

def test_21_edicao_paciente_inexistente(client):
    """Garante que tentar enviar uma edição (PUT) para um ID que não existe não bloqueia a API com Erro 500."""
    res = client.put('/api/pacientes', json={"id": 9999, "nome": "Paciente Fantasma", "contato": "0000"})
    assert res.status_code == 200 
    # O UPDATE silencioso do SQL executa, afeta 0 linhas, mas não deve deitar a aplicação abaixo.

def test_22_isolamento_atualizacao_paciente(client):
    res_a = client.post('/api/pacientes', json={"nome": "Paciente A", "documento": "111"})
    res_b = client.post('/api/pacientes', json={"nome": "Paciente B", "documento": "222"})
    client.put('/api/pacientes', json={"id": json.loads(res_a.data)["id"], "nome": "A Mod", "documento": "999"})
    pacientes = json.loads(client.get('/api/pacientes').data)
    paciente_b = next(p for p in pacientes if p['nome'] == "Paciente B")
    assert paciente_b['documento'] == "222" 

def test_23_paciente_caracteres_especiais_utf8(client):
    nome_complexo = "João Conceição ç á é í ó ú & * @ !"
    client.post('/api/pacientes', json={"nome": nome_complexo, "contato": "99"})
    paciente_inserido = json.loads(client.get('/api/pacientes').data)[0]
    assert paciente_inserido['nome'] == nome_complexo

def test_24_consultas_horarios_seguidos(client):
    client.post('/api/consultas', json={"pacienteId": 1, "data": "2026-10-15", "horario": "14:00", "profissional": "Dr. Teste Base"})
    res = client.post('/api/consultas', json={"pacienteId": 2, "data": "2026-10-15", "horario": "14:30", "profissional": "Dr. Teste Base"})
    assert res.status_code == 200 

def test_25_consultas_filtro_invalido(client):
    res = client.get('/api/consultas?status=STATUS_LOUCO')
    for c in json.loads(res.data): assert c['status'] in ['Agendado', 'Confirmado']

def test_26_reativar_consulta_cancelada(client):
    client.post('/api/consultas', json={"data": "2026-01-01", "horario": "08:00", "status": "Cancelado"})
    id_cancelada = json.loads(client.get('/api/consultas?status=concluidas').data)[0]['id']
    res = client.put('/api/consultas', json={"id": id_cancelada, "status": "Agendado"})
    assert res.status_code == 200

def test_27_prontuario_textos_longos(client):
    texto_longo = "Paciente relata dor de cabeça. " * 500
    res = client.post('/api/prontuarios', json={"pacienteId": 1, "conduta": texto_longo, "medicoCPF": "11122233344"})
    assert json.loads(client.get('/api/prontuarios').data)[0]['conduta'] == texto_longo

def test_28_ordenacao_historico_prontuarios(client):
    # CORREÇÃO: Foi adicionado o 'medicoCPF' obrigatório para satisfazer a Chave Estrangeira
    client.post('/api/prontuarios', json={"pacienteId": 1, "hipotese": "Prontuário Antigo", "medicoCPF": "11122233344"})
    client.post('/api/prontuarios', json={"pacienteId": 1, "hipotese": "Prontuário Novo", "medicoCPF": "11122233344"})
    prontuarios = json.loads(client.get('/api/prontuarios').data)
    assert prontuarios[0]['hipotese'] == "Prontuário Novo"

def test_29_auditoria_fk_invalida_seguranca(client):
    """
    CORREÇÃO: O modo Testing do Flask eleva a IntegrityError direto pro terminal. 
    Usamos o pytest.raises para 'apanhar' esse erro e provar que o banco barrou o invasor!
    """
    log_malicioso = {"usuario_cpf": "11122233344", "prontuario_id": 9999999, "acao": "Hacking"}
    
    with pytest.raises(Exception) as erro:
        client.post('/api/prontuarios/auditoria', json=log_malicioso)
        
    assert "FOREIGN KEY" in str(erro.value) or "IntegrityError" in str(type(erro.value))

def test_30_auditoria_join_desencriptacao(client):
    res_pac = client.post('/api/pacientes', json={"nome": "Mário Silva"})
    id_pac = json.loads(res_pac.data)["id"]
    client.post('/api/prontuarios', json={"pacienteId": id_pac, "nomePaciente": "Mário Silva", "medicoCPF": "11122233344"})
    
    log_recente = json.loads(client.get('/api/prontuarios/auditoria').data)[0]
    assert log_recente['nome_profissional'] == "Dr. Teste Base"
    assert log_recente['nome_paciente'] == "Mário Silva"

def test_31_integridade_nome_criptografado_cruzado(client):
    # CORREÇÃO: Foi adicionado 'pacienteId' e 'medicoCPF'
    client.post('/api/consultas', json={"nomePaciente": "Ana Cripto", "status": "Agendado"})
    client.post('/api/prontuarios', json={"nomePaciente": "Ana Cripto", "pacienteId": 1, "medicoCPF": "11122233344"})
    
    consulta = json.loads(client.get('/api/consultas?status=ativas').data)[0]
    prontuario = json.loads(client.get('/api/prontuarios').data)[0]
    assert consulta['nomePaciente'] == prontuario['nomePaciente']