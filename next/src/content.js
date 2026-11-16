// All teaching text and sources. Correct answers are computed in main.js or keyed here by id.
export const SRC = {
  osx: { t: 'OpenStax, Psychology 2e, 5.3 Vision', u: 'https://openstax.org/books/psychology-2e/pages/5-3-vision' },
  behrens: { t: 'Behrens (1999), Adelbert Ames, Fritz Heider, and the Chair Demonstration, Gestalt Theory 21', u: 'https://en.gestalttheory.net/uploads/pdf/GTH-Archive/1999BehrensAdelbertAmesFritzHeider.pdf' },
  sage: { t: 'Behrens (2009), Ames Demonstrations in Perception, Encyclopedia of Perception (Sage)', u: 'https://sk.sagepub.com/ency/edvol/embed/perception/chpt/ames-demonstrations-perception' },
  patent: { t: 'Ames, US Patent 2,340,856, filed 1940', u: 'https://patents.google.com/patent/US2340856' },
  jmp: { t: 'Geometry of the Ames room, Journal of Mathematical Psychology (author manuscript, ULiège)', u: 'https://orbi.uliege.be/handle/2268/340513' },
  glen: { t: 'Glennerster, Gilson, Tcheang and Parker, Perception of size in a dynamic Ames room', u: 'https://www.dpag.ox.ac.uk/publications/633885' },
  holbein: { t: 'Holbein, The Ambassadors (1533), National Gallery, London', u: 'https://en.wikipedia.org/wiki/The_Ambassadors_(Holbein)' },
  spada: { t: 'Borromini, perspective gallery, Palazzo Spada, Rome', u: 'https://en.wikipedia.org/wiki/Palazzo_Spada' },
  jove: { t: 'JoVE Science Education, The Ames Room', u: 'https://app.jove.com/v/10292' },
};
export const cite = (k) => `<a class="cite" href="${SRC[k].u}" target="_blank" rel="noopener">${SRC[k].t}</a>`;

