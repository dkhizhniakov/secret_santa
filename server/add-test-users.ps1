#!/usr/bin/env pwsh
# Скрипт для добавления тестовых пользователей в локальную БД

Write-Host "🎅 Добавление тестовых пользователей в Secret Santa" -ForegroundColor Cyan
Write-Host ""

# Проверяем Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker не найден. Установите Docker." -ForegroundColor Red
    exit 1
}

# Проверяем, запущен ли контейнер PostgreSQL
$container = docker ps --filter "name=secret-santa-db" --format "{{.Names}}"
if (!$container) {
    Write-Host "❌ Контейнер secret-santa-db не запущен." -ForegroundColor Red
    Write-Host "Запустите: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Контейнер PostgreSQL найден: $container" -ForegroundColor Green
Write-Host "Выполняем SQL скрипт..." -ForegroundColor Yellow
Write-Host ""

# Читаем SQL файл и выполняем через Docker
$sqlContent = Get-Content -Path "add_test_users.sql" -Raw
$sqlContent | docker exec -i secret-santa-db psql -U postgres -d secret_santa

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Тестовые пользователи успешно добавлены!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Добавлено 10 участников из разных стран:" -ForegroundColor Cyan
    Write-Host "  1. 🇷🇺 Алиса Петрова (Россия, Москва)" -ForegroundColor White
    Write-Host "  2. 🇺🇸 John Smith (США, Нью-Йорк)" -ForegroundColor White
    Write-Host "  3. 🇬🇧 Emma Johnson (Великобритания, Лондон)" -ForegroundColor White
    Write-Host "  4. 🇩🇪 Hans Müller (Германия, Берлин)" -ForegroundColor White
    Write-Host "  5. 🇫🇷 Marie Dubois (Франция, Париж)" -ForegroundColor White
    Write-Host "  6. 🇪🇸 Carlos García (Испания, Барселона)" -ForegroundColor White
    Write-Host "  7. 🇮🇹 Sofia Rossi (Италия, Рим)" -ForegroundColor White
    Write-Host "  8. 🇯🇵 Yuki Tanaka (Япония, Токио)" -ForegroundColor White
    Write-Host "  9. 🇦🇺 Olivia Wilson (Австралия, Сидней)" -ForegroundColor White
    Write-Host " 10. 🇨🇦 Liam Brown (Канада, Торонто)" -ForegroundColor White
    Write-Host ""
    Write-Host "Теперь можно провести жеребьевку! 🎲" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Ошибка при добавлении пользователей" -ForegroundColor Red
}

