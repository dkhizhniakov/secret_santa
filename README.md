# 🎅 Secret Santa

Веб-приложение для организации игры "Тайный Санта" среди друзей и коллег.

## ✨ Возможности

- 🎁 Создание розыгрышей с названием, описанием и аватаром
- 🔗 Приглашение участников по ссылке
- 🎲 Автоматическая жеребьёвка (кто кому дарит подарок)
- 💰 Установка бюджета подарка (мин/макс + валюта)
- 📅 Установка даты обмена
- 🔐 Авторизация через Google или Telegram
- 📸 Загрузка аватаров розыгрышей (AWS S3)

## 🛠 Технологии

| Компонент | Технологии |
|-----------|------------|
| **Frontend** | React 18, TypeScript, Vite, Material-UI, TanStack Query |
| **Backend** | Go 1.21, Gin, GORM, AWS SDK |
| **Database** | PostgreSQL 15 |
| **Storage** | AWS S3 (аватары) |
| **Deploy** | AWS (EC2 + RDS + S3 + CloudFront + Route 53) |

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

### Авторизация
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/auth/google` | Google OAuth login |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/telegram` | Telegram login |
| GET | `/api/auth/me` | Текущий пользователь |

### Розыгрыши
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/groups` | Мои розыгрыши |
| POST | `/api/groups` | Создать розыгрыш |
| GET | `/api/groups/:id` | Получить розыгрыш |
| POST | `/api/groups/:id/join` | Присоединиться |
| POST | `/api/groups/:id/draw` | Провести жеребьёвку |
| GET | `/api/groups/:id/my-assignment` | Кому я дарю подарок |

### Загрузка файлов
| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/upload/avatar` | Загрузить аватар (макс 5MB) |

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

Сервер использует следующие переменные (см. [`env.example`](./env.example)):

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=secret_santa

# JWT
JWT_SECRET=your-secret-key

# CORS & URLs
CORS_ORIGINS=http://localhost:3000
BASE_URL=http://localhost:3000  # Frontend URL
SERVER_URL=http://localhost:8080  # Backend URL

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# AWS S3 (для аватаров)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=eu-south-2
S3_BUCKET=secret-santa-frontend-xxxxx
```

**Подробности:**
- OAuth: [`docs/OAUTH_SETUP.md`](./docs/OAUTH_SETUP.md)
- Аватары: [`docs/AVATAR_SETUP.md`](./docs/AVATAR_SETUP.md)
- Локальное тестирование: [`docs/LOCAL_TESTING_AVATARS.md`](./docs/LOCAL_TESTING_AVATARS.md)

## 📝 License

MIT
