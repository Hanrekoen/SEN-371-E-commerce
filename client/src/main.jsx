import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/bootstrap-theme.css";
import "./styles/base.css";

// basename must be Vite's build-time `base` ("/<repo-name>/" on Pages);
// without it the router reads the repo name as a path segment and matches
// no route at all.
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
