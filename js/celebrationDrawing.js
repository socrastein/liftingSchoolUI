/**
 * Paints a show's pieces onto a canvas, one shape for each kind of piece: a fluttering rectangle, a glowing dot, a rocket with its
 * trail. celebrationParticles.js decides where the pieces are; celebrationCanvas.js calls this once per frame.
 *
 * Plain JavaScript for the browser (it draws on a 2D canvas context).
 */

/** @typedef {import("./celebrationParticles.js").Show} Show */
/** @typedef {import("./celebrationParticles.js").Particle} Particle */
/** @typedef {import("./celebrationParticles.js").CelebrationPalette} CelebrationPalette */

/** The last part of a piece's life, as a fraction of it, which it spends fading out. */
const FADE_OUT_FRACTION = 0.3;
/** How wide a rocket's trail is, in pixels. */
const TRAIL_WIDTH = 3;
/** The radius of a rocket's head, in pixels. */
const ROCKET_HEAD_RADIUS = 3;
/** A spark's soft glow is a bigger, fainter dot behind it: this many times its radius. */
const SPARK_GLOW_RADIUS_FACTOR = 3;
/** How strong the glow is compared with the spark itself. A blurred shadow would look better but costs far more per spark. */
const SPARK_GLOW_STRENGTH = 0.25;
/** How fast a confetti piece flutters (it flips over this many radians per second). */
const FLUTTER_RADIANS_PER_SECOND = 6;
/** A flipped piece is never thinner than this fraction of its full width. */
const FLUTTER_THINNEST = 0.2;

/**
 * Clears the canvas and paints every piece of the show, each fading out over the end of its life.
 *
 * @param {CanvasRenderingContext2D} context The canvas's 2D context, already scaled to CSS pixels.
 * @param {Show} show The show to paint.
 */
export function drawShow(context, show) {
  context.clearRect(0, 0, show.area.width, show.area.height);
  for (const particle of show.particles) {
    context.save();
    context.globalAlpha = opacityOf(particle);
    context.translate(particle.x, particle.y);
    drawPiece(context, particle, show.palette);
    context.restore();
  }
}

/**
 * How visible a piece is: full strength until the last part of its life. A rocket stays at full strength until it bursts.
 *
 * @param {Particle} particle The piece.
 * @returns {number} From 0 (gone) to 1 (full strength).
 */
function opacityOf(particle) {
  if (particle.kind === "rocket") return 1;
  const lifeLeftFraction = 1 - particle.age / particle.lifetime;
  return Math.min(1, lifeLeftFraction / FADE_OUT_FRACTION);
}

/**
 * Paints one piece with the drawer for its kind.
 *
 * @param {CanvasRenderingContext2D} context Moved to the piece's centre.
 * @param {Particle} particle The piece.
 * @param {CelebrationPalette} palette Colours the pieces themselves do not carry.
 */
function drawPiece(context, particle, palette) {
  if (particle.kind === "confetti") drawConfettiPiece(context, particle);
  else if (particle.kind === "spark") drawSpark(context, particle);
  else drawRocket(context, particle, palette);
}

/**
 * A confetti piece: a small rectangle that flutters as it spins, squashing as if it flips over.
 *
 * @param {CanvasRenderingContext2D} context Moved to the piece's centre.
 * @param {import("./celebrationParticles.js").ConfettiPiece} piece The piece.
 */
function drawConfettiPiece(context, piece) {
  const flip = Math.abs(Math.cos(piece.age * FLUTTER_RADIANS_PER_SECOND + piece.wobblePhase));
  context.rotate(piece.rotation);
  context.scale(1, FLUTTER_THINNEST + (1 - FLUTTER_THINNEST) * flip);
  context.fillStyle = piece.color;
  context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
}

/**
 * A firework spark: a bright dot with a faint glow.
 *
 * @param {CanvasRenderingContext2D} context Moved to the spark's centre.
 * @param {import("./celebrationParticles.js").Spark} spark The spark.
 */
function drawSpark(context, spark) {
  const fullOpacity = context.globalAlpha;
  context.fillStyle = spark.color;
  context.globalAlpha = fullOpacity * SPARK_GLOW_STRENGTH;
  fillCircle(context, spark.size * SPARK_GLOW_RADIUS_FACTOR);
  context.globalAlpha = fullOpacity;
  fillCircle(context, spark.size);
}

/**
 * A rocket: a fading trail behind a bright head.
 *
 * @param {CanvasRenderingContext2D} context Moved to the rocket's head.
 * @param {import("./celebrationParticles.js").Rocket} rocket The rocket.
 * @param {CelebrationPalette} palette Gives the colour of the head.
 */
function drawRocket(context, rocket, palette) {
  drawTrail(context, rocket);
  context.fillStyle = palette.rocketHead;
  fillCircle(context, ROCKET_HEAD_RADIUS);
}

/**
 * A rocket's trail: short strokes behind the head, the older the fainter. Drawn relative to the head, which is the origin.
 *
 * @param {CanvasRenderingContext2D} context Moved to the rocket's head.
 * @param {import("./celebrationParticles.js").Rocket} rocket The rocket.
 */
function drawTrail(context, rocket) {
  const { trail } = rocket;
  context.lineCap = "round";
  context.lineWidth = TRAIL_WIDTH;
  context.strokeStyle = rocket.color;
  trail.forEach((point, index) => {
    const next = trail[index + 1] ?? { x: rocket.x, y: rocket.y };
    // The newest stroke is the strongest
    context.globalAlpha = (index + 1) / (trail.length + 1);
    context.beginPath();
    context.moveTo(point.x - rocket.x, point.y - rocket.y);
    context.lineTo(next.x - rocket.x, next.y - rocket.y);
    context.stroke();
  });
  context.globalAlpha = 1;
}

/**
 * Fills a circle at the origin with the current fill colour.
 *
 * @param {CanvasRenderingContext2D} context The context.
 * @param {number} radius In pixels.
 */
function fillCircle(context, radius) {
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
}
