import { Link, useNavigate } from "react-router-dom";
import { formatCentsCompact } from "../../utils/money";
import { productImage, onImageError } from "../../utils/productImage";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
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
        <img
          src={productImage(product)}
          alt={product.name}
          loading="lazy"
          onError={onImageError}
        />
        {!product.inStock && <span className="gv-pcard__oos">Out of stock</span>}
      </div>


      <div className="gv-pcard__body">
        <span className="gv-pcard__category">{product.category?.name}</span>

        <h3 className="gv-pcard__name">{product.name}</h3>

        <div className="gv-pcard__footer">
          <span className="gv-pcard__price">{formatCentsCompact(product.priceCents)}</span>
          {/* The API refuses an admin's cart write, so no button is offered. */}
          {!isAdmin && (
            <button
              type="button"
              className="gv-pcard__add"
              onClick={handleAdd}
              disabled={!product.inStock || loading}
            >
              Add
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}