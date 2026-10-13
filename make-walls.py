# Turns the wall photographs in the walls folder into tiles the gallery can
# repeat across a page of any size with no visible seam.
#
# Some of the photographs already join up with themselves at the edges, and
# those are used as they are. Where an edge does not join, the picture is laid
# beside its mirror image in that direction, which always joins. Mirroring is
# only used where it is needed, because it leaves a faint symmetrical pattern.
#
# Called by build.js. The originals are read and never changed.
import os
import numpy as np
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'walls')
OUT = os.path.join(HERE, 'site', 'walls')
os.makedirs(OUT, exist_ok=True)

# name: (file in the walls folder, the part to keep as left, top, right, bottom or None for all of it, width of one copy in pixels)
WALLS = {
    'stucco': ('stucco.jpg', None, 900),
    'stone': ('stone.jpg', (0, 90, 1024, 470), 1000),      # the photograph is blurred above and below this band
    'brick': ('brick.png', None, 760),
    'tile': ('tile.jpg', None, 820),
    'mosaic': ('mosaic.png', (0, 70, 1024, 1024), 820),     # the top strip carries a maker's badge, so it is left out
}

def joins(a, b, inside):
    """True when edge `a` meets edge `b` about as smoothly as neighbouring lines do inside the picture."""
    seam = np.abs(a.astype(float) - b.astype(float)).mean()
    return seam <= inside * 1.6

for name, (file, keep, width) in WALLS.items():
    im = Image.open(os.path.join(SRC, file)).convert('RGB')
    if keep:
        im = im.crop(keep)
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    px = np.asarray(im)
    # How much one line differs from the next, inside the picture, across and down.
    inside_x = np.abs(px[:, 1:].astype(float) - px[:, :-1].astype(float)).mean()
    inside_y = np.abs(px[1:].astype(float) - px[:-1].astype(float)).mean()
    mirror_x = not joins(px[:, -1], px[:, 0], inside_x)
    mirror_y = not joins(px[-1], px[0], inside_y)
    tile = im
    if mirror_x:
        wide = Image.new('RGB', (tile.width * 2, tile.height)); wide.paste(tile, (0, 0)); wide.paste(ImageOps.mirror(tile), (tile.width, 0)); tile = wide
    if mirror_y:
        tall = Image.new('RGB', (tile.width, tile.height * 2)); tall.paste(tile, (0, 0)); tall.paste(ImageOps.flip(tile), (0, tile.height)); tile = tall
    tile.save(os.path.join(OUT, name + '.jpg'), 'JPEG', quality=76, optimize=True, progressive=True)
    small = im.copy(); small.thumbnail((120, 120))
    small.save(os.path.join(OUT, name + '-dot.jpg'), 'JPEG', quality=80)
    how = 'as it is' if not (mirror_x or mirror_y) else 'mirrored ' + ' and '.join(d for d, m in (('across', mirror_x), ('down', mirror_y)) if m)
    print(f'{name}|{tile.width}|{tile.height}|{os.path.getsize(os.path.join(OUT, name + ".jpg")) // 1024}|{how}|{width}')
