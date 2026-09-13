import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import { CloseIcon } from "../components/ui/Icons";
import * as adminApi from "../api/admin.api";
import * as categoriesApi from "../api/categories.api";
import { productImage, onImageError } from "../utils/productImage";
import { formatCents } from "../utils/money";
import { fieldErrors, summaryMessage } from "../utils/apiErrors";
import "./AdminProductsPage.css";

const RESTOCK_STEP = 10;

const BLANK = {
  name: "", slug: "", sku: "", brand: "", description: "",
  price: "", categoryId: "", stockQty: "", images: "",
};

// The API speaks integer cents; the form speaks rands, because nobody types a
// price in cents. The conversion happens here and nowhere else.
function randsToCents(value) {
  const n = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
function centsToRands(cents) {
  return Number.isInteger(cents) ? (cents / 100).toFixed(2) : "";
}

// "Obsidian X-9 Headset" -> "obsidian-x-9-headset", matching the slug rule the
// API enforces, so the field is filled in correctly by default rather than
// rejected after the fact.
function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [editing, setEditing] = useState(null); // null | "new" | product id
  const [values, setValues] = useState(BLANK);
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await adminApi.listProducts({ limit: 100 });
      setProducts(result?.data ?? []);
      setError(null);
    } catch (err) {
      setError(summaryMessage(err, "Could not load the catalogue."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    categoriesApi.listCategories()
      .then((list) => setCategories(list ?? []))
      // A missing category list is not fatal - it only means the picker is
      // empty, and the form says so rather than looking broken.
      .catch(() => setCategories([]));
  }, []);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (product) => product.category?.name || map.get(product.category?.id) || "—";
  }, [categories]);

  function openNew() {
    setEditing("new");
    setValues({ ...BLANK, categoryId: categories[0]?.id || "" });
    setFormErrors({});
    setFormError(null);
  }

  function openEdit(product) {
    setEditing(product.id);
    setValues({
      name: product.name || "",
      slug: product.slug || "",
      sku: product.sku || "",
      brand: product.brand || "",
      description: product.description || "",
      price: centsToRands(product.priceCents),
      categoryId: product.category?.id || "",
      // stockQty only comes back on the admin list, which is where we are.
      stockQty: product.stockQty ?? "",
      images: (product.images || []).join("\n"),
    });
    setFormErrors({});
    setFormError(null);
  }

  function closeForm() {
    setEditing(null);
    setFormErrors({});
    setFormError(null);
  }

  const set = (key) => (e) => {
    const next = e.target.value;
    setValues((v) => {
      // Typing a name fills the slug until the slug is edited by hand, so the
      // common case needs no thought and the unusual one is still possible.
      if (key === "name" && (v.slug === "" || v.slug === slugify(v.name))) {
        return { ...v, name: next, slug: slugify(next) };
      }
      return { ...v, [key]: next };
    });
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setFormErrors({});

    const payload = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      sku: values.sku.trim().toUpperCase(),
      brand: values.brand.trim(),
      description: values.description.trim(),
      priceCents: randsToCents(values.price),
      categoryId: values.categoryId,
      stockQty: Number(values.stockQty),
      // One image per line. Blank lines are dropped rather than sent as an
      // empty string the API would reject.
      images: values.images.split("\n").map((s) => s.trim()).filter(Boolean),
    };

    try {
      if (editing === "new") {
        await adminApi.createProduct(payload);
        setNotice(`${payload.name} was added to the catalogue.`);
      } else {
        await adminApi.updateProduct(editing, payload);
        setNotice(`${payload.name} was updated.`);
      }
      closeForm();
      await load();
    } catch (err) {
      // Field-level messages land on the inputs; anything else goes to the top
      // of the form so a failure is never silent.
      const perField = fieldErrors(err);
      setFormErrors(mapApiFields(perField));
      if (Object.keys(perField).length === 0) {
        setFormError(summaryMessage(err, "We could not save this product."));
      }
    } finally {
      setSaving(false);
    }
  }

  async function run(id, action, message) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      setNotice(message);
      await load();
    } catch (err) {
      setError(summaryMessage(err, "That change could not be saved."));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="gv-page gv-adminp gv-adminp--message">
        <p role="status">Loading the catalogue…</p>
      </div>
    );
  }

  return (
    <div className="gv-page gv-adminp">
      <header className="gv-adminp__head">
        <div>
          <h1>Manage Catalogue</h1>
          <p className="gv-muted">
            {products.length} product{products.length === 1 ? "" : "s"}, including deactivated ones.
          </p>
        </div>
        <div className="gv-adminp__head-actions">
          <Button as={Link} to="/admin" variant="ghost">Dashboard</Button>
          <Button onClick={openNew}>Add product</Button>
        </div>
      </header>

      {error && <div className="gv-adminp__alert"><Alert tone="danger">{error}</Alert></div>}
      {notice && <div className="gv-adminp__alert"><Alert tone="success">{notice}</Alert></div>}

      {editing && (
        <section className="gv-adminp__form-wrap" aria-label={editing === "new" ? "Add a product" : "Edit product"}>
          <header className="gv-adminp__form-head">
            <h2>{editing === "new" ? "Add a product" : "Edit product"}</h2>
            <button type="button" className="gv-adminp__close" onClick={closeForm} aria-label="Close the form">
              <CloseIcon />
            </button>
          </header>

          {formError && <Alert tone="danger">{formError}</Alert>}

          <form className="gv-adminp__form" onSubmit={onSubmit} noValidate>
            <div className="gv-adminp__row">
              <Field label="Name" value={values.name} onChange={set("name")} error={formErrors.name} required />
              <Field label="Slug" value={values.slug} onChange={set("slug")} error={formErrors.slug}
                hint="Lowercase letters, numbers and hyphens. Used in the product URL." required />
            </div>

            <div className="gv-adminp__row">
              <Field label="SKU" value={values.sku} onChange={set("sku")} error={formErrors.sku}
                hint="Uppercase letters, numbers and hyphens." required />
              <Field label="Brand" value={values.brand} onChange={set("brand")} error={formErrors.brand} required />
            </div>

            <div className="gv-adminp__row gv-adminp__row--3">
              <Field label="Price (R)" type="text" inputMode="decimal" value={values.price}
                onChange={set("price")} error={formErrors.priceCents} hint="e.g. 349.00" required />
              <Field label="Stock" type="number" min="0" value={values.stockQty}
                onChange={set("stockQty")} error={formErrors.stockQty} required />

              <div className="gv-field">
                <div className="gv-field__top">
                  <label className="gv-field__label" htmlFor="gv-adminp-cat">Category</label>
                </div>
                <select
                  id="gv-adminp-cat"
                  className="gv-adminp__select"
                  value={values.categoryId}
                  onChange={set("categoryId")}
                  required
                >
                  <option value="" disabled>
                    {categories.length ? "Choose a category" : "No categories yet"}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {formErrors.categoryId && <p className="gv-field__error">{formErrors.categoryId}</p>}
                {/* Met at exactly the moment it blocks them, with the fix one
                    click away rather than something to go and find. */}
                {categories.length === 0 && (
                  <p className="gv-field__hint">
                    A product needs a category. <Link to="/admin/categories">Add one first</Link>.
                  </p>
                )}
              </div>
            </div>

            <div className="gv-field">
              <div className="gv-field__top">
                <label className="gv-field__label" htmlFor="gv-adminp-desc">Description</label>
              </div>
              <textarea
                id="gv-adminp-desc"
                className="gv-adminp__textarea"
                rows={3}
                value={values.description}
                onChange={set("description")}
                required
              />
              {formErrors.description && <p className="gv-field__error">{formErrors.description}</p>}
            </div>

            <div className="gv-field">
              <div className="gv-field__top">
                <label className="gv-field__label" htmlFor="gv-adminp-images">Images</label>
              </div>
              <textarea
                id="gv-adminp-images"
                className="gv-adminp__textarea"
                rows={3}
                value={values.images}
                onChange={set("images")}
                placeholder={"/product-pictures/Obsidian%20x9%20black.jpg"}
                required
              />
              <p className="gv-field__hint">
                One per line. Either a path to a file in <code>client/public</code> starting with
                {" "}<code>/</code>, or a full https URL.
              </p>
              {formErrors.images && <p className="gv-field__error">{formErrors.images}</p>}
            </div>

            <div className="gv-adminp__form-actions">
              <Button type="submit" loading={saving}>
                {editing === "new" ? "Add product" : "Save changes"}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
            </div>
          </form>
        </section>
      )}

      {products.length === 0 ? (
        <p className="gv-adminp__empty">No products yet. Add the first one.</p>
      ) : (
        <>
          <div className="gv-adminp__table-wrap" tabIndex={0} role="region" aria-label="Catalogue">
            <table className="gv-adminp__table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">SKU</th>
                  <th scope="col">Category</th>
                  <th scope="col" className="is-right">Price</th>
                  <th scope="col" className="is-right">Stock</th>
                  <th scope="col" className="is-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={p.isActive === false ? "is-inactive" : ""}>
                    <th scope="row">
                      <span className="gv-adminp__product">
                        <img src={productImage(p)} alt="" onError={onImageError} />
                        <span>
                          <span className="gv-adminp__name">{p.name}</span>
                          {/* Text, not just a dimmed row - a greyscale print
                              or a colour-blind reader must still see it. */}
                          {p.isActive === false && <span className="gv-adminp__flag">Deactivated</span>}
                        </span>
                      </span>
                    </th>
                    <td className="gv-adminp__sku">{p.sku}</td>
                    <td>{categoryName(p)}</td>
                    <td className="is-right">{formatCents(p.priceCents)}</td>
                    <td className="is-right">{p.stockQty ?? "—"}</td>
                    <td className="is-right">
                      <div className="gv-adminp__actions">
                        <Button size="sm" variant="outline" loading={busyId === p.id} onClick={() => openEdit(p)}>
                          Edit
                        </Button>
                        <Button
                          size="sm" variant="outline" loading={busyId === p.id}
                          onClick={() => run(p.id, () => adminApi.adjustStock(p.id, RESTOCK_STEP), `${p.name}: +${RESTOCK_STEP} in stock.`)}
                        >
                          +{RESTOCK_STEP}
                        </Button>
                        {p.isActive === false ? (
                          <Button
                            size="sm" variant="outline" loading={busyId === p.id}
                            onClick={() => run(p.id, () => adminApi.reactivateProduct(p.id), `${p.name} is back in the catalogue.`)}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm" variant="ghost" loading={busyId === p.id}
                            onClick={() => {
                              // Deactivating hides a product from the shop, so
                              // it is confirmed - but it is reversible, and the
                              // wording says so.
                              const yes = window.confirm(
                                `Hide ${p.name} from the shop? It stays here and can be reactivated at any time.`
                              );
                              if (yes) run(p.id, () => adminApi.deactivateProduct(p.id), `${p.name} was hidden from the shop.`);
                            }}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="gv-adminp__scroll-hint">Scroll sideways for price, stock and actions.</p>
        </>
      )}
    </div>
  );
}

/**
 * The API reports errors against its own field names. Two differ from the
 * form's, so they are translated rather than silently dropped - an error with
 * no input to attach to is an error nobody sees.
 */
function mapApiFields(perField) {
  const mapped = { ...perField };
  if (perField["images.*"]) mapped.images = perField["images.*"];
  if (perField.priceCents) mapped.priceCents = perField.priceCents;
  return mapped;
}
