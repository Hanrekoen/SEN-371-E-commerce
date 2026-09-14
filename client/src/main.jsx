import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/bootstrap-theme.css";
import "./styles/base.css";

// import.meta.env.BASE_URL is whatever Vite's `base` was at build time: "/"
// locally, "/<repo-name>/" on GitHub Pages. Without it the router would read
// the repo name as the first path segment and match no route at all.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
