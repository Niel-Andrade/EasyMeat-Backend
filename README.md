# Easy Meat — Back-End

API REST da plataforma **Easy Meat**, um marketplace B2B para comercialização de carnes que conecta produtores (vendedores) e compradores institucionais.

> Este é o back-end da aplicação. Ele **deve estar rodando antes do front-end** (`easy-meat-front`).

---

## 🚀 Stack

- **Node.js** + **Express 4** (API REST)
- **PostgreSQL** com **Sequelize 6** (ORM)
- **JWT** (`jsonwebtoken`) salvo em **cookie httpOnly** (autenticação)
- **bcrypt** (hash de senhas)
- **multer** (upload de imagens dos anúncios)
- **Cloudinary** (opcional — upload de imagens em nuvem)
- **express-validator** (validação de requisições)
- **nodemon** (desenvolvimento, com reload automático)

---

## 📁 Estrutura

```
src/
├── api/          Rotas e controllers (auth, anuncio, banner, usuario, admin)
├── config/       Conexão com banco (Sequelize), variáveis de ambiente, Cloudinary
├── middleware/   Autenticação JWT, upload de imagens (Multer)
├── models/       Models Sequelize (usuario, anuncio, banner, etc.)
├── services/     Regras de negócio
└── app.js        Configuração do Express e inicialização do servidor
```

---

## 🧰 Pré-requisitos (primeira vez)

| Ferramenta | Versão | Verificação |
|---|---|---|
| **Node.js** | 18 ou superior | `node -v` |
| **npm** | 9 ou superior (vem com o Node) | `npm -v` |
| **PostgreSQL** | 14 ou superior, serviço em execução | `psql --version` |

---

## ⚙️ Instalação (primeira vez) — passo a passo

### 1. Clonar o repositório e entrar na pasta

```bash
git clone <url-do-repositorio>
cd easy-meat-backend
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Criar o banco de dados

Com o PostgreSQL rodando, crie o banco (as **tabelas não precisam ser criadas à mão** — o back-end as gera automaticamente ao iniciar, via `sequelize.sync()`):

```sql
CREATE DATABASE easy_meat;
```

> Você pode rodar isso no `psql`, no pgAdmin ou no painel do seu SGBD.

### 4. Configurar as variáveis de ambiente

Copie o arquivo de exemplo e crie o seu `.env`:

```bash
# Windows (cmd)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

Abra o `.env` e **ajuste pelo menos a senha do PostgreSQL**. Conteúdo do `.env.example`:

```env
PORTA=4000
NODE_ENV=development
API_URL=http://localhost:4000
CLIENTE_URL=http://localhost:5173
JWT_SECRET=troque-esta-chave
JWT_TEMPO=7d
JWT_COOKIE_NOME=easymeat_token
BCRYPT_SALT=10
ROTAS_PUBLICAS=POST:/auth/register,POST:/auth/login,POST:/auth/logout,POST:/auth/recuperar-senha,POST:/auth/redefinir-senha,GET:/anuncios,GET:/anuncios/*,GET:/anuncios/destaques,GET:/banners,GET:/uploads/*,GET:/health
DB_HOST=localhost
DB_PORT=5432
DB_NAME=easy_meat
DB_USER=postgres
DB_PASSWORD=postgres
DB_DIALECT=postgres
DB_LOGGING=false
DEFAULT_ADMIN_NOME=Administrador Easy Meat
DEFAULT_ADMIN_EMAIL=admin@easymeat.com
DEFAULT_ADMIN_SENHA=Admin@123
DEFAULT_ADMIN_TELEFONE=11999999999
DEFAULT_ADMIN_CIDADE=Sao Paulo
DEFAULT_ADMIN_ESTADO=SP
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
UPLOAD_LIMITE_MB=8
```

