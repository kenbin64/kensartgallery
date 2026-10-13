// The words of the "How it was built" page: what the gallery is made with, how
// it works, and who did what. Written for a technical visitor or an employer.
//
// build.js calls this with a few numbers it has counted for itself (how many
// paintings, rooms and lines of code), so those stay true as the site changes.
// Everything else here is a statement of fact about the project: if the site
// changes in a way that makes one untrue, change it here too.
'use strict';

// How many messages Ken typed to direct the gallery, from the first ("Lets build my online art gallery", 8 October
// 2026) to the one that asked for this count (10 October 2026). Counted from the conversation record, not estimated.
// It is a fixed figure for those three days; later direction is not added to it. (Some of the messages quoted on
// the page came after the count was taken, on the same third day.)
const ROUNDS = 67;

module.exports = function howBuilt({ name, paintings, rooms, lines, files, three }) {
  const fact = (number, label) => `<div class="fact"><b>${number}</b><span>${label}</span></div>`;
  const said = (words, then) => `<div class="said"><blockquote>${words}</blockquote><p>${then}</p></div>`;
  const row = (what, why) => `<tr><th scope="row">${what}</th><td>${why}</td></tr>`;
  return `<main class="about-page built">
  <h1>How this gallery was built</h1>
  <p class="lede">A walk-through 3D gallery that runs in a web browser with nothing to install. One person directed it and an AI wrote it, over three days. This page says what it is made of, how it works, and who did what.</p>

  <div class="facts">
    ${fact(paintings, 'paintings, each framed and lit')}
    ${fact(rooms, 'rooms, laid out by the code')}
    ${fact(lines.toLocaleString('en-US'), `lines of code in ${files} files`)}
    ${fact(ROUNDS, 'messages of direction in the first three days')}
    ${fact('0', 'frameworks, 3D model files or sound files')}
  </div>
  <p><a class="button" href="walk.html">Walk through it</a></p>

  <h2>What it is made with</h2>
  <table class="stack">
    ${row('three.js ' + three, 'The 3D drawing library, on WebGL. It is the only library the pages load, and it is served from this site, not from another company\'s network.')}
    ${row('Plain JavaScript', 'ES modules, no framework and no bundler. The pages work as written.')}
    ${row('Canvas 2D', 'Every label, sign, speech bubble and the marble floor is drawn in code onto a canvas and used as a texture.')}
    ${row('Web Audio API', 'All the sound is made in the browser from filtered noise and tones. The cynic\'s remarks use the browser\'s own speech voice.')}
    ${row('Node.js', 'One build script turns a list of works into every page. No database and no content system.')}
    ${row('Python: Pillow and OpenCV', 'The picture pipeline: resizing, the watermark, the signature, and the check for duplicates.')}
    ${row('Cloudflare Workers', 'Hosting of the built files, one small server program for the contact form, a key-value store, and outbound email.')}
    ${row('Headless browser tests', 'A real browser driven over the Chrome DevTools Protocol, taking measurements and screenshots after every change.')}
  </table>

  <h2>What is worth a closer look</h2>

  <h3>The building designs itself</h3>
  <p>Nothing about the rooms is drawn by hand. The code takes the number of paintings and works out how many rooms are needed, where the doorways go, and which wall each painting hangs on, under rules: two to a wall, never one alone, none on a wall with a doorway. Add or remove a painting and the building changes to fit. It has been four rooms and it has been thirteen.</p>

  <h3>No models, no recordings</h3>
  <p>The visitors, the statues, the fountains, the coffee stand and its pastries, the waste bins and the frames are all assembled in code from simple solid shapes. The sound of the crowd is noise passed through filters tuned to the pitch of voices; a footstep is a short thud and a click. So the whole experience downloads as code and paintings, and nothing else.</p>

  <h3>An automatic tour that moves like a person</h3>
  <p>The tour plans a route through every room, through the middle of each doorway and round every bench, statue and fountain. It gathers and loses speed gradually, the camera follows the route as if on a soft spring so that corners are rounded, and it turns to face the next painting while it is still arriving. The test traces the whole tour at sixty steps a second and confirms that it stops squarely in front of every painting and never passes through a wall or an obstacle.</p>

  <h3>Pictures arrive as you walk</h3>
  <p>A painting's image is asked for only when you are near it or can see it through a doorway. The first room is ready in moments however many rooms lie beyond it.</p>

  <h3>Mirror statues drawn from their equations</h3>
  <p>Three of the statues are mathematical surfaces in polished metal: z = xy, a hyperbolic paraboloid cut square so that every edge is a straight line; z = xy², a right conoid; and half a sphere, mirrored on both faces. Each is built from its formula, stands on a labelled plinth under its own spotlight, and turns. A fourth is a mirrored pyramid with a brighter capstone and a beam of light rising from its point to the ceiling. In the last room stands a gold pharaoh's mask, striped with lapis and set with rows of turquoise, carnelian and lapis beads, assembled from about four hundred simple shapes. Beside it turns a large globe: 260 points of light spread over a sphere by the rule a sunflower uses for its seeds, each joined to its nearest neighbours.</p>
  <p>The reflections are real. The room is photographed in all six directions from where each statue stands, every few seconds, and that picture is what its metal reflects. So the paintings, the lights and the visitors slide across the surfaces as they turn.</p>

  <h3>A polished floor, and shadows where they belong</h3>
  <p>The marble floor reflects the room. A mirror lies just under it and the marble is let through a little, so the lit paintings and the walls show in the floor, dimmed, as they do in polished stone. Every frame throws a soft shadow on its wall, every bench, plinth and fountain has one on the floor, and each wall darkens where it meets the floor and the ceiling. None of this is computed lighting. Each is a small effect placed by hand where the eye expects it, which is why it runs smoothly in a browser.</p>

  <h3>Visitors with joints, faces and things to do</h3>
  <p>The people in the rooms are built in code: a body turned on a lathe, arms hinged at shoulder and elbow, legs at hip and knee, eyes with an iris, a pupil and a fleck of light, and lids that blink. Each has a part to play. Children point at a painting while a mother keeps an eye on them, a professor holds his chin, a curator talks to a group, a custodian sweeps, a boy throws coins into a fountain while a little girl beside him shuts her eyes and makes a wish, a vendor at a coffee and pastry cart holds out a cup to a man who cannot believe the price while the woman behind him taps her foot, and a cynic walks from picture to picture finding fault. They stand where they do not block a painting or the route of the tour, each has a few thoughts that float up in a bubble, and one button takes them all away.</p>

  <h3>The picture pipeline</h3>
  <p>The originals are photographs of canvases and are never altered. For the web copies, the build:</p>
  <ul>
    <li>removes each hand-painted signature by copying the plainest nearby piece of the same painting over it and blending the tones, so the repair is the painting's own brushwork;</li>
    <li>adds one consistent signature, in white or in black according to how light the picture is at that spot;</li>
    <li>adds the watermark;</li>
    <li>chooses a frame to suit each painting's overall colour;</li>
    <li>takes a small light-and-dark fingerprint of every picture and stops the build if two works are the same painting photographed twice.</li>
  </ul>

  <h3>A contact form that does not publish an email address</h3>
  <p>Messages go to a small server program, which emails them on. The address is known only to the server. The build fails if an email address appears in any page. The form refuses requests from other sites, caps the number of messages a day, and quietly drops automatic form-fillers.</p>

  <h3>Small screens get a different gallery</h3>
  <p>Walking through rooms is not practical on a phone, so a phone gets the same paintings as a wall of framed, lit pictures. It is the same page: the 3D starts only where there is room for it and the browser can draw it.</p>

  <h2>Who did what</h2>
  <p><b>${name}</b> conceived the gallery, directed it and made every decision in it. The paintings are his, made by hand. So are the ideas that give the site its character: rooms with doorways in place of corridors, dim rooms with lit pictures, the visitors and what they think, the cynic, the custodian, the fountains, the mirror statues and how each is cut and turned, the pyramid and its beam of light, the pharaoh's mask, the polished floor, one consistent signature, the centrepiece, and the choice of which paintings hang.</p>
  <p><b>The AI</b> (Claude, made by Anthropic, working as a coding agent) wrote the code, wrote and ran the tests, and reported what it found. It did not originate the ideas. Where it offered a judgement, such as which twenty paintings are the strongest, that was asked for, and the decision stayed with ${name}.</p>

  <h2>What it took to get it right</h2>
  <p>It was not right the first time, and most of the quality came from correction.</p>
  <ul>
    <li><b>Direction in small steps.</b> The gallery was built through ${ROUNDS} messages of direction in its first three days, most of them "not that, this". The first version was a single long hall. Then short hallways with corners. Then, because it still looked like hallways with art and not a gallery, rooms.</li>
    <li><b>Specific rules from the person who knows galleries.</b> No more than a few paintings in view. Never one painting alone on a wall. The room dim so the pictures stand out. Smooth movement, no jerks. Each was a sentence of direction that became a rule in the code and a check in the tests.</li>
    <li><b>Measuring, not assuming.</b> After each change a real browser opened the site, walked it, and reported numbers: paintings per wall, whether every painting can be stood in front of, whether the tour ever leaves the floor. A change was not called done until the numbers said so.</li>
    <li><b>Throwing work away.</b> The first 3D engine was replaced whole when three.js was chosen. The first method of removing signatures left a smear and was replaced by one that reuses the painting's own brushwork. The first z = xy statue was the wrong cut of the surface and was redrawn from a reference picture. The visitors were rebuilt once they were on screen, to give them elbows, knees and proper eyes.</li>
    <li><b>The eye is the final test.</b> A test can prove that the tour stops in front of every painting. It cannot say whether the gallery feels like a gallery. That judgement was made by a person looking at it, every time.</li>
  </ul>

  <h2>The direction, in the director's own words</h2>
  <p>These are some of the ${ROUNDS} messages, and of those that followed, quoted from the record with only the spelling tidied, each with what it changed. None of them is a specification. Each is a person looking at the result and saying what is wrong with it.</p>
  ${said('All paintings must be framed and lit painting gallery style, frames appropriate for the wall texture and theme.', 'Every picture got a frame, a picture lamp and a pool of light. The build now chooses each frame from the painting\'s own colours.')}
  ${said('Not just one continuous hallway or flat wall. Have wall exhibits where the user can go from one to another. Turn corners and more hallways. Really no more than 3 paintings per hallway.', 'The single long hall was replaced by a winding plan generated from the number of paintings.')}
  ${said('Well lit but not bright. Most art galleries are optimized to bring out the paintings but the rooms themselves are often not well lit, to give a contrast to the lit up paintings on the wall.', 'The walls, floor and ceiling were dimmed to a fraction of their brightness and each painting was left at full brightness.')}
  ${said('Have wall textures change when turning corners and let\'s have no less than 2 paintings per wall. There are long walls that only have one painting.', 'Two rules went into the layout code and two checks into the tests: a different wall finish in every space, and never one painting alone.')}
  ${said('For the auto tour can it be more natural movement of camera, smooth and no jerky movements moving from one painting to the other.', 'The tour was rewritten: eased speed, a camera that follows its route on a spring, and a turn that begins before it arrives.')}
  ${said('Is there any way to make the art gallery 3D part look more like an art gallery and not just hallways with art?', 'The largest change of the project. Corridors became rooms joined by cased doorways, with benches, ceiling track lights and room names.')}
  ${said('Make it smart phone friendly by only showing walls and art. The traversal would be too much and not practical on small screens.', 'Phones get a wall of framed pictures. The 3D starts only where there is room for it.')}
  ${said('And let\'s have some din and crowd noises, walking sounds, children laughing, one cynic criticizing every painting he sees.', 'The sound engine, and the cynic, who walks from painting to painting finding fault with each.')}
  ${said('Can we make the patrons be more studio quality?', 'The visitors were rebuilt with elbows, knees, shaped bodies, eyes that blink and a shadow on the floor. The answer also said where the limit is: figures made in code are not studio characters.')}
  ${said('Not quite right. Here is z = xy, and have it turn left to right.', 'Sent with a reference picture. The first version of the statue was the right equation cut the wrong way; it was redrawn to match.')}

  <h2>What it is not</h2>
  <ul>
    <li>The visitors are stylised figures built in code. They have joints and faces, but they are not the sculpted, rigged characters of an animation studio.</li>
    <li>The sound is made by the browser and is plainer than recordings would be.</li>
    <li>The signature repairs hold at viewing size; a few show if you zoom far in.</li>
    <li>The 3D gallery needs a computer-sized screen and a browser with WebGL.</li>
  </ul>

  <p><a class="button" href="walk.html">Walk through it</a> <a class="button quiet" href="index.html">All work</a> <a class="button quiet" href="about.html#contact">Contact</a></p>
</main>`;
};
