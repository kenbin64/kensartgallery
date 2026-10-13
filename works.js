// The works in the gallery. This is the one file to edit when a piece is added,
// renamed, sold or removed. Run  node build.js  afterwards.
//
// For each work:
//   id         a short name used in the page address, e.g. "bringing-in-the-herd"
//   title      shown under the picture
//   file       where the image is on this computer (it is copied and resized, never changed)
//   kind       'painting' (made by hand) or 'digital' (an image made on a computer)
//   basedOn    on a painting: the id of the digital image it was based on. Each page then points to the other.
//   medium     e.g. "Acrylic on canvas"        (optional: left out of the page when empty)
//   size       e.g. "16 x 20 in"               (optional)
//   year       e.g. "2024"                     (optional)
//   status     'available', 'sold' or 'nfs' (not for sale). Empty shows nothing.
//   about      a sentence or two about the piece (optional)
//   buy        the full address of this piece where it is sold, e.g. 'https://...'. Adds a
//              Buy button to its page. Left out, the page has the enquiry form only.
//   linkFound  true where I found the listing by searching, and Ken has not yet confirmed it is the right one
//   mark       the corner the small watermark goes in: 'left' (the usual, clear of a signature in the
//              bottom right), 'right', or 'none' for no watermark on this picture
//   sign       false to leave this picture without the gallery's signature (and with its own, if it has one).
//              AI-generated images (kind 'digital') never get the watermark or the signature: Ken's rule, 2026-10-12.
//              Every other picture gets the one signature in the bottom right; see signature.py
//   buyLabel the words on that button, if "Buy on <shop>" does not suit, e.g. 'Buy a print'
//   show       false keeps a work out of the gallery without deleting its entry
//   frame      leave this out and the build chooses the frame that suits the picture's own colours.
//              To choose it yourself, write 'gold', 'wood', 'oak', 'black' or 'white'.
//   mount      true puts a white card mount between the frame and the picture.
//              Left out, digital pieces have one and paintings do not.
//
// "provisional: true" means the title was guessed, from the file name or from
// what is in the picture. Ken to confirm or replace.
'use strict';
const OWN = __dirname + '/originals/';                       // the photographs of the paintings Ken named, copied into this project
const ART = 'C:/Users/kbingh/Pictures/fasttrackart/';

