# 🏗️ AWS Infrastructure

Terraform конфигурация для развертывания Secret Santa.

## Что создаётся

| Ресурс | Описание | Стоимость |
|--------|----------|-----------|
| **VPC** | Изолированная сеть | Бесплатно |
| **EC2 t3.micro** | Go API сервер | Free Tier / $8 |
| **RDS db.t3.micro** | PostgreSQL 15 | Free Tier / $13 |
| **S3** | Хостинг React | ~$0.10 |
| **CloudFront** | CDN + SSL | ~$1 |
| **ACM** | SSL сертификат | Бесплатно |
| **Route 53** | DNS запись | Бесплатно* |

*При использовании существующей hosted zone

## Быстрый старт

```bash
# 1. Настройте переменные
cp terraform.tfvars.example terraform.tfvars
# Отредактируйте terraform.tfvars

# 2. Разверните
terraform init
terraform apply

# 3. Посмотрите outputs
terraform output
```

## Файлы

```
terraform/
├── main.tf                  # Вся инфраструктура
└── terraform.tfvars.example # Пример переменных
```

## Требуемые переменные

| Переменная | Описание | Пример |
|------------|----------|--------|
| `aws_region` | AWS регион | `eu-central-1` |
| `domain_name` | Ваш домен в Route 53 | `dkweb.net` |
| `subdomain` | Поддомен | `santa` |
| `db_password` | Пароль БД | `SecurePass123!` |
| `ssh_public_key` | Ваш SSH ключ | `ssh-rsa AAAA...` |

## Outputs

После `terraform apply`:

```
website_url                = "https://santa.dkweb.net"
ec2_public_ip             = "3.xxx.xxx.xxx"
ec2_ssh_command           = "ssh ubuntu@3.xxx.xxx.xxx"
database_host             = "secret-santa-db.xxx.rds.amazonaws.com"
s3_bucket                 = "secret-santa-frontend-xxxxxxxx"
cloudfront_distribution_id = "EXXXXXXXXXX"
```

## Удаление

```bash
terraform destroy
```

⚠️ Удалит все ресурсы включая данные в RDS!
