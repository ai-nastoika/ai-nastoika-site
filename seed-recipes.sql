-- Миграция: перенос fallback рецептов в БД
-- Запускать: mysql -u root -pnewpass123 nastoika < seed-recipes.sql

-- Удаляем старые данные (кроме рецептов добавленных через парсер)
-- Оставляем id > 100 если вдруг были добавлены через парсер

-- ═══════════════════════════════════════════
-- 1. Вишнёвая классическая
-- ═══════════════════════════════════════════
INSERT INTO recipes (slug, title, subtitle, category, category_label, hero_image, abv, time, difficulty, rating, reviews, year, origin, history_title, history_text, tasting_color, tasting_description, tasting_pairing, tasting_temp, tasting_glass, sweet, sour, bitter, spicy, fruity, herbal, tips, author_name, author_date)
VALUES (
  'vishnevaya-klasicheskaya', 'Вишнёвая классическая', 'Сладкая настойка с насыщенным вкусом спелой вишни',
  'sweet', 'Сладкая', 'recipe-cherry.jpg', '25%', '14 дней', 'Легко', 4.8, 124,
  'XVIII век', 'Россия', 'От целителей к столу',
  'Вишнёвые настойки в России появились ещё в XVIII веке. Первоначально вишнёвый спирт использовался как лекарственное средство — настойка вишнёвых косточек применялась при желудочных расстройствах и как общеукрепляющее средство. Со временем рецепт перешёл из аптек на праздничные столы.',
  'Глубокий рубиновый',
  'Насыщенный вишнёвый вкус с лёгкой косточковой горчинкой. Послевкусие длинное, с оттенком миндаля.',
  '["Тёмный шоколад","Сыр бри","Вишневый пирог"]',
  '10-12°C', 'Ликёрный бокал',
  85, 30, 25, 10, 90, 5,
  '["Используйте только спелую вишню","Не удаляйте косточки — они дают миндальный оттенок","Добавьте гвоздику для сложности"]',
  'Мария Петрова', '15.03.2024'
)
ON DUPLICATE KEY UPDATE title=VALUES(title);

SET @rid1 = (SELECT id FROM recipes WHERE slug='vishnevaya-klasicheskaya');
DELETE FROM recipe_ingredients WHERE recipe_id=@rid1;
DELETE FROM recipe_steps WHERE recipe_id=@rid1;

INSERT INTO recipe_ingredients (recipe_id, name, amount, note, sort_order) VALUES
(@rid1, 'Вишня спелая', '1 кг', 'с косточками', 0),
(@rid1, 'Спирт 96%', '500 мл', 'или водка', 1),
(@rid1, 'Сахар', '300 г', 'по вкусу', 2),
(@rid1, 'Вода', '200 мл', 'очищенная', 3);

INSERT INTO recipe_steps (recipe_id, step_num, title, text, sort_order) VALUES
(@rid1, 1, 'Подготовка', 'Вымойте вишню, удалите хвостики. Не вынимайте косточки — они придают миндальный аромат.', 0),
(@rid1, 2, 'Заливка', 'Поместите вишню в стеклянную банку, залейте спиртом. Плотно закройте крышкой.', 1),
(@rid1, 3, 'Настаивание', 'Оставьте в тёмном месте при комнатной температуре на 10-14 дней. Перемешивайте каждые 2-3 дня.', 2),
(@rid1, 4, 'Фильтрация', 'Процедите через марлю и сложенную в несколько слоёв салфетку. Добавьте сахарный сироп.', 3);

-- ═══════════════════════════════════════════
-- 2. Облепиховая с барбарисом
-- ═══════════════════════════════════════════
INSERT INTO recipes (slug, title, subtitle, category, category_label, hero_image, abv, time, difficulty, rating, reviews, year, origin, history_title, history_text, tasting_color, tasting_description, tasting_pairing, tasting_temp, tasting_glass, sweet, sour, bitter, spicy, fruity, herbal, tips, author_name, author_date)
VALUES (
  'oblepikhovaya-s-barbarisom', 'Облепиховая с барбарисом', 'Яркая и полезная настойка с северным характером',
  'sweet', 'Сладкая', 'recipe-buckthorn.jpg', '22%', '21 день', 'Средне', 4.6, 89,
  'XIX век', 'Сибирь', 'Северное золото',
  'Облепиха издавна ценилась в Сибири как целебное растение. Моряки брали её в дальние плавания для профилактики цинги. Настойка на облепихе — традиционный сибирский рецепт.',
  'Насыщенный оранжево-красный',
  'Яркий кисло-сладкий вкус облепихи с тонкой горчинкой барбариса. Пряное послевкусие.',
  '["Морепродукты","Цитрусовые десерты","Твёрдый сыр"]',
  '8-10°C', 'Бокал для белого вина',
  70, 60, 20, 40, 80, 30,
  '["Используйте свежезамороженную облепиху","Барбарис можно заменить на клюкву","Добавьте мёд для мягкости"]',
  'Алексей Сибиряков', '22.07.2024'
)
ON DUPLICATE KEY UPDATE title=VALUES(title);

