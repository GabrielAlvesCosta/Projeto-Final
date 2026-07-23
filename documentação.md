# Documentação de Criptografia do Projeto

## O que foi implementado

### 1. Criptografia do CRM/COREN
- O campo `crm_coren` dos usuários é criptografado antes de ser salvo no banco de dados.
- Usa `cryptography.fernet` com a chave armazenada em `lgpd_secret.key`.
- A função `en()` em `models.py` converte o valor em texto para bytes, criptografa e salva como texto no banco.
- A função `de()` em `models.py` descriptografa o valor quando ele precisa ser exibido.

### 2. Tag determinística para CRM/COREN
- O valor do CRM/COREN ainda pode ser pesquisado de forma segura.
- O sistema gera uma tag HMAC (`crm_coren_tag`) em `models.py` usando `HMAC_KEY` derivada da chave Fernet.
- Essa tag é armazenada no banco para permitir buscas e validação de duplicidade sem expor o CRM/COREN.

### 3. Hash da senha
- As senhas não são criptografadas reversivelmente.
- A senha do usuário é hashada com `werkzeug.security.generate_password_hash(...)` em `usuario.py`.
- Na autenticação, usa-se `check_password_hash(...)`.

### 4. Criptografia da assinatura digital
- O arquivo de assinatura enviado pelo usuário é lido em binário durante o upload.
- Este conteúdo binário é criptografado com `cipher.encrypt(data)` em `auth_controller.py`.
- O resultado criptografado é salvo no arquivo físico em `Static/uploads/<nome_do_arquivo>`.
- No banco de dados, o campo `assinatura` guarda apenas o nome do arquivo, não o conteúdo.

### 5. Rota segura para exibir assinatura
- A rota `/assinatura/<filename>` em `app.py` lê o arquivo criptografado do disco.
- Em seguida, usa `cipher.decrypt(...)` para descriptografar os bytes.
- Retorna a imagem descriptografada para o navegador com o tipo MIME correto.
- Isso protege o arquivo na pasta `Static/uploads` e evita exposição direta via URL estática.

## Arquivos principais envolvidos
- `models.py`
  - `cipher`, `en()`, `de()`, `crm_coren_tag()`
  - `init_db()` cria a coluna `crm_coren_tag` e migra dados antigos.
- `usuario.py`
  - `salvar()`, `atualizar()`, `atualizar_perfil()` salvam a assinatura e o CRM/COREN criptografados.
  - `autenticar()` lê o usuário e descriptografa `crm_coren` para uso interno.
- `auth_controller.py`
  - Upload de assinatura em `cadastro()`, `editar_usuario_post()`, `perfil()`.
- `app.py`
  - Rota `/assinatura/<filename>` descriptografa arquivo antes de servir.

## Como funciona na prática
1. Usuário faz cadastro ou edita perfil com imagem de assinatura.
2. O sistema grava `assinatura` como nome do arquivo no banco.
3. O arquivo real é criptografado e salvo em `Static/uploads`.
4. Para mostrar a assinatura, a aplicação descriptografa o arquivo e entrega a imagem.

## Observação importante
- O campo `assinatura` no banco não contém a imagem criptografada.
- Ele contém apenas o nome do arquivo. O conteúdo criptografado está no arquivo físico.
- Se quiser armazenar a assinatura criptografada diretamente no banco, o código precisaria ser alterado para salvar os bytes criptografados em um campo BLOB ou TEXT e não usar o disco para armazenamento final.
