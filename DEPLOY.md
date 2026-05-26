# Deploy do Cris Artesanatos Catalogo

Este guia publica o projeto com:

- Frontend React/Vite na Netlify.
- API Node/Express no Render.
- Banco MySQL compativel no TiDB Cloud Serverless.

## 1. Publicar o codigo no GitHub

Crie um repositorio no GitHub e envie este projeto.

```bash
git init
git add .
git commit -m "primeira versao para deploy"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

## 2. Criar o banco no TiDB Cloud

1. Acesse `https://tidbcloud.com`.
2. Crie um cluster Serverless.
3. Abra a area de conexao do cluster.
4. Copie estes dados:
   - host
   - port
   - user
   - password
   - database
5. Mantenha SSL habilitado.

No TiDB, normalmente o deploy usa:

```text
MYSQL_SSL=true
```

## 3. Criar a API no Render

1. Acesse `https://render.com`.
2. Clique em `New` > `Web Service`.
3. Conecte o repositorio do GitHub.
4. Configure:

```text
Name: cris-artesanatos-api
Runtime: Node
Branch: main
Build Command: npm install && npm run build --workspace=server
Start Command: npm run start --workspace=server
Health Check Path: /api/health
```

5. Em `Environment Variables`, adicione:

```text
MYSQL_HOST=host-do-tidb
MYSQL_PORT=porta-do-tidb
MYSQL_USER=usuario-do-tidb
MYSQL_PASSWORD=senha-do-tidb
MYSQL_DATABASE=database-do-tidb
MYSQL_SSL=true
JWT_SECRET=crie-uma-string-grande-e-secreta
ADMIN_NAME=Cris Artesanatos
ADMIN_EMAIL=seu-email-admin
ADMIN_PASSWORD=sua-senha-admin
```

Nao precisa configurar `PORT`; o Render fornece essa variavel automaticamente.

6. Publique o servico e copie a URL gerada, por exemplo:

```text
https://cris-artesanatos-api.onrender.com
```

## 4. Preparar tabelas e dados iniciais no banco de producao

Com os mesmos dados do TiDB, rode localmente:

```bash
MYSQL_HOST=host-do-tidb \
MYSQL_PORT=porta-do-tidb \
MYSQL_USER=usuario-do-tidb \
MYSQL_PASSWORD='senha-do-tidb' \
MYSQL_DATABASE=database-do-tidb \
MYSQL_SSL=true \
ADMIN_NAME='Cris Artesanatos' \
ADMIN_EMAIL='seu-email-admin' \
ADMIN_PASSWORD='sua-senha-admin' \
JWT_SECRET='mesmo-segredo-do-render' \
npm run db:setup
```

Esse comando cria as tabelas e o usuario administrador no banco remoto.

## 5. Criar o frontend na Netlify

1. Acesse `https://netlify.com`.
2. Clique em `Add new site` > `Import an existing project`.
3. Conecte o mesmo repositorio do GitHub.
4. A Netlify deve ler o arquivo `netlify.toml`. Se precisar configurar manualmente:

```text
Build command: npm run build --workspace=client
Publish directory: client/dist
```

5. Em `Environment variables`, adicione:

```text
VITE_API_BASE=https://cris-artesanatos-api.onrender.com
```

Use a URL real da sua API no Render, sem `/api` no final.

6. Publique o site.

## 6. Testar producao

Depois dos deploys:

1. Abra a URL da Netlify.
2. Teste o catalogo publico.
3. Abra `/admin`.
4. Entre com o e-mail e senha definidos no `db:setup`.
5. Cadastre ou edite um produto.
6. Confira se o produto aparece no catalogo.

## Observacoes importantes

- No plano gratuito do Render, a API pode dormir apos alguns minutos sem acesso. O primeiro acesso depois disso pode demorar.
- O projeto salva imagens por URL. Para upload real de imagens, sera necessario integrar um storage como Cloudinary, S3, R2 ou Netlify Blob.
- Se alterar variaveis `VITE_*` na Netlify, faca um novo deploy do frontend.
- Se alterar credenciais do admin e rodar `npm run db:setup` de novo, a senha do admin sera atualizada no banco.
