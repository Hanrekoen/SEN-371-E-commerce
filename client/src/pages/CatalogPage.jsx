import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/catalog/ProductCard";
import Pagination from "../components/ui/Pagination";
import * as productsApi from "../api/products.api";
import * as categoriesApi from "../api/categories.api";
import "./CatalogPage.css";

const SORT_OPTIONS = [
  { value: "rating", label: "Trending Releases" },
  { value: "newest", label: "Newest" },
  { value: "priceAsc", label: "Price: Low to High" },
  { value: "priceDesc", label: "Price: High to Low" },
];

const PAGE_SIZE = 12;

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // The Navbar's search box already writes ?q= here - this page just reads it.
  const q = searchParams.get("q") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const brand = searchParams.get("brand") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const sort = searchParams.get("sort") || "rating";
  const page = Number(searchParams.get("page") || 1);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);

  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Local, uncommitted price inputs - only pushed into the URL (and the
  // actual request) on blur/Enter, so a request doesn't fire on every
  // keystroke while someone is still typing "2000".
  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice });
  useEffect(() => { setPriceDraft({ min: minPrice, max: maxPrice }); }, [minPrice, maxPrice]);

  useEffect(() => {
    categoriesApi.listCategories().then(async (list) => {
      const withCounts = await Promise.all(
        (list || []).map(async (category) => {
          try {
            const { meta: m } = await productsApi.listProducts({ categoryId: category.id, limit: 1 });
            return { ...category, count: m?.total ?? 0 };
          } catch {
            return { ...category, count: 0 };
          }
        })
      );
      setCategories(withCounts);
    }).catch(() => {});

    productsApi.listBrands().then(setBrands).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);


    productsApi
      .listProducts({ q, categoryId, brand, minPrice, maxPrice, sort, page, limit: PAGE_SIZE })
      .then(({ items, meta: responseMeta }) => {
        if (cancelled) return;
        setProducts(items || []);
        setMeta(responseMeta || { page: 1, totalPages: 1, total: 0 });
      })
      .catch((e) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [q, categoryId, brand, minPrice, maxPrice, sort, page]);

  function patch(next) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page"); // any filter change starts back at page 1
    setSearchParams(params);
  }

  function goToPage(nextPage) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFilters() {

    setSearchParams(q ? { q } : {});
  }

  function toggleCategory(id) {
    patch({ categoryId: categoryId === id ? "" : id });
  }
  function toggleBrand(name) {
    patch({ brand: brand === name ? "" : name });
  }
  function commitPriceDraft() {
    patch({ minPrice: priceDraft.min, maxPrice: priceDraft.max });
  }

  const hasFilters = Boolean(categoryId || brand || minPrice || maxPrice);
  const activeCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="container py-5">
      {/* Present but visually hidden - the Figma frame has no on-page
          heading (the section title lives in the navbar), but every page
          still needs exactly one real h1 for screen reader users. */}
      <h1 className="gv-sr">{activeCategory ? activeCategory.name : "Catalog"}</h1>

      <div className="row g-4">
        {/* Filters */}
        <aside className="col-12 col-lg-3">
          <div className="gv-filters">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h2 className="h5 mb-0">Filter Vaults</h2>
              {hasFilters && (
                <button type="button" className="gv-filters__reset" onClick={resetFilters}>
                  Reset

                </button>
              )}
            </div>

            <div className="gv-filters__group">
              <h3 className="gv-filters__label">Categories</h3>
              {categories.map((c) => (
                <label className="form-check gv-filters__check" key={c.id}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={categoryId === c.id}
                    onChange={() => toggleCategory(c.id)}
                  />
                  <span className="form-check-label">
                    {c.name} <span className="gv-muted">({c.count})</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="gv-filters__group">
              <h3 className="gv-filters__label">Makers &amp; Brands</h3>
              {brands.map((b) => (
                <label className="form-check gv-filters__check" key={b}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={brand === b}
                    onChange={() => toggleBrand(b)}
                  />
                  <span className="form-check-label">{b}</span>

                </label>
              ))}
              {brands.length === 0 && <p className="gv-muted small mb-0">No brands yet.</p>}
            </div>

            <div className="gv-filters__group">
              <h3 className="gv-filters__label">Price Range</h3>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="number"
                  min="0"
                  className="form-control form-control-sm"
                  placeholder="R0"
                  value={priceDraft.min}
                  onChange={(e) => setPriceDraft((d) => ({ ...d, min: e.target.value }))}
                  onBlur={commitPriceDraft}
                  onKeyDown={(e) => e.key === "Enter" && commitPriceDraft()}
                  aria-label="Minimum price"
                />
                <span className="gv-muted">-</span>
                <input
                  type="number"
                  min="0"
                  className="form-control form-control-sm"
                  placeholder="R2000"
                  value={priceDraft.max}
                  onChange={(e) => setPriceDraft((d) => ({ ...d, max: e.target.value }))}
                  onBlur={commitPriceDraft}
                  onKeyDown={(e) => e.key === "Enter" && commitPriceDraft()}
                  aria-label="Maximum price"
                />
              </div>

            </div>
          </div>
        </aside>

        {/* Grid */}
        <main className="col-12 col-lg-9">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
            <p className="mb-0">
              Showing <strong>{meta.total}</strong> tech asset{meta.total === 1 ? "" : "s"}
            </p>
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="gv-sort" className="gv-muted small mb-0">Sort by:</label>
              <select
                id="gv-sort"
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={sort}
                onChange={(e) => patch({ sort: e.target.value })}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="gv-filters__group" role="alert">
              Couldn't load products right now. Try again shortly.
            </div>
          )}


          {!error && !loading && products.length === 0 && (
            <div className="gv-filters py-5 text-center">
              <p className="gv-muted mb-0">No products match those filters.</p>
            </div>
          )}

          <div className="row g-3">
            {products.map((product) => (
              <div className="col-6 col-lg-4" key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          <div className="mt-5">
            <Pagination page={meta.page} totalPages={meta.totalPages} onChange={goToPage} />
          </div>
        </main>
      </div>
    </div>
  );
}