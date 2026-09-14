import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import RequireAuth from "./components/RequireAuth";
import RequireShopper from "./components/RequireShopper";
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import LoginPage from "./pages/LoginPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import AdminCategoriesPage from "./pages/AdminCategoriesPage";
import NotFoundPage from "./pages/NotFoundPage";
import AboutPage from "./pages/AboutPage";
import MakersPage from "./pages/MakersPage";
import ContactPage from "./pages/ContactPage";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import OrderHistory from "./pages/OrderHistory";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="product/:slug" element={<ProductDetail />} />
        {/* Cart and checkout are for people who can buy - see RequireShopper. */}
        <Route path="cart" element={<RequireShopper><Cart /></RequireShopper>} />
        <Route path="orders" element={<RequireAuth><OrderHistory /></RequireAuth>} />

        <Route path="login" element={<LoginPage />} />

        <Route path="about" element={<AboutPage />} />
        <Route path="makers" element={<MakersPage />} />
        <Route path="support/contact" element={<ContactPage />} />

        <Route path="checkout" element={<RequireShopper><CheckoutPage /></RequireShopper>} />

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
        <Route path="admin/products" element={<RequireAuth role="admin"><AdminProductsPage /></RequireAuth>} />
        <Route path="admin/categories" element={<RequireAuth role="admin"><AdminCategoriesPage /></RequireAuth>} />

        {/* A wrong URL says so, instead of silently redirecting home. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
