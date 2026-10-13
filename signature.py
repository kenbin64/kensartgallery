# One consistent signature on every picture.
#
# The paintings were signed by hand, each a little differently and some cut off
# by the edge of the photograph. For the gallery's web copies, the hand-painted
# signature is painted out and the same signature is put on every picture, in
# the bottom right. The originals in the originals folder are never changed.
#
# Two steps, used by make-images.py:
#   erase(picture, box)   paints out the old signature inside `box`
#   sign(picture)         puts the one signature on, white on a dark picture
#                         and black on a light one
#
# The one signature is brand/signature.png: the signature from "Two Men
# Playing Chess in Park", lifted off its dark background. make_signature()
# made it; it only needs running again if a different signature is wanted.
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '.pylib'))          # where the picture-repair library (OpenCV) is kept, inside this project
import cv2
import numpy as np
from PIL import Image

SIGNATURE = os.path.join(HERE, 'brand', 'signature.png')


def make_signature(source, box):
    """Lifts a light signature off a dark background. The result is a see-through picture:
    solid where the paint of the signature was, clear everywhere else."""
    im = Image.open(source).convert('L')
    w, h = im.size
    grey = np.asarray(im.crop((int(w * box[0] / 100), int(h * box[1] / 100), int(w * box[2] / 100), int(h * box[3] / 100))), dtype=np.float32)
    solid = np.clip((grey - 95) / (175 - 95), 0, 1)                 # dark background clear, bright paint solid
    # Keep only the strokes of the signature, not stray light specks of the painting around it.
    count, labels, stats, _ = cv2.connectedComponentsWithStats((solid > 0.5).astype(np.uint8), connectivity=8)
    keep = np.zeros_like(solid, dtype=bool)
    for n in range(1, count):
        if stats[n, cv2.CC_STAT_AREA] >= 40:
            keep |= labels == n
    keep = cv2.dilate(keep.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    solid = np.where(keep, solid, 0)
    ys, xs = np.nonzero(solid > 0.05)
    solid = solid[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray((solid * 255).astype(np.uint8), 'L').save(SIGNATURE)
    return solid.shape


def erase(picture, box):
    """Paints out the old signature. `box` is [left, top, right, bottom] in percent of the picture.
    A piece of the painting the same size as the box is copied over it, from just above the box
    or just beside it, and its tones are then blended into the paint all round the box so no edge
    shows. So the signature is replaced with the painting's own brushwork and canvas grain, not
    with a blur. Of the pieces it could copy, it takes the plainest: a stretch of plain ground
    copied twice passes unnoticed, where a wagon wheel copied twice would not.
    Returns the new picture and a word for where the piece came from."""
    rgb = np.asarray(picture.convert('RGB')).copy()
    h, w = rgb.shape[:2]
    x0, y0, x1, y1 = int(w * box[0] / 100), int(h * box[1] / 100), min(w, int(round(w * box[2] / 100))), min(h, int(round(h * box[3] / 100)))
    tall, wide = y1 - y0, x1 - x0
    # The pieces it could copy: the strip above (as it is, or upside down so it joins along the top edge),
    # and the piece to the left (as it is, or turned left to right so it joins along the left edge).
    choices = {}
    if y0 - tall >= 0:
        above = rgb[y0 - tall:y0, x0:x1]
        choices['above, turned over'] = above[::-1]
        choices['above'] = above
    if x0 - wide >= 0:
        beside = rgb[y0:y1, x0 - wide:x0]
        choices['beside, turned round'] = beside[:, ::-1]
        choices['beside'] = beside
    if not choices:
        return picture, 'left as it was'
    def busy(piece):                                                 # how much is going on in a piece: the average change from one pixel to the next
        grey = cv2.GaussianBlur(cv2.cvtColor(np.ascontiguousarray(piece), cv2.COLOR_RGB2GRAY), (0, 0), 3).astype(np.float32)
        return float(np.abs(np.diff(grey, axis=0)).mean() + np.abs(np.diff(grey, axis=1)).mean())
    name = min(choices, key=lambda k: busy(choices[k]) * (1.0 if 'turned' in k else 1.08))     # a turned piece joins better, so it wins a near tie
    patch = np.ascontiguousarray(choices[name])
    # Work on a copy with a mirrored border, so a box that touches the picture's edge can still be blended all round.
    m = max(8, tall // 3)
    wider = cv2.copyMakeBorder(rgb, m, m, m, m, cv2.BORDER_REFLECT_101)
    mask = np.full((tall, wide), 255, np.uint8)
    blended = cv2.seamlessClone(patch, wider, mask, (m + (x0 + x1) // 2, m + (y0 + y1) // 2), cv2.NORMAL_CLONE)
    return Image.fromarray(blended[m:m + h, m:m + w]), name


def sign(picture):
    """Puts the one signature in the bottom right. White, unless the picture is light there: then black."""
    shape = Image.open(SIGNATURE)
    w, h = picture.size
    longest = max(w, h)
    wide = min(round(longest * 0.125), round(w * 0.34))
    shape = shape.resize((wide, max(1, round(shape.height * wide / shape.width))), Image.LANCZOS)
    edge = round(longest * 0.022)
    x, y = w - edge - shape.width, h - edge - shape.height
    # How light the picture is exactly where the strokes will go (not in the gaps between them).
    under = np.asarray(picture.convert('L').crop((x, y, x + shape.width, y + shape.height)), dtype=np.float32)
    strokes = np.asarray(shape, dtype=np.float32)
    light = float((under * strokes).sum() / max(1.0, strokes.sum())) > 124
    ink = Image.new('RGB', shape.size, (22, 18, 16) if light else (246, 242, 232))
    out = picture.convert('RGB').copy()
    out.paste(ink, (x, y), shape.point(lambda a: a * 94 // 100))
    return out, ('black' if light else 'white')


if __name__ == '__main__':
    # Make brand/signature.png from the chess painting:  python signature.py
    print('signature made, size', make_signature(os.path.join(HERE, 'originals', 'chess.jpg'), [83.5, 94.6, 96, 99.2]))
