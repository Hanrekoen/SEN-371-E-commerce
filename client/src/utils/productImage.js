// One place that decides which picture to show for a product.
//
// This exists because the same logic had drifted across pages: Home mapped
// slugs to local files and fell back, the catalogue card read images[0] raw,
// and the detail page read images[0] raw as well - so a product whose images
// field was anything other than a clean array of URLs showed a picture on one
// page and nothing on another.
//
// Every surface that shows a product picture must go through here.

/**
 * Root-relative paths resolve against the domain root, which is wrong
 * wherever the app is not served from it.
 *
 * Locally the base is "/" and this changes nothing. On GitHub Pages the app
 * is served from "/<repo-name>/", so a stored path of "/product-pictures/x.jpg"
 * gets requested from the domain root - where nothing exists - and every
 * product renders its alt text instead of a picture.
 *
 * Absolute URLs pass through untouched: a product whose image is hosted
 * elsewhere is already fully qualified and must not be rewritten.
 */
export function withBase(url) {
  if (typeof url !== "string" || !url.startsWith("/")) return url;
  const base = import.meta.env.BASE_URL || "/";
  return base.replace(/\/$/, "") + url;
}

const FALLBACK = withBase("/product-pictures/Obsidian%20x9%20black.jpg");

// The seed stores real paths, but a product added by hand through the admin
// form can end up with a placeholder URL instead. Those hosts never resolve
// offline, so they are treated as "no image".
const PLACEHOLDER_HOSTS = ["placehold.co", "via.placeholder", "dummyimage", "images.unsplash.com"];

// Known products, so a demo always looks right even if the row is imperfect.
const BY_SLUG = {
  "aeropulse-anc-headset": "/product-pictures/AeroPulse%20ANC%20Headset%20Blk.jpg",
  "obsidian-x-9-headset": "/product-pictures/Obsidian%20x9%20black.jpg",
  "novakey-mx60-mechanical": "/product-pictures/NovaKey%20MX60%20Blk.jpg",
  "cortex-prime-pro-webcam": "/product-pictures/Cortex%20Prime%20webcam%20blk.jpg",
  "sonic-labs-dac-amplifier": "/product-pictures/Sonic%20labs%20DAC%20Amplifier.jpg",
  "apex-pro-neural-display": "/product-pictures/Apex%20pro%20neural%20display%20blk.jpg",
  "obsidian-x-9-carbon-mouse": "/product-pictures/Obsidian%20x9%20carbon%20mouse%20blk.jpg",
};

/**
 * The `images` field is supposed to be an array of URLs, but a product typed
 * into the admin form can arrive as a single string, or as one comma-separated
 * string. Indexing a string with [0] yields one character - which is exactly
 * how a page ends up requesting "/h" and rendering nothing - so the shape is
 * normalised here rather than trusted.
 */
export function productImages(product) {
  const raw = product?.images;
  if (!raw) return [];

  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];

  return list
    .map((url) => (typeof url === "string" ? url.trim() : ""))
    .filter((url) => url.length > 1 && !PLACEHOLDER_HOSTS.some((host) => url.includes(host)))
    .map(withBase);
}

/** The picture to show for a product, with a guaranteed usable result. */
export function productImage(product, fallback = FALLBACK) {
  if (product?.slug && BY_SLUG[product.slug]) return withBase(BY_SLUG[product.slug]);
  return productImages(product)[0] || fallback;
}

/**
 * For <img onError>. A path can be right in the database and still 404 on
 * disk, so the element swaps to the fallback once and then stops, rather than
 * looping if the fallback is missing too.
 */
export function onImageError(event, fallback = FALLBACK) {
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = "true";
  img.src = withBase(fallback);
}

export { FALLBACK as FALLBACK_IMAGE };
