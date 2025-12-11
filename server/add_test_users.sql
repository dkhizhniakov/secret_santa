-- Скрипт для добавления 10 тестовых пользователей из разных стран
-- Использование: psql -h localhost -U postgres -d secret_santa -f add_test_users.sql

\set ON_ERROR_STOP on

DO $$
DECLARE
  raffle_id uuid;
  user_id uuid;
BEGIN
  -- Получаем ID последнего созданного розыгрыша
  SELECT id INTO raffle_id FROM groups ORDER BY created_at DESC LIMIT 1;
  
  IF raffle_id IS NULL THEN
    RAISE EXCEPTION 'Розыгрыш не найден. Сначала создайте розыгрыш через интерфейс.';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Добавляем 10 участников из разных стран';
  RAISE NOTICE 'Розыгрыш: %', raffle_id;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- 1. Алиса из России (Москва)
  INSERT INTO users (id, name, avatar_url, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Алиса Петрова', 'https://i.pravatar.cc/150?img=1', NOW(), NOW())
  RETURNING id INTO user_id;
  INSERT INTO members (id, group_id, user_id, phone, about, address_line1, city, region, postal_code, country, address_line1_en, city_en, region_en, wishlist, anti_wishlist, created_at, updated_at)
  VALUES (gen_random_uuid(), raffle_id, user_id, '+7 (999) 123-45-67', 'Люблю читать книги и пить кофе ☕', 'ул. Ленина, д. 10, кв. 5', 'Москва', 'Московская область', '101000', 'RU', 'Lenina st., 10, apt. 5', 'Moscow', 'Moscow region', 'Книги, качественный кофе, свечи с приятным запахом', 'Без орехов (аллергия)', NOW(), NOW());
  RAISE NOTICE '✓ 1. Алиса Петрова (Россия, Москва)';

  -- 2. John из США (Нью-Йорк)
  INSERT INTO users (id, name, avatar_url, created_at, updated_at)
  VALUES (gen_random_uuid(), 'John Smith', 'https://i.pravatar.cc/150?img=12', NOW(), NOW())
  RETURNING id INTO user_id;
  INSERT INTO members (id, group_id, user_id, phone, about, address_line1, city, region, postal_code, country, address_line1_en, city_en, region_en, wishlist, anti_wishlist, created_at, updated_at)
  VALUES (gen_random_uuid(), raffle_id, user_id, '+1 (212) 555-0123', 'Software engineer, love tech gadgets 🖥️', '123 Broadway, Apt 45', 'New York', 'New York', '10001', 'US', '123 Broadway, Apt 45', 'New York', 'New York', 'Mechanical keyboard, USB gadgets, board games', 'No sweets please', NOW(), NOW());
  RAISE NOTICE '✓ 2. John Smith (USA, New York)';

  -- 3. Emma из Великобритании (Лондон)
  INSERT INTO users (id, name, avatar_url, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Emma Johnson', 'https://i.pravatar.cc/150?img=5', NOW(), NOW())
  RETURNING id INTO user_id;
  INSERT INTO members (id, group_id, user_id, phone, about, address_line1, city, region, postal_code, country, address_line1_en, city_en, region_en, wishlist, anti_wishlist, created_at, updated_at)
  VALUES (gen_random_uuid(), raffle_id, user_id, '+44 20 7946 0958', 'Tea lover and bookworm 📚', '42 Baker Street, Flat 2', 'London', 'Greater London', 'NW1 6XE', 'GB', '42 Baker Street, Flat 2', 'London', 'Greater London', 'English tea, classic novels, cozy blankets', 'No coffee (prefer tea)', NOW(), NOW());
  RAISE NOTICE '✓ 3. Emma Johnson (UK, London)';

  -- 4. Hans из Германии (Берлин)
  INSERT INTO users (id, name, avatar_url, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Hans Müller', 'https://i.pravatar.cc/150?img=15', NOW(), NOW())
  RETURNING id INTO user_id;
  INSERT INTO members (id, group_id, user_id, phone, about, address_line1, city, region, postal_code, country, address_line1_en, city_en, region_en, wishlist, anti_wishlist, created_at, updated_at)
  VALUES (gen_random_uuid(), raffle_id, user_id, '+49 30 12345678', 'Ingenieur, mag Bier und Fußball ⚽', 'Unter den Linden 77', 'Berlin', 'Berlin', '10117', 'DE', 'Unter den Linden 77', 'Berlin', 'Berlin', 'Craft beer, football memorabilia, German chocolate', 'Keine Nüsse bitte', NOW(), NOW());
  RAISE NOTICE '✓ 4. Hans Müller (Germany, Berlin)';

  -- 5. Marie из Франции (Париж)
  INSERT INTO users (id, name, avatar_url, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Marie Dubois', 'https://i.pravatar.cc/150?img=9', NOW(), NOW())
  RETURNING id INTO user_id;
  INSERT INTO members (id, group_id, user_id, phone, about, address_line1, city, region, postal_code, country, address_line1_en, city_en, region_en, wishlist, anti_wishlist, created_at, updated_at)
  VALUES (gen_random_uuid(), raffle_id, user_id, '+33 1 42 86 82 00', 'Designer, passionnée de mode et d''art 🎨', '15 Rue de Rivoli', 'Paris', 'Île-de-France', '75001', 'FR', '15 Rue de Rivoli', 'Paris', 'Île-de-France', 'French perfume, art supplies, fashion magazines', 'No synthetic fabrics', NOW(), NOW());
  RAISE NOTICE '✓ 5. Marie Dubois (France, Paris)';

  -- 6. Carlos из Испании (Барселона)
  INSERT INTO users (id, name, avatar_url, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Carlos García', 'https://i.pravatar.cc/150?img=33', NOW(), NOW())
  RETURNING id INTO user_id;
  INSERT INTO members (id, group_id, user_id, phone, about, address_line1, city, region, postal_code, country, address_line1_en, city_en, region_en, wishlist, anti_wishlist, created_at, updated_at)
  VALUES (gen_random_uuid(), raffle_id, user_id, '+34 93 123 4567', 'Chef, amo la cocina y el fútbol 🍳', 'La Rambla 99', 'Barcelona', 'Cataluña', '08002', 'ES', 'La Rambla 99', 'Barcelona', 'Catalonia', 'Cooking utensils, Spanish wine, FC Barcelona merch', 'No seafood (allergy)', NOW(), NOW());
  RAISE NOTICE '✓ 6. Carlos García (Spain, Barcelona)';

  -- 7. Sofia из Италии (Рим)
  INSERT INTO users (id, name, avatar_url, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Sofia Rossi', 'https://i.pravatar.cc/150?img=44', NOW(), NOW())
  RETURNING id INTO user_id;
  INSERT INTO members (id, group_id, user_id, phone, about, address_line1, city, region, postal_code, country, address_line1_en, city_en, region_en, wishlist, anti_wishlist, created_at, updated_at)
  VALUES (gen_random_uuid(), raffle_id, user_id, '+39 06 1234 5678', 'Photographer, love coffee and architecture ☕📷', 'Via del Corso 126', 'Roma', 'Lazio', '00186', 'IT', 'Via del Corso 126', 'Rome', 'Lazio', 'Italian coffee, camera accessories, travel guides', 'No sweet liqueurs', NOW(), NOW());
  RAISE NOTICE '✓ 7. Sofia Rossi (Italy, Rome)';

  -- 8. Yuki из Японии (Токио)
  INSERT INTO users (id, name, avatar_url, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Yuki Tanaka', 'https://i.pravatar.cc/150?img=28', NOW(), NOW())
  RETURNING id INTO user_id;
  INSERT INTO members (id, group_id, user_id, phone, about, address_line1, city, region, postal_code, country, address_line1_en, city_en, region_en, wishlist, anti_wishlist, created_at, updated_at)
  VALUES (gen_random_uuid(), raffle_id, user_id, '+81 3-1234-5678', 'Anime fan and gamer 🎮🎌', '1-1-1 Shibuya', 'Tokyo', 'Tokyo', '150-0002', 'JP', '1-1-1 Shibuya', 'Tokyo', 'Tokyo', 'Anime figures, Japanese snacks, manga books', 'No spicy food', NOW(), NOW());
  RAISE NOTICE '✓ 8. Yuki Tanaka (Japan, Tokyo)';

  -- 9. Olivia из Австралии (Сидней)
  INSERT INTO users (id, name, avatar_url, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Olivia Wilson', 'https://i.pravatar.cc/150?img=20', NOW(), NOW())
  RETURNING id INTO user_id;
  INSERT INTO members (id, group_id, user_id, phone, about, address_line1, city, region, postal_code, country, address_line1_en, city_en, region_en, wishlist, anti_wishlist, created_at, updated_at)
  VALUES (gen_random_uuid(), raffle_id, user_id, '+61 2 9876 5432', 'Surfer and environmentalist 🏄‍♀️🌿', '123 Bondi Beach Rd', 'Sydney', 'New South Wales', '2026', 'AU', '123 Bondi Beach Rd', 'Sydney', 'New South Wales', 'Eco-friendly products, surfing gear, Australian wine', 'No plastic items please', NOW(), NOW());
  RAISE NOTICE '✓ 9. Olivia Wilson (Australia, Sydney)';

  -- 10. Liam из Канады (Торонто)
  INSERT INTO users (id, name, avatar_url, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Liam Brown', 'https://i.pravatar.cc/150?img=52', NOW(), NOW())
  RETURNING id INTO user_id;
  INSERT INTO members (id, group_id, user_id, phone, about, address_line1, city, region, postal_code, country, address_line1_en, city_en, region_en, wishlist, anti_wishlist, created_at, updated_at)
  VALUES (gen_random_uuid(), raffle_id, user_id, '+1 (416) 555-0199', 'Hockey fan and maple syrup enthusiast 🏒🍁', '789 Yonge Street, Unit 12', 'Toronto', 'Ontario', 'M4W 2G8', 'CA', '789 Yonge Street, Unit 12', 'Toronto', 'Ontario', 'Hockey memorabilia, Canadian maple syrup, winter gear', 'No summer clothes (too cold here!)', NOW(), NOW());
  RAISE NOTICE '✓ 10. Liam Brown (Canada, Toronto)';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Успешно добавлено 10 участников!';
  RAISE NOTICE '========================================';
END $$;

-- Показываем всех участников
SELECT 
  g.name as raffle_name,
  u.name as user_name,
  m.city,
  m.phone
FROM members m
JOIN users u ON m.user_id = u.id
JOIN groups g ON m.group_id = g.id
ORDER BY m.created_at DESC
LIMIT 10;

