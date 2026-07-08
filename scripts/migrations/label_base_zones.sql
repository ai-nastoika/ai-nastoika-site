-- Единый файл настройки zones для базового шаблона (id=1).
-- При любых будущих правках координат/шрифта/размеров — редактируем ЭТОТ
-- файл и накатываем заново, не создаём adjust_zones_v2/v3... отдельными файлами.

UPDATE label_templates
SET zones = JSON_ARRAY(
  JSON_OBJECT('id', 'image', 'x', 194, 'y', 258, 'w', 700, 'h', 598),
  JSON_OBJECT('id', 'title', 'x', 140, 'y', 992, 'w', 799, 'h', 110, 'fontSize', 77, 'align', 'center'),
  JSON_OBJECT('id', 'date', 'x', 230, 'y', 1121, 'w', 233, 'h', 90, 'fontSize', 58, 'align', 'center'),
  JSON_OBJECT('id', 'strength', 'x', 601, 'y', 1121, 'w', 240, 'h', 90, 'fontSize', 58, 'align', 'center')
)
WHERE id = 1;
