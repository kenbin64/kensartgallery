# Makes the web copies of each artwork: a large one for its own page and a
# small one for the gallery wall. The originals are read and never changed.
#
# Called by build.js with a list of "id|source path|corner" lines on standard
# input. Prints "id|width|height|..." for each, so the pages can reserve the
# right space.
#
# THE WATERMARK
# Every web copy carries a small mark in one corner: the gallery's K emblem and
# its address. It is there so that a copy saved from the site still says where
# it came from. It is kept small and partly see-through so it does not spoil
# the picture, which also means it can be cropped off by someone who sets out
# to: it deters casual copying, it does not prevent copying. The mark goes in
# the bottom left by default, because the artist's signature is usually in the
# bottom right. A work can ask for another corner in works.js with
# mark: 'right', or for none with mark: 'none'.
#
# THE SIGNATURE
# The paintings were signed by hand, each differently. On the web copies the
# hand-painted signature is painted out (where signatures.json says there is
# one) and the same signature is put on every picture in the bottom right:
# white, or black where the picture is light there. signature.py does both.
# A work can ask for no signature in works.js with sign: false.
#
# The emblem is cut from the sprite sheet in the brand folder. It is also saved
# on its own for the top of each page and the browser tab.
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'site', 'img')
BRAND = os.path.join(HERE, 'site', 'brand')
os.makedirs(OUT, exist_ok=True)
os.makedirs(BRAND, exist_ok=True)
LARGE, SMALL = 1800, 720           # longest side, in pixels
sys.path.insert(0, HERE)
import signature
OLD_SIGNATURES = json.load(open(os.path.join(HERE, 'signatures.json'), encoding='utf8'))
ADDRESS = 'kensartgallery.com'


def cut_out(sheet, box):
    """One sprite from the sheet, with the sheet's slate background made see-through.
    The background is found by spreading in from the four corners of the box."""
    sprite = sheet.crop(box).convert('RGBA')
    w, h = sprite.size
    for corner in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(sprite, corner, (0, 0, 0, 0), thresh=46)
    return sprite.crop(sprite.getbbox())


sheet = Image.open(os.path.join(HERE, 'brand', 'spritesheet.jpg')).convert('RGB')
emblem = cut_out(sheet, (914, 290, 1024, 420))             # the K in its wooden frame
banner = cut_out(sheet, (418, 338, 706, 424))              # "KENS ART GALLERY" with the building and the K
emblem.save(os.path.join(BRAND, 'k.png'))
banner.save(os.path.join(BRAND, 'banner.png'))
emblem.resize((64, 64), Image.LANCZOS).save(os.path.join(BRAND, 'icon.png'))


def font(size):
    for name in ('georgia.ttf', 'DejaVuSerif.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def watermark(picture, corner):
    """Returns the picture with the emblem and the address in one bottom corner."""
    if corner == 'none':
        return picture
    longest = max(picture.size)
    tall = max(22, round(longest * 0.042))                 # the emblem's height
    gap = round(tall * 0.28)
    edge = round(longest * 0.016)                          # how far in from the picture's edge
    k = emblem.resize((round(emblem.width * tall / emblem.height), tall), Image.LANCZOS)
    letters = font(max(11, round(tall * 0.46)))
    left, top, right, bottom = letters.getbbox(ADDRESS)
    wide = k.width + gap + (right - left)
    layer = Image.new('RGBA', picture.size, (0, 0, 0, 0))
    x = edge if corner != 'right' else picture.width - edge - wide
    y = picture.height - edge - tall
    # A soft dark shadow behind the letters, so they read on a light picture as well as a dark one.
    shadow = Image.new('RGBA', picture.size, (0, 0, 0, 0))
    text_at = (x + k.width + gap - left, y + (tall - (bottom - top)) // 2 - top)
    ImageDraw.Draw(shadow).text(text_at, ADDRESS, font=letters, fill=(0, 0, 0, 200))
    layer.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(max(1, tall / 14))))
    ImageDraw.Draw(layer).text(text_at, ADDRESS, font=letters, fill=(255, 255, 255, 215))
    layer.alpha_composite(k, (x, y))
    # The whole mark is laid on at about three quarters strength.
    layer.putalpha(layer.getchannel('A').point(lambda a: a * 3 // 4))
    return Image.alpha_composite(picture.convert('RGBA'), layer).convert('RGB')


for line in sys.stdin.read().splitlines():
    if not line.strip():
        continue
    work_id, source, corner, signed = (line.split('|') + ['left', 'yes'])[:4]
    im = ImageOps.exif_transpose(Image.open(source)).convert('RGB')      # turned the right way up, as the camera recorded it
    # The old signature comes off the full-size picture once, before the copies are made, so the repair is as fine as it can be.
    clean, how = (signature.erase(im, OLD_SIGNATURES[work_id]) if signed != 'no' and work_id in OLD_SIGNATURES else (im, ''))
    ink = ''
    for name, longest in ((work_id + '.jpg', LARGE), (work_id + '-small.jpg', SMALL)):
        copy = clean.copy()
        copy.thumbnail((longest, longest), Image.LANCZOS)      # never enlarges a small original
        if signed != 'no':
            copy, ink = signature.sign(copy)
        watermark(copy, corner or 'left').save(os.path.join(OUT, name), 'JPEG', quality=88, optimize=True, progressive=True)
    big = im.copy(); big.thumbnail((LARGE, LARGE), Image.LANCZOS)
    # A fingerprint of the picture: it is shrunk to 16 by 16 greys and each one marked as lighter
    # or darker than the average. Two photographs of the same painting give nearly the same marks,
    # even at different sizes or brightness, so build.js can spot a painting hung twice.
    tiny = im.convert('L').resize((16, 16), Image.LANCZOS)
    greys = list(tiny.tobytes()); mean = sum(greys) / len(greys)
    marks = ''.join('1' if g > mean else '0' for g in greys)
    # The picture's overall colour (red, green, blue, each 0 to 255), used to choose a frame that suits it.
    r, g, b = im.resize((1, 1), Image.BOX).getpixel((0, 0))
    print(f'{work_id}|{big.width}|{big.height}|{im.width}|{im.height}|{marks}|{r},{g},{b}|{ink}|{how}')
