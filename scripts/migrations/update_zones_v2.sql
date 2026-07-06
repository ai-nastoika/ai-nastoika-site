UPDATE label_templates
SET zones = JSON_SET(
  zones,
  '$.fields.name.size', 50,
  '$.fields.name.pad_bottom', 18,
  '$.fields.strength.align', 'center',
  '$.fields.strength.x', 601,
  '$.fields.strength.width', 240
)
WHERE id = 1;
