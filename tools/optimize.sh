#!/bin/bash
# 生图后处理：背景 png→jpg(1920w q80)，贴纸 png 缩到 900px 内
cd "$(dirname "$0")/../assets/art" || exit 1
BGS="cover_bg map_bg l1_bg l2_noon l2_dawn l2_dusk l2_night l3_bg l4_seed l4_sprout l4_sapling l4_tree l4_bg l5_bg l5_blink l5_brush l5_sleep l6_bg l7_morning l7_noon l7_dusk l7_night l7_bg l8_bg l9_spring l9_summer l9_autumn l9_winter l10_bg l11_bg l12_bg"
STICKERS="girl_kid l1_earth l1_sun l3_hourglass l3_button l6_clock l8_lantern l10_baby l10_adult l10_old l11_glass l11_egg l11_egg_broken"
for k in $BGS; do
  [ -f "$k.png" ] && magick "$k.png" -resize '1920x1920>' -quality 80 "$k.jpg" && rm "$k.png" && echo "jpg: $k"
done
for k in $STICKERS; do
  [ -f "$k.png" ] && magick "$k.png" -resize '900x900>' "$k.png" && echo "png: $k"
done
echo "--- 总体积:"; du -sh .