const WORKS = [
  // ── Paintings ────────────────────────────────────────────────────────────
  // Photographs supplied by Ken on 8 October 2026. Titles come from his file
  // names unless marked provisional. On 10 October 2026 Ken asked for every title to be
  // three words at most; the long ones were shortened and are marked provisional.
  { id: 'bringing-in-the-herd', title: 'Desert Cattle Drive', file: OWN + 'bringing-in-the-herd.jpg', kind: 'painting', buy: 'https://fineartamerica.com/featured/cowboy-leading-cattle-through-desert-kenneth-bingham.html', linkFound: true, provisional: true },
  { id: 'castle', title: 'Castle', file: OWN + 'castle.jpg', kind: 'painting' },
  { id: 'chess', title: 'The Chess Game', file: OWN + 'chess.jpg', kind: 'painting', buy: 'https://fineartamerica.com/featured/two-men-playing-chess-in-park-kenneth-bingham.html', linkFound: true, provisional: true },
  { id: 'train', title: 'Train', file: OWN + 'train.jpg', kind: 'painting' },
  { id: 'lighthouse', title: 'The Lighthouse', file: OWN + 'lighthouse.jpg', kind: 'painting', buy: 'https://fineartamerica.com/featured/lighthouse-illuminating-stormy-sea-kenneth-bingham.html', provisional: true },
  { id: 'gethsemane', title: 'Prayer in Gethsemane', file: OWN + 'gethsemane.jpg', kind: 'painting', buy: 'https://fineartamerica.com/featured/jesus-in-prayer-with-radiant-light-kenneth-bingham.html', linkFound: true, provisional: true },
  { id: 'cabin', title: 'Mountain Cabin', file: OWN + 'cabin.jpg', kind: 'painting' },
  { id: 'the-well', title: 'Woman at the Well', file: OWN + 'well.png', kind: 'painting', buy: 'https://fineartamerica.com/featured/young-woman-fetching-water-from-well-kenneth-bingham.html', linkFound: true },
  { id: 'moose', title: 'Majestic Møøse', file: OWN + 'moose.jpg', kind: 'painting' },
  { id: 'delicate-arch', title: 'Delicate Arch', file: OWN + 'delicate-arch.jpg', kind: 'painting' },
  { id: 'union-station', title: 'Union Station', file: OWN + 'union-station.jpg', kind: 'painting' },
  { id: 'ogden', title: 'Ogden', file: OWN + 'ogden.jpg', kind: 'painting' },
  { id: 'dees-hamburgers', title: "Dee's", file: OWN + 'dees-hamburgers.jpg', kind: 'painting' },
  { id: 'cinedome', title: 'Cinedome', file: OWN + 'cinedome.jpg', kind: 'painting', provisional: true },
  { id: 'farm', title: 'Farm', file: OWN + 'farm.jpg', kind: 'painting' },
  { id: 'rainy-day', title: 'Rainy Day', file: OWN + 'rainy-day.jpg', kind: 'painting', provisional: true },       // his file names: "rainyday" and "sunflowers"
  { id: 'voyage', title: 'Bon Voyage', file: OWN + 'voyage.jpg', kind: 'painting', buy: 'https://fineartamerica.com/featured/ship-at-sea-near-majestic-mountain-kenneth-bingham.html', linkFound: true },
  { id: 'astronaut', title: 'Astronaut', file: OWN + 'astronaut.jpg', kind: 'painting' },
  { id: 'fish', title: 'Fish', file: OWN + 'fish.jpg', kind: 'painting' },
  { id: 'parrot', title: 'Parrot in Paradise', file: OWN + 'parrot.jpg', kind: 'painting', buy: 'https://fineartamerica.com/featured/tropical-paradise-with-parrot-kenneth-bingham.html', linkFound: true, provisional: true },
  { id: 'rained-out', title: 'Rained Out', file: OWN + 'rained-out.jpg', kind: 'painting', buy: 'https://fineartamerica.com/featured/baseball-player-on-rainy-field-kenneth-bingham.html', linkFound: true, provisional: true },
  { id: 'the-edmund-fitzgerald', title: 'The Edmund Fitzgerald', file: OWN + 'edmund-fitzgerald.jpg', kind: 'painting', provisional: true },
  { id: 'flowers', title: 'Flowers', file: OWN + 'flowers.jpg', kind: 'painting' },
  { id: 'cherries', title: 'Cherries', file: OWN + 'cherries.jpg', kind: 'painting' },
  { id: 'peaches', title: 'Peaches', file: OWN + 'peaches.jpg', kind: 'painting' },
  { id: 'fruit', title: 'Fruit', file: OWN + 'fruit-basket.jpg', kind: 'painting' },
  // Added 2026-10-13. The title is mine, from what it shows. It is the painting made from the digital image of the same scene.
  { id: 'chessboard-in-the-park', title: 'Chessboard in the Park', file: OWN + 'chessboard-in-the-park.jpg', kind: 'painting', provisional: true },
  { id: 'three-pigs', title: 'Three Little Pigs', file: OWN + 'three-pigs.jpg', kind: 'painting', buy: 'https://fineartamerica.com/featured/three-little-pigs-in-overalls-kenneth-bingham.html', linkFound: true, provisional: true },
  { id: 'the-bridge', title: 'Enchanted Forest Bridge', file: OWN + 'the-bridge.jpg', kind: 'painting', buy: 'https://fineartamerica.com/featured/enchanted-forest-bridge-kenneth-bingham.html' },

  // ── Paintings found earlier that Ken has not yet named. Shown until he says otherwise. ──
  { id: 'dragons-lair', title: 'Dragon', file: OWN + 'dragon.jpg', kind: 'painting' },
  { id: 'farm-girl', title: 'Farm Girl', file: OWN + 'farm-girl.jpg', kind: 'painting' },
  { id: 'puppy', title: 'Puppydog Eyes', file: OWN + 'puppy.jpg', kind: 'painting' },
  { id: 'dutch-harbor', title: 'Dutch Harbor', file: OWN + 'dutch-harbor.jpg', kind: 'painting' },
  { id: 'on-the-summit', title: 'On the Summit', file: ART + 'together.png', kind: 'painting', buy: 'https://fineartamerica.com/featured/couple-celebrating-on-mountain-summit-kenneth-bingham.html', linkFound: true, provisional: true },
  { id: 'bear', title: 'Fishing Bear', file: ART + 'bear.png', kind: 'painting', buy: 'https://fineartamerica.com/featured/bear-catching-fish-in-rapids-kenneth-bingham.html', linkFound: true, provisional: true },

  // Added 2026-10-10. Titles are mine, from what each shows.
  { id: 'at-the-bar', title: 'At the Bar', file: OWN + 'at-the-bar.jpg', kind: 'painting', provisional: true },
  { id: 'steam-train', title: 'Steam Train', file: OWN + 'steam-train.jpg', kind: 'painting', provisional: true },

  // ── Digital images ───────────────────────────────────────────────────────
  // Images made on a computer. Some are the image a painting was based on. Where
  // Ken confirms that, the painting gets  basedOn: '<the digital image's id>'  and
  // each page then points to the other. None is linked yet: the pairs I can see
  // are listed beside the entries below for him to confirm.
  { id: 'lighthouse-image', title: 'Lighthouse', file: ART + 'lighthouse (2).png', kind: 'digital', provisional: true },          // pair? painting "lighthouse"
  { id: 'rained-out-image', title: 'Rained Out', file: ART + 'rainedout.png', kind: 'digital', provisional: true },              // pair? painting "rained-out"
  { id: 'the-well-image', title: 'The Well', file: ART + 'womanatthewell.png', kind: 'digital', provisional: true },             // pair? painting "the-well"
  { id: 'parrot-image', title: 'Parrot', file: 'C:/Users/kbingh/Pictures/parot3D.jpg', kind: 'digital', provisional: true },     // pair? painting "parrot"
  { id: 'gethsemane-image', title: 'Gethsemane', file: OWN + 'jesus.jpg', kind: 'digital', provisional: true },                  // pair? painting "gethsemane"
  { id: 'together', title: 'Together', file: OWN + 'together.jpg', kind: 'digital', provisional: true },          // in the AI room                         // pair? painting "on-the-summit"
  { id: 'the-wave', title: 'The Wave', file: 'C:/Users/kbingh/Pictures/Wave.jpg', kind: 'digital', provisional: true },
  { id: 'goblin-valley-utah', title: 'Goblin Valley, Utah', file: OWN + 'goblin-valley-utah.jpg', kind: 'digital' },
  { id: 'golden-city', title: 'Golden City', file: ART + 'Golden city of curve.png', kind: 'digital', provisional: true },
  { id: 'geometry', title: 'Geometry', file: ART + 'geometry.png', kind: 'digital', provisional: true },
  { id: 'seashell', title: 'Seashell', file: ART + 'seashell.png', kind: 'digital', provisional: true },
  { id: 'artemis', title: 'Artemis', file: ART + 'Artimus.png', kind: 'digital', provisional: true },
  // Added 2026-10-09. Titles are mine, from what each shows, except Communion, which is written on the picture.
  { id: 'the-shepherd', title: 'The Shepherd', file: OWN + 'ai-shepherd.png', kind: 'digital', provisional: true },   // in the AI room; the file Ken named on 2026-10-12
  { id: 'chess-in-the-city', title: 'Chess in the City', file: OWN + 'chess-in-the-city.png', kind: 'digital', provisional: true },
  { id: 'wagon-train', title: 'Wagon Train', file: OWN + 'wagon-train.png', kind: 'digital', provisional: true },
  { id: 'tropical-sunset', title: 'Tropical Sunset', file: OWN + 'tropical-sunset.png', kind: 'digital', provisional: true },
  { id: 'pyramid-of-light', title: 'Pyramid of Light', file: OWN + 'ai-pyramid.png', kind: 'digital', provisional: true },   // in the AI room; the file Ken named on 2026-10-12
  // Added 2026-10-12 for the AI room. "Atonement" is Ken's own file name; "Phoenix Rising" is my title.
  { id: 'atonement', title: 'Atonement', file: OWN + 'atonement.png', kind: 'digital' },
  { id: 'phoenix-rising', title: 'Phoenix Rising', file: OWN + 'phoenix-rising.png', kind: 'digital', provisional: true },
  { id: 'christmas-village', title: 'Christmas Village', file: OWN + 'christmas-village.png', kind: 'digital', provisional: true },
  { id: 'communion', title: 'Communion', file: OWN + 'communion.jpg', kind: 'digital' },

  // ── Kept out of the gallery ──────────────────────────────────────────────
  // A second, smaller and brighter photograph of a painting already on the wall.
  { id: 'herd-listing-copy', title: 'Desert Cattle Drive (listing copy)', file: OWN + 'cowboy-listing-copy.jpg', kind: 'painting', show: false },
];

