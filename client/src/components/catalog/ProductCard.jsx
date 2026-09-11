import { Link, useNavigate } from "react-router-dom";
import { StarIcon } from "../ui/Icons";
import { formatCentsCompact } from "../../utils/money";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import "./ProductCard.css";

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

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem, loading } = useCart();

  function handleAdd(e) {
    e.preventDefault(); // the whole card is a Link - don't navigate on Add
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    addItem({ productId: product.id, quantity: 1 });
  }

  return (
    <Link to={`/product/${product.slug}`} className="gv-pcard">
      <div className="gv-pcard__media">
        {product.images?.[0] || product ? (
          <img
            src={resolveProductImage(product)}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/product-pictures/Obsidian%20x9%20black.jpg";
            }}
          />
        ) : (
          <div className="gv-pcard__media-empty">No image</div>
        )}
        {!product.inStock && <span className="gv-pcard__oos">Out of stock</span>}
      </div>


      <div className="gv-pcard__body">
        <div className="gv-pcard__meta">
          <span className="gv-pcard__category">{product.category?.name}</span>
          <span className="gv-pcard__rating">
            <StarIcon /> {product.ratingAverage?.toFixed(1) ?? "0.0"}
            <span className="gv-muted"> ({product.ratingCount ?? 0})</span>
          </span>
        </div>

        <h3 className="gv-pcard__name">{product.name}</h3>

        <div className="gv-pcard__footer">
          <span className="gv-pcard__price">{formatCentsCompact(product.priceCents)}</span>
          <button
            type="button"
            className="gv-pcard__add"
            onClick={handleAdd}
            disabled={!product.inStock || loading}
          >
            Add
          </button>
        </div>
      </div>
    </Link>
  );
}