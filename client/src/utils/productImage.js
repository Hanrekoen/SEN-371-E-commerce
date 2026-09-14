// Single source of truth for product pictures. This logic had drifted across
// Home/catalogue/detail, so a product whose `images` field was not a clean
// array showed a picture on one page and nothing on another. Route all
// product-image rendering through here.

/**
 * Stored image paths are root-relative, but Pages serves the app from
 * "/<repo>/" - without this every product image 404s. Absolute URLs pass
 * through untouched, since an externally hosted image must not be rewritten.
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
 * `images` should be an array, but the admin form can produce a single or
 * comma-separated string - and indexing a string with [0] yields one character,
 * so a page requests "/h" and renders nothing. Normalise rather than trust.
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
 * For <img onError>. A DB path can still 404 on disk; swaps to the fallback
 * once only, so a missing fallback cannot loop.
 */
export function onImageError(event, fallback = FALLBACK) {
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = "true";
  img.src = withBase(fallback);
}

export { FALLBACK as FALLBACK_IMAGE };
