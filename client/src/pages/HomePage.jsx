import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import ProductCard from "../components/catalog/ProductCard";
import { MusicIcon, KeyboardIcon, CameraIcon, MonitorIcon } from "../components/ui/Icons";
import * as productsApi from "../api/products.api";
import * as categoriesApi from "../api/categories.api";
import "./HomePage.css";

// The Figma hero calls out this exact product. If a reseed ever drops it,
// the effect below falls back to the top-rated product instead of leaving
// the hero empty.
const HERO_SLUG = "obsidian-x-9-headset";

// One icon per seeded category slug - the category DTO has no icon field,
// so this is a small, frontend-only lookup. Anything not in this list still
// renders a tile, just without a picked icon.
const CATEGORY_ICONS = {
  "audio-architecture": MusicIcon,
  "modular-keyboards": KeyboardIcon,
  "optical-sensors": CameraIcon,
  "neural-displays": MonitorIcon,
};

const PRODUCT_IMAGE_MAP = {
  "aeropulse-anc-headset": "/product-pictures/AeroPulse%20ANC%20Headset%20Blk.jpg",
  "obsidian-x-9-headset": "/product-pictures/Obsidian%20x9%20black.jpg",
  "novakey-mx60-mechanical": "/product-pictures/NovaKey%20MX60%20Blk.jpg",
  "cortex-prime-pro-webcam": "/product-pictures/Cortex%20Prime%20webcam%20blk.jpg",
  "sonic-labs-dac-amplifier": "/product-pictures/Sonic%20labs%20DAC%20Amplifier.jpg",
  "apex-pro-neural-display": "/product-pictures/Apex%20pro%20neural%20display%20blk.jpg",
  "obsidian-x-9-carbon-mouse": "/product-pictures/Obsidian%20x9%20carbon%20mouse%20blk.jpg",
};

function resolveProductImage(product, fallback = "/product-pictures/Obsidian%20x9%20black.jpg") {
  if (product?.slug && PRODUCT_IMAGE_MAP[product.slug]) return PRODUCT_IMAGE_MAP[product.slug];

  const src = product?.images?.[0];
  if (!src) return fallback;
  if (src.includes("placehold.co") || src.includes("via.placeholder") || src.includes("dummyimage")) {
    return fallback;
  }
  return src;
}

