import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import * as productsApi from "../api/products.api";
import { useCart } from "../context/CartContext";
import { formatCents } from "../utils/money";
import "./ProductDetail.css";

function ProductDetail() {
  const { slug } = useParams();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);
        const data = await productsApi.getProduct(slug);
        setProduct(data);
      } catch (err) {
        setError(err.message || "Could not load product");
      } finally {
        setLoading(false);
      }
    }

    if (slug) loadProduct();
  }, [slug]);

  function handleAddToCart() {
    if (!product) return;

    addItem({ productId: product.id, quantity });
    setAdded(true);

    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) {
    return <p className="status-text">loading product...</p>;
  }

  if (error) {
    return <p className="status-text error">{error}</p>;
  }

  if (!product) {
    return <p className="status-text">product not found</p>;
  }

  const productImage = product.images?.[0] || "/product-pictures/Obsidian%20x9%20black.jpg";

  return (
    <div className="product-detail">
      <img
        src={productImage}
        alt={product.name}
        className="product-image"
      />

      <div className="product-info">
        <h1>{product.name}</h1>
        <p className="product-price">{formatCents(product.priceCents)}</p>
        <p className="product-description">{product.description}</p>

        <div className="quantity-row">
          <label htmlFor="quantity">quantity</label>
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>

        <button className="add-to-cart-btn" onClick={handleAddToCart}>
          add to cart
        </button>

        {added && <p className="added-message">added to cart</p>}
      </div>
    </div>
  );
}

export default ProductDetail;
