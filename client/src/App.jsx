import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import RequireAuth from "./components/RequireAuth";
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import LoginPage from "./pages/LoginPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import NotFoundPage from "./pages/NotFoundPage";

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
        <Route index element={<HomePage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="product/:slug" element={<Pending title="Product detail" />} />
        <Route path="cart" element={<Pending title="Cart" />} />
        <Route path="orders" element={<RequireAuth><Pending title="Order history" /></RequireAuth>} />

        <Route path="login" element={<LoginPage />} />

        <Route path="checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />

        {/* The receipt is addressed by order id, so a refresh, a bookmark or a
            shared link all load the same page rather than an empty one. */}
        <Route
          path="orders/:orderId/confirmation"
          element={<RequireAuth><OrderConfirmationPage /></RequireAuth>}
        />
        {/* The old state-based path. Anyone arriving here has no order id, so
            send them to their order history rather than a blank receipt. */}
        <Route path="order-confirmation" element={<Navigate to="/orders" replace />} />

        <Route path="admin" element={<RequireAuth role="admin"><AdminDashboardPage /></RequireAuth>} />

        {/* A wrong URL says so, instead of silently redirecting home. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
