UPDATE label_templates
SET zones = JSON_ARRAY(
  JSON_OBJECT('id', 'image', 'x', 194, 'y', 258, 'w', 700, 'h', 598),
  JSON_OBJECT('id', 'title', 'x', 140, 'y', 966, 'w', 799, 'h', 110, 'fontSize', 116, 'align', 'center'),
  JSON_OBJECT('id', 'date', 'x', 230, 'y', 1101, 'w', 233, 'h', 90, 'fontSize', 58, 'align', 'center'),
  JSON_OBJECT('id', 'strength', 'x', 601, 'y', 1101, 'w', 240, 'h', 90, 'fontSize', 58, 'align', 'center')
)
WHERE id = 1;
