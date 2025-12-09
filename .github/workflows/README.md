# 🚀 GitHub Actions - CI/CD

Автоматический деплой при пуше в `main`.

## Как это работает

1. **Terraform** создаёт `deploy-config.json` с адресами ресурсов
2. **GitHub Actions** читает этот файл при деплое
3. **Секреты** (пароли, ключи) хранятся в GitHub Secrets

## Настройка GitHub Secrets

Нужно добавить **только 5 секретов** (остальное в `deploy-config.json`):

| Secret | Описание | Как получить |
|--------|----------|--------------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key | IAM Console |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | IAM Console |
| `EC2_SSH_KEY` | Приватный SSH ключ | См. ниже |
| `DB_PASSWORD` | Пароль БД | Ваш пароль из terraform.tfvars |
| `JWT_SECRET` | JWT секрет | `openssl rand -base64 32` |

## EC2_SSH_KEY - приватный ключ для деплоя

Специальный ключ для деплоя находится в `~/.ssh/secret-santa-ec2`

```powershell
cat ~/.ssh/secret-santa-ec2
```

Скопируйте **ВЕСЬ** вывод включая `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----`

## Сгенерировать JWT_SECRET

```powershell
openssl rand -base64 32
```

## Что автоматически из deploy-config.json

- ✅ EC2 IP адрес
- ✅ S3 bucket
- ✅ CloudFront ID
- ✅ RDS хост
- ✅ Домен
- ✅ AWS регион

## Обновление конфигурации

После `terraform apply` файл `deploy-config.json` обновляется автоматически.
Закоммитьте изменения:

```bash
git add deploy-config.json
git commit -m "Update deploy config"
git push
```
