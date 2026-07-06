UPDATE label_templates
SET zones = JSON_OBJECT(
  'mask', JSON_OBJECT(
    'designMaskUrl', '/assets/label-templates/label-template-base/design_mask.png',
    'frameOverlayUrl', '/assets/label-templates/label-template-base/frame_overlay.png',
    'designBbox', JSON_ARRAY(58, 57, 1029, 977)
  ),
  'fields', JSON_OBJECT(
    'name', JSON_OBJECT('x', 140, 'y', 1050, 'width', 799, 'height', 56, 'align', 'center', 'valign', 'bottom', 'size', 40),
    'date', JSON_OBJECT('x', 230, 'y', 1160, 'width', 233, 'height', 56, 'align', 'center', 'valign', 'bottom', 'size', 26),
    'strength', JSON_OBJECT('x', 601, 'y', 1160, 'width', 240, 'height', 56, 'align', 'right', 'valign', 'bottom', 'size', 26)
  )
)
WHERE id = 1;