export default function HomePage() {
  const [hero, setHero] = useState(null);
  const [categories, setCategories] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");


  useEffect(() => {
    let cancelled = false;

    async function loadHero() {
      try {
        return await productsApi.getProduct(HERO_SLUG);
      } catch {
        const { data } = await productsApi.listProducts({ sort: "rating", limit: 1 });
        return data?.[0] || null;
      }
    }

    Promise.all([
      loadHero(),
      categoriesApi.listCategories(),
      productsApi.listProducts({ sort: "rating", limit: 3 }),
    ])
      .then(async ([heroProduct, categoryList, trendingResult]) => {
        if (cancelled) return;
        setHero(heroProduct);
        setTrending(trendingResult.data || []);

        // Item counts per category aren't in the category DTO, so they're
        // fetched with one lightweight request each (limit: 1, only meta.total
        // is read) - fine for the handful of categories this catalogue has.
        const withCounts = await Promise.all(
          (categoryList || []).map(async (category) => {
            try {
              const { meta } = await productsApi.listProducts({ categoryId: category.id, limit: 1 });
              return { ...category, count: meta?.total ?? 0 };
            } catch {
              return { ...category, count: 0 };

            }
          })
        );
        if (!cancelled) setCategories(withCounts);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, []);

  function handleSubscribe(e) {
    e.preventDefault();
    if (!email.trim()) return;
    // No newsletter backend exists yet - this just acknowledges the signup
    // locally rather than pretending to call an endpoint that isn't there.
    setSubscribed(true);
  }

  return (
    <>
      {/* Hero */}
      <section className="gv-hero">
        <div className="container gv-hero__inner">
          <div className="row align-items-center gy-5">
            <div className="col-lg-6">
              <span className="gv-pill gv-pill--info mb-4">New arrival in vault</span>
              <h1 className="gv-hero__title">
                Acoustic Mastery.<br />
                <span className="gv-hero__title-accent">Unleashed.</span>
              </h1>
              <p className="gv-muted gv-hero__copy">
                {hero

                  ? hero.description
                  : "Curated, high-performance tech hardware for collectors and professionals."}
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Button as={Link} to={hero ? `/product/${hero.slug}` : "/catalog"} variant="primary" size="lg">
                  {hero ? `Explore ${hero.brand}` : "Explore the vault"}
                </Button>
                <Button as={Link} to="/catalog?categoryId=audio-architecture" variant="outline" size="lg">
                  View all audio
                </Button>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="gv-hero__media">
                {hero ? (
                  <img
                    src={resolveProductImage(hero)}
                    alt={hero.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/product-pictures/Obsidian%20x9%20black.jpg";
                    }}
                  />
                ) : (
                  <img
                    src="/product-pictures/Obsidian%20x9%20black.jpg"
                    alt="Obsidian X-9 Headset"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-5">
        {/* Category tiles */}
        <section className="mb-5">
          <h2 className="mb-4">Browse Material Vaults</h2>
          <div className="row g-3">
            {categories.map((category) => {

              const Icon = CATEGORY_ICONS[category.slug];
              return (
                <div className="col-6 col-md-3" key={category.id}>
                  <Link to={`/catalog?categoryId=${category.id}`} className="gv-vault-tile">
                    <span className="gv-vault-tile__icon">{Icon ? <Icon /> : null}</span>
                    <span className="gv-vault-tile__name">{category.name}</span>
                    <span className="gv-muted gv-vault-tile__count">{category.count} items</span>
                  </Link>
                </div>
              );
            })}
            {!loading && categories.length === 0 && <p className="gv-muted">No categories yet.</p>}
          </div>
        </section>

        {/* Trending releases */}
        <section>
          <div className="d-flex align-items-center justify-content-between mb-4">
            <h2 className="mb-0">Trending Releases</h2>
            <Link to="/catalog" className="gv-link-accent">See all catalog &rarr;</Link>
          </div>
          <div className="row g-4">
            {trending.map((product) => (
              <div className="col-6 col-md-4" key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
            {!loading && trending.length === 0 && <p className="gv-muted">No products yet.</p>}
          </div>
        </section>
      </div>


      {/* Membership banner */}
      <section className="gv-membership">
        <div className="container d-flex flex-wrap align-items-center justify-content-between gap-4">
          <div>
            <span className="gv-eyebrow gv-membership__eyebrow">Exclusive member drops</span>
            <h2 className="mt-2 mb-2">Unlock Vault Membership</h2>
            <p className="gv-muted mb-0" style={{ maxWidth: "56ch" }}>
              Get 10% cash back in points on all purchases, early access to ultra-limited
              mechanical drops, and invitations to private editorial tech reviews.
            </p>
          </div>
          <Button variant="accent" size="lg" disabled title="Membership isn't open yet">
            Join membership
          </Button>
        </div>
      </section>

      {/* Newsletter */}
      <section className="gv-newsletter">
        <div className="container text-center">
          <h2 className="mb-2">Keep your gear inventory updated.</h2>
          <p className="gv-muted mb-4">
            We don't spam. Only high-end teardowns, weekly editorial hardware showcases,
            and notification of extremely scarce drops.
          </p>
          {subscribed ? (
            <p className="gv-pill gv-pill--success d-inline-flex">You're on the list.</p>
          ) : (
            <form className="gv-newsletter__form" onSubmit={handleSubscribe}>
              <input
                type="email"
                required

                className="form-control"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
              />
              <Button type="submit" variant="primary">Subscribe</Button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}