**Variáveis que você precisa ajustar:**

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DB_PASSWORD` | **Sim** | Senha do usuário `postgres` do **seu** PostgreSQL (no exemplo acima vem `postgres` — troque pela sua) |
| `DB_USER` | Se necessário | Usuário do PostgreSQL (padrão: `postgres`) |
| `DB_NAME` | Se necessário | Nome do banco criado no passo 3 (padrão: `easy_meat`) |
| `JWT_SECRET` | Em produção | Troque por uma chave secreta forte |
| `CLOUDINARY_*` | Opcional | Credenciais para upload de imagens em nuvem; sem elas, o upload usa a pasta local `uploads/` |

### 5. Rodar o projeto

```bash
npm run dev
```

✅ Se der certo, o terminal exibirá:

```
Easy Meat API rodando na porta 4000
```

No primeiro start, automaticamente o back-end:

1. Conecta ao PostgreSQL (`sequelize.authenticate()`);
2. **Cria todas as tabelas** (`sequelize.sync()`);
3. **Cria o usuário admin padrão** (com os dados de `DEFAULT_ADMIN_*` do `.env`).

### 6. Credenciais do admin padrão

Disponíveis para login na aplicação após o primeiro start:

- **E-mail:** `admin@easymeat.com` (conforme `DEFAULT_ADMIN_EMAIL`)
- **Senha:** `Admin@123` (conforme `DEFAULT_ADMIN_SENHA`)

---

## 📜 Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia a API com **nodemon** (reload automático) — modo desenvolvimento |
| `npm start` | Inicia a API sem reload — modo produção |

A API sobe na porta definida em `PORTA` (padrão: **4000**) → `http://localhost:4000`

---

## 🔗 Endpoints principais

Rotas públicas (não exigem login, conforme `ROTAS_PUBLICAS` do `.env`):

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- `GET /anuncios`, `GET /anuncios/destaques` (listagem e destaques)
- `GET /banners`
- `GET /uploads/*` (imagens servidas estaticamente)
- `GET /health`

As demais rotas (criar/editar anúncios, perfil, área de admin) exigem autenticação via cookie httpOnly (`easymeat_token`).

---

## 🔗 Conexão com o front-end

- O front-end (`easy-meat-front`) faz chamadas para `http://localhost:4000` (configurado na variável `VITE_API_URL` do front).
- O CORS deste back-end libera **apenas** a origem `CLIENTE_URL` — mantenha `CLIENTE_URL=http://localhost:5173` para o front funcionar localmente.
- A autenticação usa cookie httpOnly: o front envia `credentials: "include"` e o back valida o token JWT do cookie em cada requisição.

### Ordem de inicialização

1. **PostgreSQL** rodando
2. **Back-end** (este projeto): `npm run dev` → porta **4000**
3. **Front-end**: `npm run dev` → porta **5173**

---

## 🩺 Solução de problemas

| Problema | Causa provável | Solução |
|---|---|---|
| `Erro ao iniciar a API` no terminal | PostgreSQL não está rodando, ou credenciais erradas no `.env` | Verifique o serviço do PostgreSQL e revise `DB_USER` / `DB_PASSWORD` / `DB_NAME` |
| `database "easy_meat" does not exist` | Banco não foi criado | Rode `CREATE DATABASE easy_meat;` (passo 3) |
| `password authentication failed for user "postgres"` | Senha no `.env` diferente da real | Ajuste `DB_PASSWORD` no `.env` e reinicie |
| Front não carrega dados / erro de CORS | `CLIENTE_URL` não bate com a porta do front | Mantenha `CLIENTE_URL=http://localhost:5173` |
| Porta 4000 ocupada | Outro processo usando a porta | Encerre o processo ou altere `PORTA` no `.env` (e `VITE_API_URL` no front) |
| Upload de imagem falha | Cloudinary sem credenciais configuradas | Preencha `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` — ou use o upload local (`uploads/`) |
| `EADDRINUSE` | Porta em uso | Veja "Porta 4000 ocupada" acima |

---

## 👤 Autor / Projeto

Projeto Easy Meat — plataforma B2B de comercialização de carnes (agronegócio + tecnologia).
 Autores: José Nataniel e Ryan Victor