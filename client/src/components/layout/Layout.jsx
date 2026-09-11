import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import "./Layout.css";

// The shell every page renders inside. Kept as a route layout so the navbar
// and footer are mounted once and survive navigation.
export default function Layout() {
  return (
    <div className="gv-shell">
      <a className="gv-skip" href="#main">Skip to content</a>
      <Navbar />
      <main id="main" className="gv-shell__main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