export const CUE_OPTS = ['Linear perspective', 'Texture gradient', 'Relative size', 'Height in the field'];
export const CUES = [
  { id: 'floor', ans: 1, view: [0.3, 0.82],
    q: 'The floor. Its real tiles are all different sizes and shapes. Which cue makes it read as flat and level?',
    ok: 'Texture gradient. A repeating pattern that gets finer reads as a surface running away from you. These tiles are cut so the pattern gets finer at the same rate on both sides, so the floor reads as flat and level.',
    no: ['Close. Linear perspective is about straight edges converging. The cue here is the grain of a repeating pattern.', '', 'Relative size compares two objects you take to be equal. The cue here is the grain of a repeating surface pattern.', 'Height in the field reads things higher in the view as farther off. The floor is cut so both back corners sit at the same height in your view.'] },
  { id: 'windows', ans: 0, view: [-0.3, 0.42],
    q: 'The back wall and its windows. The left window is really much larger. Which cue makes the wall read as square to you?',
    ok: 'Linear perspective. Edges you take to be parallel converge with distance, and the eye reads depth from how they converge. These windows are trapezoids shaped so their edges converge exactly as rectangles on a square wall would.',
    no: ['', 'Texture gradient is about a repeating surface pattern. The cue here is how straight edges converge.', 'Relative size compares two objects you take to be equal. The cue here is how straight edges converge.', 'Height in the field reads things higher in the view as farther off. The floor is cut so both back corners sit at the same height in your view.'] },
  { id: 'people', ans: 2, view: [0.85, 0.5],
    q: 'The two people. The room now reads as square and level. Which cue turns the smaller image into a smaller person?',
    ok: 'Relative size. Normally you assume two people are about the same size and read the smaller image as the farther person. The room says both are equally far, so the smaller image gets read as a smaller person.',
    no: ['Linear perspective made the wall look square. The cue applied to the two people themselves is a different one.', 'Texture gradient made the floor look level. The cue applied to the two people themselves is a different one.', '', 'Height in the field reads things higher in the view as farther off. The floor is cut so both back corners sit at the same height in your view.'] },
];
export const Q1 = {
  opts: ['About twice as far away', 'About equally far away', 'About half as far away'], vals: [2, 1, 0.5],
  hint: 'Hint: picture a car driving away from you. What happens to its image when its distance doubles?',
};
export const Q4 = {
  opts: ['Motion parallax', 'Binocular disparity', 'Linear perspective', 'Interposition'], ans: 0,
  ok: 'Motion parallax. Moving the eye gives a second viewpoint, and near things slide across the view faster than far things. The two views together give away the slanted wall.',
  no: ['', 'Binocular disparity needs two eyes open at once. You moved one eye from place to place.', 'Linear perspective was already there from the peephole. Moving added a new cue.', 'Interposition is one object blocking another. Moving added a different cue.'],
};
export const FIELDS = [
  { h: 'Art', p: 'In Hans Holbein\'s The Ambassadors (1533, National Gallery, London) a smeared shape lies across the floor. Seen from the side of the panel it is a skull. Painters call this anamorphosis: an image built for one viewpoint.', k: 'holbein' },
  { h: 'Architecture and design', p: 'Francesco Borromini\'s colonnade at Palazzo Spada in Rome looks about 37 m long. It is about 9 m. The columns shrink, the floor rises, and the statue at the far end is 60 cm tall.', k: 'spada' },
  { h: 'Film and theater', p: 'A camera has one lens and stays where the director puts it. That makes it a peephole. Sets built on this room\'s plan make actors look larger or smaller in a single shot.', k: 'jove' },
  { h: 'Engineering and computer science', p: 'One camera image fits many different 3D scenes, which is why robots and cars add a second camera, motion or a depth sensor. The math that bends this room is the projective transformation every 3D graphics engine uses.', k: null },
];
export const ABOUT = `
<h2 id="aboutH">About this demo</h2>
<p>A short simulation for a sensation and perception unit. One mission: look into an Ames room, work out where the people must be standing, then step outside, name the cues, build your own room and break the illusion.</p>
<h3>Learning objectives</h3>
<ul><li>Predict how the size of an image changes with distance.</li><li>Identify the monocular depth cues that make the room read as a box.</li><li>Explain why the illusion needs one eye at one fixed point.</li></ul>
<h3>What is real</h3>
<ul><li>The geometry. The room is drawn first as an ordinary box, then every point is moved along its own line of sight from the peephole. The peephole image is identical for every slider setting. Distances and image sizes shown on screen are measured from the 3D scene as it runs.</li>
<li>Both figures are the same model at the same height, 1.65 m.</li>
<li>Adelbert Ames Jr. designed the distorted room in the 1930s. Sources give 1934 for the design, 1935 for the first build, 1940 for the patent filing and 1946 in many textbooks. ${cite('behrens')}; ${cite('sage')}; ${cite('patent')}.</li></ul>
<h3>What is modeled</h3>
<ul><li>This is one member of a family of Ames rooms, chosen so that one slider controls it. A museum Ames room has its own measurements.</li>
<li>The lighting inside the room is painted on, as it would be in a built room, so shading does not give the shape away.</li>
<li>A screen shows one flat image to both of your eyes. The demo cannot show binocular disparity. The step on moving your head stands in for it.</li></ul>
<h3>Beyond the textbook</h3>
<ul><li>OpenStax lists linear perspective, interposition, relative size and light and shadow as monocular cues. Texture gradient and motion parallax are standard in perception courses and are not in the OpenStax section.</li>
<li>How fully two eyes break the illusion is not settled. J. J. Gibson (1979) argued it fades once the room is seen with both eyes from several viewpoints. W. H. Ittelson (1960) reported it returns under one eye. Both are summarized in ${cite('jmp')}. In a virtual reality version, room assumptions outweighed correct disparity and parallax information (${cite('glen')}).</li></ul>
<h3>Sources</h3>
<ul>${Object.keys(SRC).map((k) => `<li>${cite(k)}</li>`).join('')}</ul>
<p>Depth cue definitions were checked against Psychology 2e by Rose M. Spielman, William J. Jenkins and Marilyn D. Lovett, OpenStax, licensed CC BY 4.0. Access for free at <a href="https://openstax.org/books/psychology-2e/pages/1-introduction" target="_blank" rel="noopener">openstax.org/books/psychology-2e</a>. No OpenStax text or figures are reproduced.</p>
<p>The engineering note in the debrief is general textbook knowledge and is not tied to one source.</p>
<p>Built with Claude as a workshop demo for faculty. No tracking. No data leaves this page.</p>`;
