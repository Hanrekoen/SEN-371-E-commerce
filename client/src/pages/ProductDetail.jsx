import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import apiRequest from "../utils/api";
import { useCart } from "../context/CartContext";
import "./ProductDetail.css";

function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        const data = await apiRequest("/products/" + id);
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  function handleAddToCart() {
    addToCart(product, quantity);
    setAdded(true);

    // reset the little confirmation message after a bit
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

  return (
    <div className="product-detail">
      <img
        src={product.imageUrl}
        alt={product.name}
        className="product-image"
      />

      <div className="product-info">
        <h1>{product.name}</h1>
        <p className="product-price">R{product.price}</p>
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
