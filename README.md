# 🎅 Secret Santa

Веб-приложение для организации игры "Тайный Санта" среди друзей и коллег.

## ✨ Возможности

- Создание групп для игры
- Приглашение участников по ссылке
- Автоматическая жеребьёвка (кто кому дарит подарок)
- Установка бюджета и даты обмена

## 🛠 Технологии

| Компонент | Технологии |
|-----------|------------|
| **Frontend** | React 18, TypeScript, Material-UI |
| **Backend** | Go 1.21, Gin, GORM |
| **Database** | PostgreSQL 15 |
| **Deploy** | AWS (Lightsail + RDS + S3 + CloudFront) |

## 📁 Структура проекта

```
secret_santa/
├── client/                 # React приложение
│   ├── src/
│   │   ├── pages/          # Страницы (Login, Dashboard, GroupDetail)
│   │   ├── components/     # Компоненты
│   │   ├── services/       # API клиент
│   │   └── context/        # Auth контекст
│   ├── Dockerfile
│   └── package.json
│
├── server/                 # Go REST API
│   ├── cmd/api/            # Entry point
│   ├── internal/
│   │   ├── handlers/       # HTTP handlers
│   │   ├── models/         # GORM models
│   │   ├── middleware/     # JWT auth
│   │   └── database/       # DB connection
│   ├── Dockerfile
│   └── go.mod
│
├── infrastructure/         # Terraform для AWS
│   └── terraform/
│
├── docker-compose.yml      # Локальная разработка
├── DEPLOY.md               # Инструкция по деплою
└── README.md
```

## 🚀 Быстрый старт

### Требования

- Docker
- Go 1.21+
- Node.js 18+

### Локальная разработка (с hot reload)

```bash
# 1. Запустить PostgreSQL
docker-compose up -d

# 2. Запустить сервер (в отдельном терминале)
cd server
go install github.com/air-verse/air@latest
air

# 3. Запустить клиент (в отдельном терминале)
cd client
npm install
npm start
```

Приложение будет доступно:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8080
- **API Health:** http://localhost:8080/health

### Остановка

```bash
docker-compose down
```

## 📡 API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| GET | `/api/auth/me` | Текущий пользователь |
| GET | `/api/groups` | Мои группы |
| POST | `/api/groups` | Создать группу |
| GET | `/api/groups/:id` | Получить группу |
| POST | `/api/groups/:id/join` | Присоединиться |
| POST | `/api/groups/:id/draw` | Провести жеребьёвку |
| GET | `/api/groups/:id/my-assignment` | Кому я дарю подарок |

## ☁️ Деплой на AWS

Подробная инструкция в [DEPLOY.md](./DEPLOY.md).

**Стоимость:** ~$5-6/мес (Lightsail $5 + RDS Free Tier + S3/CloudFront ~$1)

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Отредактируйте terraform.tfvars
terraform init && terraform apply
```

## 🔧 Переменные окружения

Сервер использует следующие переменные (см. `server/.env`):

```env
PORT=8080
ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=secret_santa
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:3000
```

## 📝 License

MIT
