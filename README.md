# Projeto Final

## Visão Geral
Este projeto é uma aplicação web simples para cadastro e autenticação de usuários, com diferenciação entre usuários comuns e administradores. O sistema permite:

- cadastrar novos usuários
- realizar login
- redirecionar usuários comuns para uma página de teste
- redirecionar administradores para a área de usuários
- controlar o acesso por sessão

## Tecnologias Utilizadas
- Python
- Flask
- SQLite
- HTML/CSS/JavaScript
- Pytest

## Estrutura do Projeto

```text
login_projeto_final/
├── app.py
├── controllers/
│   └── auth_controller.py
├── database/
│   └── fake_db.py
├── models/
│   └── usuario.py
├── Static/
│   ├── login.css
│   ├── style.css
│   └── js/
├── templates/
│   ├── cadastro.html
│   ├── configuracoes.html
│   ├── home.html
│   ├── login.html
│   ├── teste.html
│   └── usuarios.html
├── test/
│   └── test_auth.py
└── README.md
```

## Funcionalidades

### Cadastro
O fluxo de cadastro valida os campos obrigatórios e impede cadastros duplicados por e-mail ou CRM/COREM.

### Login
O login autentica o usuário com e-mail ou CRM/COREM e senha. Com base no valor de administrador, o sistema realiza o redirecionamento correto:

- administrador → rota /usuarios
- usuário comum → rota /teste

### Sessões
A aplicação utiliza sessões do Flask para garantir que apenas usuários autenticados tenham acesso a determinadas páginas.

## Como Executar

1. Entre na pasta do projeto:
   ```bash
   cd login_projeto_final
   ```

2. Ative o ambiente virtual:
   ```bash
   .venv\Scripts\activate
   ```

3. Execute a aplicação:
   ```bash
   python app.py
   ```

4. Acesse no navegador:
   ```text
   http://127.0.0.1:5001
   ```

## Testes Automatizados
Os testes foram implementados com Pytest para validar os principais fluxos da aplicação.

### Arquivo de testes
- [test/test_auth.py](test/test_auth.py)

### Casos cobertos
- redirecionamento inicial para cadastro
- cadastro com dados válidos
- cadastro com campos vazios
- login de usuário comum
- login de administrador
- acesso sem autenticação

## Como Executar os Testes

```bash
python -m pytest -q test/test_auth.py
```

## Observações
A aplicação utiliza um banco SQLite local para armazenar os usuários. Em ambiente de teste, o projeto foi preparado para utilizar um banco temporário, evitando conflitos com o banco principal.
