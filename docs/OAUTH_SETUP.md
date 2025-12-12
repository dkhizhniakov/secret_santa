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

## VK (ВКонтакте) - VK ID

> ⚠️ **Важно**: ВКонтакте перешел на новый **VK ID SDK**. Используется виджет, аналогичный Telegram Login Widget.

### Шаг 1: Создайте приложение VK

1. Перейдите на [VK Developers](https://dev.vk.com/)
2. Нажмите **Мои приложения** → **Создать приложение**
3. Заполните:
   - **Название**: `Secret Santa`
   - **Платформа**: **Веб-сайт**
   - **Адрес сайта**: `https://santa.dkweb.net`
   - **Базовый домен**: `santa.dkweb.net`
4. Нажмите **Создать**

### Шаг 2: Настройте VK ID

1. В настройках приложения найдите раздел **VK ID**
2. Добавьте **Redirect URI**:
   - `http://localhost:3000/` (для разработки)
   - `https://santa.dkweb.net/` (для продакшена)
3. Включите **VK ID** для вашего приложения

### Шаг 3: Получите ID приложения

1. В разделе **Настройки** скопируйте:
   - **ID приложения** (например: 54396280)
2. Этот ID используется в коде VK ID SDK

### Шаг 4: Обновите код

Убедитесь, что в `Login.tsx` указан ваш **VK App ID**:

```typescript
VKID.Config.init({
  app: 54396280, // Ваш VK App ID
  redirectUrl: `${window.location.origin}/api/auth/vk/callback`,
  // ...
});
```

### Шаг 5: Настройка не требует credentials

VK ID работает через SDK и виджет - **не нужны** `VK_CLIENT_ID` и `VK_CLIENT_SECRET` в `.env`.

> **Примечание**: VK ID SDK автоматически обменивает код на токен на стороне клиента.

---

## Яндекс OAuth

### Шаг 1: Создайте приложение Яндекс

1. Перейдите на [Яндекс OAuth](https://oauth.yandex.ru/)
2. Нажмите **Зарегистрировать новое приложение**
3. Заполните:
   - **Название**: `Secret Santa`
   - **Платформы**: выберите **Веб-сервисы**
   - **Redirect URI**:
     - `http://localhost:8080/api/auth/yandex/callback` (для разработки)
     - `https://santa.dkweb.net/api/auth/yandex/callback` (для продакшена)
4. Права доступа: оставьте минимальные (доступ к email и аватару по умолчанию)
5. Нажмите **Создать**

### Шаг 2: Получите credentials

1. После создания приложения скопируйте:
   - **ClientID** (это `YANDEX_CLIENT_ID`)
   - **Client secret** (это `YANDEX_CLIENT_SECRET`)

### Шаг 3: Добавьте credentials

**Для локальной разработки** (`.env`):
```env
YANDEX_CLIENT_ID=a1b2c3d4e5f6g7h8i9j0
YANDEX_CLIENT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

**Для продакшена** (GitHub Secrets):
- `YANDEX_CLIENT_ID`
- `YANDEX_CLIENT_SECRET`

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
| `YANDEX_CLIENT_ID` | Yandex OAuth ClientID |
| `YANDEX_CLIENT_SECRET` | Yandex OAuth Client Secret |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token от @BotFather |

> **Примечание**: VK ID не требует credentials в GitHub Secrets - App ID указывается в коде frontend.

---

## Обновление GitHub Actions

Добавьте в `.github/workflows/deploy.yml` в секцию создания `.env`:

```yaml
- name: Create .env file
  env:
    # ... существующие переменные ...
    GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
    GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
    YANDEX_CLIENT_ID: ${{ secrets.YANDEX_CLIENT_ID }}
    YANDEX_CLIENT_SECRET: ${{ secrets.YANDEX_CLIENT_SECRET }}
    TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
  run: |
    printf '%s\n' \
      # ... существующие строки ...
      "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" \
      "GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}" \
      "YANDEX_CLIENT_ID=${YANDEX_CLIENT_ID}" \
      "YANDEX_CLIENT_SECRET=${YANDEX_CLIENT_SECRET}" \
      "TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}" \
      "BASE_URL=https://${DOMAIN}" \
      > .env
```

---

## Проверка

### Локально:

1. Добавьте в `.env`:
   ```env
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   YANDEX_CLIENT_ID=...
   YANDEX_CLIENT_SECRET=...
   BASE_URL=http://localhost:3000
   SERVER_URL=http://localhost:8080
   ```
   
   > VK ID не требует переменных в `.env` - App ID указывается в коде

2. Запустите сервер:
   ```bash
   cd server && go run ./cmd/api
   ```

3. Запустите клиент:
   ```bash
   cd client && npm start
   ```

4. Откройте http://localhost:3000/login
5. Доступны следующие методы входа:
   - **Google** - кнопка
   - **ВКонтакте** - виджет VK ID
   - **Яндекс** - кнопка
   - **Telegram** - виджет (только на HTTPS)

### На продакшене:

После деплоя:
1. Откройте https://santa.dkweb.net/login
2. Проверьте вход через:
   - **Google** (OAuth кнопка)
   - **ВКонтакте** (VK ID виджет)
   - **Яндекс** (OAuth кнопка)
   - **Telegram** (виджет)

> **VK ID**: Убедитесь, что в `Login.tsx` указан правильный VK App ID (54396280 или ваш)

