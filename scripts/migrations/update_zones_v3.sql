UPDATE label_templates
SET zones = JSON_SET(
  zones,
  '$.fields.name.weight', 'bold',
  '$.fields.date.size', 50,
  '$.fields.date.weight', 'bold',
  '$.fields.strength.size', 50,
  '$.fields.strength.weight', 'bold'
)
WHERE id = 1;
