import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import * as categoriesApi from "../api/categories.api";
import { summaryMessage } from "../utils/apiErrors";
import "./AdminCategoriesPage.css";

/**
 * Built test-first (see docs/TDD_LOG.md). Exists because the product form's
 * category picker is required: without this page an admin starting from an
 * empty database could never add a product through the app at all.
 */
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setCategories(await categoriesApi.listCategories() ?? []);
      setLoadError(null);
    } catch (err) {
      setLoadError(summaryMessage(err, "Please try again in a moment."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onCreate(e) {
    e.preventDefault();
    const trimmed = name.trim();
    // Nothing typed is not an error worth shouting about - it just is not a
    // request, so it never leaves the browser.
    if (!trimmed) return;

    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      await categoriesApi.createCategory({ name: trimmed });
      // Cleared only on success - don't make someone retype after a failure.
      setName("");
      setNotice(`${trimmed} was added.`);
      await load();
    } catch (err) {
      // The service names the clash ("...already exists"), which is far more
      // use than a generic failure, so its message is shown as sent.
      setActionError(summaryMessage(err, "That category could not be added."));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(category) {
    const yes = window.confirm(
      `Delete ${category.name}? This cannot be undone, and it is refused if any product still uses it.`
    );
    if (!yes) return;

    setBusyId(category.id);
    setActionError(null);
    setNotice(null);
    try {
      await categoriesApi.deleteCategory(category.id);
      setNotice(`${category.name} was deleted.`);
      await load();
    } catch (err) {
      // A category still in use comes back with the product count in it. That
      // number is the actionable part, so it is shown rather than swallowed.
      setActionError(summaryMessage(err, "That category could not be deleted."));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="gv-page gv-adminc gv-adminc--message">
        <p role="status">Loading categories…</p>
      </div>
    );
  }

  return (
    <div className="gv-page gv-adminc">
      <header className="gv-adminc__head">
        <div>
          <h1>Categories</h1>
          <p className="gv-muted">Every product belongs to one of these.</p>
        </div>
        <div className="gv-adminc__head-actions">
          <Button as={Link} to="/admin" variant="ghost">Dashboard</Button>
          <Button as={Link} to="/admin/products" variant="outline">Manage Catalogue</Button>
        </div>
      </header>

      {loadError && <Alert tone="danger" title="Could not load categories">{loadError}</Alert>}
      {actionError && <Alert tone="danger">{actionError}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <form className="gv-adminc__form" onSubmit={onCreate} noValidate>
        <Field
          label="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Cameras"
        />
        <Button type="submit" loading={saving}>Add category</Button>
      </form>

      {categories.length === 0 && !loadError ? (
        <div className="gv-adminc__empty">
          <p className="gv-adminc__empty-title">No categories yet</p>
          <p className="gv-muted">
            Products cannot be added until at least one category exists, because every
            product must belong to one.
          </p>
        </div>
      ) : (
        <ul className="gv-adminc__list">
          {categories.map((c) => (
            <li key={c.id} className="gv-adminc__item">
              <div className="gv-adminc__info">
                <p className="gv-adminc__name">{c.name}</p>
                {/* The slug is shown because it is what appears in URLs, so an
                    admin renaming things needs to see it. */}
                <p className="gv-adminc__slug">{c.slug}</p>
                {c.description && <p className="gv-adminc__desc">{c.description}</p>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                loading={busyId === c.id}
                onClick={() => onDelete(c)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