const SITE = {
  name: 'Ken Bingham',
  // The wall the gallery opens on. Plain: 'grey' (the gallery standard), 'white', 'plaster' (off-white), 'greige', 'charcoal', 'navy'.
  // Photographs: 'stucco', 'stone', 'brick', 'tile', 'mosaic'.
  // Visitors can change it for themselves; this is what they see first.
  wall: 'grey',
  tagline: 'Paintings',
  // DIGITAL IMAGES. Ken's decision, 2026-10-10: the gallery is a showcase of his own paintings only. While this is
  // false, no digital image is shown anywhere and nothing on the site mentions them. The images stay listed above,
  // so setting it to true (and restoring the tagline and the statement below) would bring them back.
  showDigital: true,
  // THE SELECTION. The gallery shows only the works named here, in this order (which is the order they hang in
  // as you walk through). Chosen 2026-10-10 as the strongest twenty. Every other painting stays listed above and
  // is simply not shown: add its id here to hang it, or delete this whole list to show everything again.
  selection: [
    'bringing-in-the-herd',                                              // the centrepiece
    'lighthouse', 'steam-train', 'at-the-bar', 'dutch-harbor',           // first room
    'cinedome', 'dees-hamburgers', 'union-station', 'cabin',
    'moose', 'the-bridge', 'voyage', 'rainy-day',
    'delicate-arch', 'puppy', 'cherries', 'peaches', 'rained-out', 'parrot', 'the-well',
    'chess',                                                             // a twenty-first painting, so the paintings fill their rooms and the AI room holds only AI images
    // Four more paintings, added 2026-10-13 at Ken's request. Four keeps the rooms full, so the AI room still holds only AI images.
    'chessboard-in-the-park', 'three-pigs', 'castle', 'flowers',
    // THE AI ROOM (Ken, 2026-10-12): the last room, named "AI-generated images", so visitors know what they are.
    // The best five of the nine he offered, in hanging order. No watermark and no signature on any of them.
    'together', 'pyramid-of-light', 'phoenix-rising', 'the-shepherd', 'atonement',
  ],
  // THE CENTREPIECE. The id of the one work that is given pride of place: large at the top of the opening page,
  // and on a wall of its own facing you as you come in to the 3D gallery. Leave it out and no work is singled out.
  featured: 'bringing-in-the-herd',
  // HOW THE WORK WAS MADE. Ken's own statement, 2026-10-09, reworded at his request on 2026-10-12: the site must not
  // say "none was made by AI", because for some paintings the reference picture of the subject was made with AI.
  // What is true of every painting is that it was painted by hand. Ken's account, 2026-10-12: six were painted from
  // photographs and the rest from AI-generated images he conceived and directed (subject, composition, back story,
  // golden ratio, color palette, artistic expression). He asked for a general statement, not a note on each painting. It is shown on the About page and in short at the
  // foot of every page. `madeShort` is the one-line form;
  // `paintingNote` and `digitalNote` are shown on each work's own page.
  made: [
    'Every painting in this gallery is an original, painted by my own hand.',
    'Each one began with a reference image. Some are photographs. The others are images generated with AI, which I conceived and directed. The subject, the composition, the story behind it, proportions drawn from the golden ratio, the color palette and the look and feel of the piece are all mine.',
    'The reference is where a painting starts. The painting is the work, and every brushstroke of it is mine.',
    'The pictures of the paintings shown here are photographs prepared for the web: each carries the gallery\'s watermark, and one consistent signature placed digitally in the lower right in place of the hand-painted one. The painting itself is signed by hand.',
  ],
  madeShort: 'Every painting is an original, painted by hand by Ken Bingham, from photographs and from images he conceived and directed with AI.',
  paintingNote: 'An original painting, painted by hand by Ken Bingham.',
  digitalNote: 'An image generated with AI, conceived and directed by Ken Bingham. It is not a painting, and it carries no signature.',
  // COPYRIGHT AND USE. Ken's terms, 2026-10-09. `rights` is the line at the foot of every page; `use` is the
  // full terms, shown on the About page and at the end of the 3D gallery.
  rights: '\u00a9 2026 Ken Bingham. All rights reserved, except as allowed by fair use.',
  use: [
    'You may share an image from this gallery, with attribution to Ken Bingham, as long as the watermark and the signature stay visible.',
    'You may not make prints of any image, and you may not sell any image.',
  ],
  // CONTACT. Visitors get in touch through a form on the About page and on every picture's page. The form
  // sends its message through the server, which emails it on. The email address itself is NOT written here
  // or in any page, so it cannot be collected from the site: it is set in wrangler.jsonc, on the server side.
  contact: { name: 'Ken Bingham', linkedin: 'https://www.linkedin.com/in/kenneth-bingham-11378b10' },
  // SELLING. While this is false the gallery shows nothing to do with sales: no Shop link, no buy
  // buttons, no "for sale" or "available" marks. Visitors get a contact link instead. The shop and
  // the buy addresses below stay in this file, so setting it to true brings them all back.
  selling: false,
  // The service the work is sold through. Fill in both and a Shop link appears at the top of
  // every page, and each work with a `buy` address gets a "Buy on <name>" button.
  shop: { name: 'Fine Art America', url: 'https://fineartamerica.com/profiles/kenneth-bingham' },
  // Shown on the About page. Only what is known to be true; Ken to extend.
  about: [
    'Ken Bingham paints and programs, and does not see them as separate.',
    'A painting is logic you can feel. A program is art you can run. Both are patterns arranged on purpose.',
  ],
};