SET @rid2 = (SELECT id FROM recipes WHERE slug='oblepikhovaya-s-barbarisom');
DELETE FROM recipe_ingredients WHERE recipe_id=@rid2;
DELETE FROM recipe_steps WHERE recipe_id=@rid2;

INSERT INTO recipe_ingredients (recipe_id, name, amount, note, sort_order) VALUES
(@rid2, 'Облепиха', '500 г', 'свежая или замороженная', 0),
(@rid2, 'Барбарис', '100 г', 'сухой или свежий', 1),
(@rid2, 'Водка', '700 мл', '', 2),
(@rid2, 'Мёд', '3 ст.л.', 'натуральный', 3);

INSERT INTO recipe_steps (recipe_id, step_num, title, text, sort_order) VALUES
(@rid2, 1, 'Подготовка', 'Разморозьте облепиху, слегка раздавите ягоды толкушкой. Барбарис промойте.', 0),
(@rid2, 2, 'Заливка', 'Смешайте ягоды в банке, залейте водкой. Закройте и уберите в тёмное место.', 1),
(@rid2, 3, 'Настаивание', 'Настаивайте 18-21 день, ежедневно встряхивая.', 2),
(@rid2, 4, 'Финиш', 'Процедите, добавьте мёд, разлейте по бутылкам. Выдержите ещё неделю.', 3);

-- ═══════════════════════════════════════════
-- 3. Хреновуха
-- ═══════════════════════════════════════════
INSERT INTO recipes (slug, title, subtitle, category, category_label, hero_image, abv, time, difficulty, rating, reviews, year, origin, history_title, history_text, tasting_color, tasting_description, tasting_pairing, tasting_temp, tasting_glass, sweet, sour, bitter, spicy, fruity, herbal, tips, author_name, author_date)
VALUES (
  'khrenovukha', 'Хреновуха', 'Острая и бодрящая — классика украинской кухни',
  'spicy', 'Острая', 'recipe-pepper.jpg', '40%', '7 дней', 'Легко', 4.5, 203,
  'XVII век', 'Украина', 'Козацкий корень',
  'Хреновуха — традиционный козацкий напиток. Готовился как лекарство и оберег. Хрен считался священным растением, способным отгонять зло.',
  'Светло-золотистый',
  'Резкий хреновый вкус с жгучей остротой. Послевкусие согревающее, длительное.',
  '["Сало","Соленья","Борщ","Картофель"]',
  'Комнатная', 'Стопка',
  5, 10, 35, 95, 0, 70,
  '["Хрен берите только свежий","Чем мельче натрёте — тем крепче вкус","Можно добавить чеснок"]',
  'Иван Коваленко', '10.01.2024'
)
ON DUPLICATE KEY UPDATE title=VALUES(title);

SET @rid3 = (SELECT id FROM recipes WHERE slug='khrenovukha');
DELETE FROM recipe_ingredients WHERE recipe_id=@rid3;
DELETE FROM recipe_steps WHERE recipe_id=@rid3;

INSERT INTO recipe_ingredients (recipe_id, name, amount, note, sort_order) VALUES
(@rid3, 'Корень хрена', '200 г', 'свежий', 0),
(@rid3, 'Спирт 96%', '500 мл', '', 1),
(@rid3, 'Мёд', '2 ст.л.', '', 2),
(@rid3, 'Лимон', '½ шт.', 'сок', 3);

