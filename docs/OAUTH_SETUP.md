# 🔐 Настройка OAuth авторизации

## Google OAuth

### Шаг 1: Создайте проект в Google Cloud Console

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Нажмите **Select a project** → **New Project**
3. Введите имя проекта: `Secret Santa`
4. Нажмите **Create**

### Шаг 2: Настройте OAuth Consent Screen

1. В меню слева: **APIs & Services** → **OAuth consent screen**
2. Выберите **External** → **Create**
3. Заполните:
   - **App name**: `Secret Santa`
   - **User support email**: ваш email
   - **Developer contact**: ваш email
4. Нажмите **Save and Continue**
5. На странице Scopes нажмите **Save and Continue** (scopes добавлять не нужно)
6. На странице Test users нажмите **Save and Continue**
7. Нажмите **Back to Dashboard**

### Шаг 3: Создайте OAuth Client ID

1. В меню: **APIs & Services** → **Credentials**
2. Нажмите **+ Create Credentials** → **OAuth client ID**
3. Выберите **Web application**
4. Введите:
   - **Name**: `Secret Santa Web`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (для разработки)
     - `https://santa.dkweb.net` (для продакшена)
   - **Authorized redirect URIs**:
     - `http://localhost:8080/api/auth/google/callback` (для разработки)
     - `https://santa.dkweb.net/api/auth/google/callback` (для продакшена)
5. Нажмите **Create**
6. Скопируйте **Client ID** и **Client Secret**

### Шаг 4: Добавьте credentials

**Для локальной разработки** (`.env`):
```env
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
```

**Для продакшена** (GitHub Secrets):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

---

## Telegram Login

### Шаг 1: Создайте бота

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте `/newbot`
3. Введите имя бота: `Secret Santa`
4. Введите username: `SecretSantaYourNameBot` (должен заканчиваться на `Bot`)
5. Скопируйте **HTTP API token** (это `TELEGRAM_BOT_TOKEN`)

### Шаг 2: Настройте домен

1. Отправьте `/mybots` в @BotFather
2. Выберите вашего бота
3. Нажмите **Bot Settings** → **Domain**
4. Нажмите **Set Domain**
5. Введите:
   - Для разработки: `localhost` (не будет работать, только для продакшена)
   - Для продакшена: `santa.dkweb.net`

> ⚠️ **Важно**: Telegram Login Widget работает только на HTTPS доменах. Для локальной разработки используйте Google OAuth.

### Шаг 3: Добавьте credentials

**Для продакшена** (`.env` на сервере и GitHub Secrets):
```env
TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Обновление GitHub Secrets

Добавьте в GitHub Secrets:

| Secret | Описание |
|--------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token от @BotFather |

---

## Обновление GitHub Actions

Добавьте в `.github/workflows/deploy.yml` в секцию создания `.env`:

```yaml
- name: Create .env file
  env:
    # ... существующие переменные ...
    GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
    GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
    TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
  run: |
    printf '%s\n' \
      # ... существующие строки ...
      "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" \
      "GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}" \
      "TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}" \
      "BASE_URL=https://${DOMAIN}" \
      > .env
```

---

## Проверка

### Локально (только Google):

1. Добавьте в `.env`:
   ```env
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   BASE_URL=http://localhost:3000
   ```

2. Запустите сервер:
   ```bash
   cd server && go run ./cmd/api
   ```

3. Запустите клиент:
   ```bash
   cd client && npm start
   ```

4. Откройте http://localhost:3000/login и нажмите "Войти через Google"

### На продакшене:

После деплоя с обновлёнными secrets:
1. Откройте https://santa.dkweb.net/login
2. Проверьте вход через Google
3. Проверьте вход через Telegram

