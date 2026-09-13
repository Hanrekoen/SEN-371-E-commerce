import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { CartIcon } from "../components/ui/Icons";
import * as productsApi from "../api/products.api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { formatCents } from "../utils/money";
import { summaryMessage } from "../utils/apiErrors";
import { productImage, productImages, onImageError } from "../utils/productImage";
import "./ProductDetail.css";

export default function ProductDetail() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [added, setAdded] = useState(false);
  const [selected, setSelected] = useState(null);
  const addedTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError(null);
      try {
        const data = await productsApi.getProduct(slug);
        if (!cancelled) setProduct(data);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setSelected(null);
    if (slug) loadProduct();
    return () => { cancelled = true; };
  }, [slug]);

  // Clear the pending "added" message if the page goes away first.
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  // The public product DTO exposes `inStock` as a boolean, never the count -
  // stock levels are commercially sensitive and only admins get stockQty. So
  // availability is read from inStock, and the quantity cap is a plain limit
  // rather than a pretend "N left".
  const outOfStock = product ? product.inStock === false : false;
  const MAX_QTY = 99;

  async function handleAddToCart() {
    if (!product || outOfStock) return;

    // The cart lives on the server against a user, so there is nowhere to put
    // this until they are signed in. Send them to sign in and come back here.
    if (!isAuthenticated) {
      // RequireAuth hands LoginPage a pathname string, so match that shape
      // rather than a location object it would not know what to do with.
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    setAdding(true);
    setAddError(null);
    try {
      await addItem({ productId: product.id, quantity });
      setAdded(true);
      clearTimeout(addedTimer.current);
      addedTimer.current = setTimeout(() => setAdded(false), 2500);
    } catch (err) {
      // Stock can run out between the page loading and this click, so the
      // server's refusal is shown rather than swallowed.
      setAddError(summaryMessage(err, "We could not add that to your cart."));
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="gv-page gv-pdp gv-pdp--message">
        <p className="gv-pdp__status" role="status">Loading product…</p>
      </div>
    );
  }

  if (error || !product) {
    const missing = error?.status === 404 || !product;
    return (
      <div className="gv-page gv-pdp gv-pdp--message">
        <Alert tone={missing ? "warning" : "danger"} title={missing ? "Product not found" : "Could not load this product"}>
          {missing
            ? "We have nothing in the catalogue at that address."
            : summaryMessage(error, "Please try again in a moment.")}
        </Alert>
        <Button as={Link} to="/catalog" size="lg">Back to the catalogue</Button>
      </div>
    );
  }

  const gallery = productImages(product);
  const image = productImage(product);

  return (
    <div className="gv-page gv-pdp">
      <nav className="gv-pdp__crumbs" aria-label="Breadcrumb">
        <Link to="/catalog">Catalogue</Link>
        <span aria-hidden="true"> / </span>
        <span>{product.name}</span>
      </nav>

      <div className="gv-pdp__body">
        <div className="gv-pdp__media">
          <img
            src={selected || image}
            alt={product.name}
            className="gv-pdp__image"
            onError={onImageError}
          />

          {/* Products seeded with more than one shot (colourways) get a
              thumbnail strip; one image renders nothing extra. */}
          {gallery.length > 1 && (
            <ul className="gv-pdp__thumbs">
              {gallery.map((src) => (
                <li key={src}>
                  <button
                    type="button"
                    className={`gv-pdp__thumb ${(selected || image) === src ? "is-active" : ""}`}
                    aria-label={`Show image ${gallery.indexOf(src) + 1} of ${gallery.length}`}
                    aria-pressed={(selected || image) === src}
                    onClick={() => setSelected(src)}
                  >
                    <img src={src} alt="" loading="lazy" onError={onImageError} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="gv-pdp__info">
          {product.brand && <p className="gv-pdp__brand">{product.brand}</p>}
          <h1 className="gv-pdp__name">{product.name}</h1>
          <p className="gv-pdp__price">{formatCents(product.priceCents)}</p>

          <p className={`gv-pdp__stock ${outOfStock ? "is-out" : "is-in"}`}>
            {outOfStock ? "Out of stock" : "In stock"}
          </p>

          {product.description && <p className="gv-pdp__description">{product.description}</p>}

          {addError && <div className="gv-pdp__alert"><Alert tone="danger">{addError}</Alert></div>}

          {isAdmin ? (
            // An admin manages this product rather than buying it, so the buy
            // controls are replaced with the thing they would actually want.
            <div className="gv-pdp__admin">
              <p className="gv-pdp__admin-note">
                You are signed in as an admin, so this product cannot be bought from here.
              </p>
              <Button as={Link} to="/admin/products" variant="outline">Manage the catalogue</Button>
            </div>
          ) : (
          <div className="gv-pdp__buy">
            <div className="gv-pdp__qty">
              <label htmlFor="gv-pdp-qty">Quantity</label>
              <input
                id="gv-pdp-qty"
                type="number"
                min="1"
                max={MAX_QTY}
                value={quantity}
                disabled={outOfStock}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isInteger(n) && n >= 1) setQuantity(Math.min(n, MAX_QTY));
                }}
              />
            </div>

            <Button size="lg" loading={adding} disabled={outOfStock} onClick={handleAddToCart}>
              <CartIcon /> {outOfStock ? "Out of stock" : "Add to cart"}
            </Button>
          </div>
          )}

          {/* role="status" so the confirmation is announced, not just seen. */}
          {added && !isAdmin && (
            <p className="gv-pdp__added" role="status">
              Added to your cart. <Link to="/cart">View cart</Link>
            </p>
          )}

          {!isAuthenticated && !isAdmin && !outOfStock && (
            <p className="gv-pdp__hint">You will be asked to sign in before this is added.</p>
          )}

          {product.specs?.length > 0 && (
            <dl className="gv-pdp__specs">
              {product.specs.map((spec) => (
                <div key={spec.key || spec.label}>
                  <dt>{spec.key || spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