INSERT INTO recipe_steps (recipe_id, step_num, title, text, sort_order) VALUES
(@rid3, 1, 'Подготовка хрена', 'Очистите корень хрена, натрите на мелкой тёрке. Будьте осторожны — пары очень едкие!', 0),
(@rid3, 2, 'Заливка', 'Сложите хрен в банку, залейте спиртом. Закройте герметично.', 1),
(@rid3, 3, 'Настаивание', '5-7 дней в тёмном месте. Настойка приобретёт золотистый цвет.', 2),
(@rid3, 4, 'Финиш', 'Процедите, добавьте мёд и лимонный сок. Перелейте в чистую посуду.', 3);

-- ═══════════════════════════════════════════
-- 4. Лимончелло домашнее
-- ═══════════════════════════════════════════
INSERT INTO recipes (slug, title, subtitle, category, category_label, hero_image, abv, time, difficulty, rating, reviews, year, origin, history_title, history_text, tasting_color, tasting_description, tasting_pairing, tasting_temp, tasting_glass, sweet, sour, bitter, spicy, fruity, herbal, tips, author_name, author_date)
VALUES (
  'limoncello-domashnee', 'Лимончелло домашнее', 'Итальянская классика — солнечный лимон в бокале',
  'sweet', 'Сладкая', 'recipe-lemon.jpg', '30%', '30 дней', 'Легко', 4.9, 312,
  'XX век', 'Италия', 'Амальфийское солнце',
  'Лимончелло родом из побережья Амальфи. Готовится на основе лимонной цедры, вымачиваемой в спирте. После обеда подаётся замороженным.',
  'Ярко-жёлтый',
  'Интенсивный лимонный вкус с кремовой сладостью. Освежающий и лёгкий.',
  '["Тирамису","Панна-котта","Бискотти"]',
  '-18°C (замороженное)', 'Рюмка для ликёра (охлаждённая)',
  75, 70, 15, 0, 85, 0,
  '["Снимайте только жёлтую часть цедры","Используйте восковые лимоны","Разлейте по маленьким бутылочкам"]',
  'Елена Романова', '05.05.2024'
)
ON DUPLICATE KEY UPDATE title=VALUES(title);

SET @rid4 = (SELECT id FROM recipes WHERE slug='limoncello-domashnee');
DELETE FROM recipe_ingredients WHERE recipe_id=@rid4;
DELETE FROM recipe_steps WHERE recipe_id=@rid4;

INSERT INTO recipe_ingredients (recipe_id, name, amount, note, sort_order) VALUES
(@rid4, 'Лимоны', '10 шт.', 'крупные, восковые', 0),
(@rid4, 'Спирт 96%', '1 л', '', 1),
(@rid4, 'Сахар', '700 г', '', 2),
(@rid4, 'Вода', '1 л', '', 3);

INSERT INTO recipe_steps (recipe_id, step_num, title, text, sort_order) VALUES
(@rid4, 1, 'Цедра', 'Снимите цедру с лимонов овощечисткой, избегая белой части.', 0),
(@rid4, 2, 'Настаивание', 'Залейте цедру спиртом, настаивайте 25-30 дней в тёмном месте.', 1),
(@rid4, 3, 'Сироп', 'Сварите сахарный сироп (700г сахара + 1л воды). Остудите до комнатной температуры.', 2),
(@rid4, 4, 'Смешивание', 'Смешайте настой с сиропом. Процедите через фильтр. Разлейте по бутылкам.', 3);

-- ═══════════════════════════════════════════
-- 5. Травяная дачная
-- ═══════════════════════════════════════════
INSERT INTO recipes (slug, title, subtitle, category, category_label, hero_image, abv, time, difficulty, rating, reviews, year, origin, history_title, history_text, tasting_color, tasting_description, tasting_pairing, tasting_temp, tasting_glass, sweet, sour, bitter, spicy, fruity, herbal, tips, author_name, author_date)
VALUES (
  'travyanaya-dachnaya', 'Травяная дачная', 'Ароматный напиток из садовых трав',
  'herbal', 'Травяная', 'recipe-herbal.jpg', '35%', '14 дней', 'Средне', 4.3, 67,
  'XX век', 'Россия', 'Дачная традиция',
  'Каждый дачник имеет свой рецепт травяной настойки. Классический набор — мята, мелисса, душица. Такие настойки готовили бабушки ещё в советское время.',
  'Светло-зелёный',
  'Свежий травяной букет с мятной прохладой. Лёгкая горчинка и длинное травянистое послевкусие.',
  '["Зелёный салат","Овощи гриль","Козий сыр"]',
  '6-8°C', 'Бокал для аперитива',
  25, 15, 45, 5, 10, 95,
  '["Собирайте травы до цветения","Сушите в тени","Экспериментируйте с пропорциями"]',
  'Татьяна Садовникова', '18.06.2024'
)
ON DUPLICATE KEY UPDATE title=VALUES(title);