// THE CINEMA (Ken, 2026-10-12): short films in which pictures from the gallery are set in motion.
// The films are in this project's cinema folder, each with a still of the same name for the page to show
// before it plays. For each film:
//   id      the file name, without ".mp4"
//   title   shown under the screen
//   about   one sentence about it
//   work    the id of the painting it shows, if there is one. The page then links to that painting.
// Ken asked for OpenArt to be credited for the animation; that credit is `credit` below and is shown with every film.
const FILMS = [
  { id: 'desert-cattle-drive', title: 'Desert Cattle Drive', about: 'The scene of the painting, set in motion: the herd on the move and the dust rising.', work: 'bringing-in-the-herd' },
  { id: 'parrot-in-paradise', title: 'Parrot in Paradise', about: 'The scene of the painting, set in motion: the surf comes in and the parrot takes flight.', work: 'parrot' },
  { id: 'christmas-village', title: 'Christmas Village', about: 'A village on a snowy night, set in motion.' },
];
const CINEMA = {
  // The sign over the way in (Ken, 2026-10-12): "Art in Motion", and under it "powered by openart.ai".
  sign: { title: 'Art in Motion', by: 'powered by', name: 'openart.ai', url: 'https://openart.ai' },
  lede: 'Pictures from the gallery, set in motion.',
  credit: { text: 'Animated with OpenArt', url: 'https://openart.ai' },
  note: 'These short films were animated with AI on OpenArt, from pictures Ken Bingham conceived and directed. They carry no signature.',
};

module.exports = { WORKS, SITE, FILMS, CINEMA };
