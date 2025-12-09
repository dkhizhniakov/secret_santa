# 🚀 Деплой Secret Santa на AWS

## Архитектура

```
                     https://santa.dkweb.net
                              │
                              ▼
┌────────────────────────────────────────────────┐
│                  CloudFront                     │
│              (CDN + SSL + Cache)                │
│   ┌──────────────────┐  ┌──────────────────┐   │
│   │   /api/* → EC2   │  │    /* → S3       │   │
│   └──────────────────┘  └──────────────────┘   │
└────────────────────────────────────────────────┘
           │                        │
           ▼                        ▼
    ┌─────────────┐          ┌─────────────┐
    │    EC2      │          │     S3      │
    │  (Go API)   │          │  (React)    │
    │  Docker     │          │             │
    └─────────────┘          └─────────────┘
           │
    ┌─────────────┐
    │    RDS      │
    │ PostgreSQL  │
    └─────────────┘
```

## 💰 Стоимость

| Компонент | Free Tier | После Free Tier |
|-----------|-----------|-----------------|
| EC2 t3.micro | 750 ч/мес (12 мес) | ~$8/мес |
| RDS db.t3.micro | 750 ч/мес (12 мес) | ~$13/мес |
| S3 | 5 GB | ~$0.10 |
| CloudFront | 1 TB/мес | ~$1 |
| **Итого** | **~$1-2/мес** | **~$22/мес** |

---

## Шаг 1: Подготовка

### 1.1 Установите инструменты

```bash
# AWS CLI
# Windows: https://aws.amazon.com/cli/
# macOS: brew install awscli
# Linux: sudo apt install awscli

# Terraform
# Windows: choco install terraform
# macOS: brew install terraform
# Linux: https://terraform.io/downloads
```

### 1.2 Настройте AWS CLI

```bash
aws configure
# AWS Access Key ID: ваш_ключ
# AWS Secret Access Key: ваш_секрет
# Default region: eu-central-1
# Default output format: json
```

### 1.3 Создайте SSH ключ (если нет)

```bash
# Проверьте существующий ключ
cat ~/.ssh/id_rsa.pub

# Или создайте новый
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
cat ~/.ssh/id_rsa.pub
```

---

## Шаг 2: Terraform

### 2.1 Настройте переменные

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
```

Отредактируйте `terraform.tfvars`:

```hcl
aws_region     = "eu-central-1"
project_name   = "secret-santa"
domain_name    = "dkweb.net"
subdomain      = "santa"
db_username    = "secretsanta"
db_password    = "MySecurePassword123!"  # ИЗМЕНИТЕ!

# Вставьте ваш публичный SSH ключ
ssh_public_key = "ssh-rsa AAAAB3NzaC1yc2E... your-email@example.com"
```

### 2.2 Разверните инфраструктуру

```bash
# Инициализация
terraform init

# Проверка плана
terraform plan

# Применение (займёт 10-15 минут)
terraform apply
```

### 2.3 Сохраните outputs

```bash
terraform output

# Результат:
# website_url = "https://santa.dkweb.net"
# ec2_public_ip = "3.xxx.xxx.xxx"
# ec2_ssh_command = "ssh ubuntu@3.xxx.xxx.xxx"
# database_host = "secret-santa-db.xxx.rds.amazonaws.com"
# s3_bucket = "secret-santa-frontend-xxxxxxxx"
# cloudfront_distribution_id = "EXXXXXXXXXX"
```

---

## Шаг 3: Деплой Frontend

```bash
cd ../../client

# Создайте production конфиг
echo "REACT_APP_API_URL=https://santa.dkweb.net/api" > .env.production

# Сборка
npm ci
npm run build

# Загрузка в S3 (замените BUCKET на ваш)
aws s3 sync build/ s3://YOUR_S3_BUCKET --delete

# Очистка кеша CloudFront (замените ID)
aws cloudfront create-invalidation \
  --distribution-id YOUR_CF_DISTRIBUTION_ID \
  --paths "/*"
```

---

## Шаг 4: Деплой Backend

### 4.1 Подключитесь к EC2

```bash
ssh ubuntu@YOUR_EC2_IP
```

### 4.2 Создайте .env файл

```bash
cd /opt/secret-santa

# Получите env файл из Terraform output
# terraform output -raw env_file > .env
# Или создайте вручную:

cat > .env << 'EOF'
PORT=8080
ENV=production
DB_HOST=YOUR_RDS_HOST
DB_PORT=5432
DB_USER=secretsanta
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=secret_santa
JWT_SECRET=СГЕНЕРИРУЙТЕ_СЛУЧАЙНУЮ_СТРОКУ
CORS_ORIGINS=https://santa.dkweb.net
EOF

# Сгенерируйте JWT_SECRET
openssl rand -base64 32
# Вставьте результат в .env
```

### 4.3 Загрузите и запустите Docker образ

**На локальной машине:**

```bash
cd server

# Сборка образа
docker build -t secret-santa-api .

# Сохранение образа
docker save secret-santa-api | gzip > api.tar.gz

# Отправка на сервер
scp api.tar.gz ubuntu@YOUR_EC2_IP:/opt/secret-santa/
```

**На EC2:**

```bash
cd /opt/secret-santa

# Загрузка образа
docker load < api.tar.gz

# Запуск контейнера
docker run -d \
  --name api \
  --restart always \
  -p 8080:8080 \
  --env-file .env \
  secret-santa-api

# Проверка
docker logs api
curl http://localhost:8080/health
```

---

## Шаг 5: Проверка

1. Откройте https://santa.dkweb.net
2. Зарегистрируйтесь
3. Создайте группу
4. Готово! 🎉

---

## 🔄 Обновление приложения

### Frontend

```bash
cd client
npm run build
aws s3 sync build/ s3://YOUR_S3_BUCKET --delete
aws cloudfront create-invalidation --distribution-id YOUR_CF_ID --paths "/*"
```

### Backend

```bash
# Локально
cd server
docker build -t secret-santa-api .
docker save secret-santa-api | gzip > api.tar.gz
scp api.tar.gz ubuntu@YOUR_EC2_IP:/opt/secret-santa/

# На EC2
cd /opt/secret-santa
docker load < api.tar.gz
docker stop api && docker rm api
docker run -d --name api --restart always -p 8080:8080 --env-file .env secret-santa-api
```

---

## 🔧 Полезные команды

```bash
# SSH на сервер
ssh ubuntu@YOUR_EC2_IP

# Логи API
docker logs -f api

# Перезапуск API
docker restart api

# Проверка здоровья
curl https://santa.dkweb.net/api/health

# Подключение к БД
docker run -it --rm postgres:15-alpine psql \
  -h YOUR_RDS_HOST \
  -U secretsanta \
  -d secret_santa
```

---

## 🗑️ Удаление

```bash
cd infrastructure/terraform
terraform destroy
```

⚠️ **Внимание:** Это удалит ВСЕ ресурсы включая базу данных!

---

## 🐛 Troubleshooting

### API не отвечает

```bash
# На EC2
docker ps
docker logs api

# Проверьте порт
curl http://localhost:8080/health
```

### Ошибка подключения к БД

```bash
# Проверьте, что EC2 может достучаться до RDS
nc -zv YOUR_RDS_HOST 5432
```

### CORS ошибки

Убедитесь, что в `.env`:
```
CORS_ORIGINS=https://santa.dkweb.net
```

### Сертификат не работает

```bash
# Проверьте статус в AWS Console
# ACM → Certificates → santa.dkweb.net
# Должен быть статус "Issued"
```