SET @rid5 = (SELECT id FROM recipes WHERE slug='travyanaya-dachnaya');
DELETE FROM recipe_ingredients WHERE recipe_id=@rid5;
DELETE FROM recipe_steps WHERE recipe_id=@rid5;

INSERT INTO recipe_ingredients (recipe_id, name, amount, note, sort_order) VALUES
(@rid5, 'Мята свежая', '1 пучок', '', 0),
(@rid5, 'Мелисса', '½ пучка', '', 1),
(@rid5, 'Душица', '3 веточки', '', 2),
(@rid5, 'Водка', '500 мл', '', 3),
(@rid5, 'Сахар', '100 г', '', 4);

INSERT INTO recipe_steps (recipe_id, step_num, title, text, sort_order) VALUES
(@rid5, 1, 'Сбор трав', 'Вымойте и обсушите травы. Крупные листья порвите руками.', 0),
(@rid5, 2, 'Заливка', 'Уложите травы в банку, залейте водкой. Закройте крышкой.', 1),
(@rid5, 3, 'Настаивание', '10-14 дней в тёмном прохладном месте.', 2),
(@rid5, 4, 'Финиш', 'Процедите, добавьте сахарный сироп. Охладите перед подачей.', 3);

-- ═══════════════════════════════════════════
-- 6. Кофейная с корицей
-- ═══════════════════════════════════════════
INSERT INTO recipes (slug, title, subtitle, category, category_label, hero_image, abv, time, difficulty, rating, reviews, year, origin, history_title, history_text, tasting_color, tasting_description, tasting_pairing, tasting_temp, tasting_glass, sweet, sour, bitter, spicy, fruity, herbal, tips, author_name, author_date)
VALUES (
  'kofeinaya-s-koritsey', 'Кофейная с корицей', 'Бодрящий ликёр для вечерних посиделок',
  'sweet', 'Сладкая', 'recipe-coffee.jpg', '28%', '10 дней', 'Легко', 4.7, 156,
  'XX век', 'Россия', 'Кофейная история',
  'Кофейные настойки появились в России в XIX веке. Их подавали в богатых домах как дижестив. Коричная вариация — позднейшее изобретение.',
  'Тёмно-коричневый',
  'Насыщенный кофейный вкус с тёплой ноткой корицы. Кремовая текстура, сладковатое послевкусие.',
  '["Тирамису","Шоколадный фондан","Мороженое"]',
  'Комнатная', 'Ликёрный бокал',
  65, 5, 55, 50, 5, 10,
  '["Используйте свежемолотый кофе","Не заливайте кипятком — спиртом","Корицу можно заменить на ваниль"]',
  'Дмитрий Кофман', '30.09.2024'
)
ON DUPLICATE KEY UPDATE title=VALUES(title);

SET @rid6 = (SELECT id FROM recipes WHERE slug='kofeinaya-s-koritsey');
DELETE FROM recipe_ingredients WHERE recipe_id=@rid6;
DELETE FROM recipe_steps WHERE recipe_id=@rid6;

INSERT INTO recipe_ingredients (recipe_id, name, amount, note, sort_order) VALUES
(@rid6, 'Кофе молотый', '100 г', 'свежемолотый', 0),
(@rid6, 'Спирт 96%', '500 мл', '', 1),
(@rid6, 'Корица', '2 палочки', '', 2),
(@rid6, 'Сахар', '200 г', '', 3),
(@rid6, 'Вода', '200 мл', '', 4);

INSERT INTO recipe_steps (recipe_id, step_num, title, text, sort_order) VALUES
(@rid6, 1, 'Подготовка', 'Смешайте молотый кофе с корицей в стеклянной банке.', 0),
(@rid6, 2, 'Заливка', 'Залейте спиртом, тщательно перемешайте. Закройте крышкой.', 1),
(@rid6, 3, 'Настаивание', '7-10 дней, ежедневно встряхивая.', 2),
(@rid6, 4, 'Финиш', 'Процедите, добавьте сахарный сироп. Перелейте в чистые бутылки.', 3);

SELECT CONCAT('Готово! Рецептов в БД: ', COUNT(*)) AS result FROM recipes;
