UPDATE label_templates
SET is_base = 1,
    zones = JSON_ARRAY(
      JSON_OBJECT('id', 'image', 'x', 78, 'y', 158, 'w', 933, 'h', 797),
      JSON_OBJECT('id', 'imageMask', 'url', '/assets/label-templates/label-template-base/design_mask.png'),
      JSON_OBJECT('id', 'title', 'x', 140, 'y', 1030, 'w', 799, 'h', 110, 'fontSize', 50, 'align', 'center'),
      JSON_OBJECT('id', 'date', 'x', 230, 'y', 1150, 'w', 233, 'h', 90, 'fontSize', 50, 'align', 'center'),
      JSON_OBJECT('id', 'strength', 'x', 601, 'y', 1150, 'w', 240, 'h', 90, 'fontSize', 50, 'align', 'center')
    )
WHERE id = 1;

-- Остальные шаблоны — статичные картинки, никаких зон/полей
UPDATE label_templates
SET zones = NULL, is_base = 0
WHERE id <> 1;
