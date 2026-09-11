import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import RequireAuth from "./components/RequireAuth";
import LoginPage from "./pages/LoginPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

// Placeholder for the routes other team members own this milestone, so the
// navbar links resolve instead of 404-ing while their pages are in progress.
function Pending({ title }) {
  return (
    <div className="gv-page" style={{ padding: "80px 0" }}>
      <h1>{title}</h1>
      <p className="gv-muted">This screen is being built by another team member.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Pending title="Home" />} />
        <Route path="catalog" element={<Pending title="Catalog" />} />
        <Route path="product/:slug" element={<Pending title="Product detail" />} />
        <Route path="cart" element={<Pending title="Cart" />} />
        <Route path="orders" element={<Pending title="Order history" />} />

        <Route path="login" element={<LoginPage />} />

        <Route path="checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
        <Route path="order-confirmation" element={<RequireAuth><OrderConfirmationPage /></RequireAuth>} />
        <Route path="admin" element={<RequireAuth role="admin"><AdminDashboardPage /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
