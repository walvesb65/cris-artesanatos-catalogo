# Cris Artesanatos Catalogo

Catalogo mobile-first para loja virtual de artesanato, com vitrine publica, painel administrativo, API Node.js e banco MySQL.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Banco: MySQL
- Admin: login simples com JWT

## Deploy

O passo a passo de publicacao esta em [DEPLOY.md](./DEPLOY.md).

## Como rodar

1. Instale dependencias:

```bash
npm install
```

2. Copie as variaveis de ambiente:

```bash
cp .env.example .env
```

3. Suba o MySQL:

```bash
docker compose up -d mysql
```

4. Crie tabelas e dados iniciais:

```bash
npm run db:setup
```

5. Rode API e frontend:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:3333/api`

Painel admin: `http://localhost:5173/admin`

## Erro de porta em uso

Se aparecer `EADDRINUSE` na porta `3333`, ja existe uma API rodando. Encerre o terminal anterior com `Ctrl+C` ou localize o processo:

```bash
ss -ltnp '( sport = :3333 or sport = :5173 )'
```

Depois finalize o PID mostrado no resultado:

```bash
kill <PID>
```

Se a porta `5173` estiver ocupada, o Vite pode abrir o frontend em outra porta, como `5174`. Nesse caso acesse a URL exibida no terminal.

Credenciais iniciais configuradas no `.env.example`:

- E-mail: `admin@crisartesanatos.local`
- Senha: `admin123`

## O que o administrador edita

- Produtos: nome, descricao, preco, categoria, foto, destaque, status e visibilidade.
- Ofertas: titulo, descricao, selo de desconto, imagem, periodo e visibilidade.
- Layout/conteudo: nome da loja, textos principais, historia em "Quem somos", WhatsApp, redes sociais, e-mail, endereco/atendimento, horario, texto do rodape, logo, imagem de fundo e cores.
