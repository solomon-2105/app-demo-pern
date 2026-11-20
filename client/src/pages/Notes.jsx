import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const EMPTY = { title: "", content: "" };
const LIMIT = 2;

export default function Notes() {
  const { logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // { id, version }
  const [error, setError] = useState("");
  const latest = useRef(0);

  const load = useCallback(async (p) => {
    const reqId = ++latest.current; // ignore responses from superseded requests
    setLoading(true);
    try {
      const res = await api(`/notes?page=${p}&limit=${LIMIT}`);
      if (reqId !== latest.current) return;
      if (res.data.length === 0 && p > 1) {
        setPage(res.totalPages); // this page no longer exists (e.g. last item deleted)
        return;
      }
      setNotes(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      if (reqId === latest.current) setError(err.message);
    } finally {
      if (reqId === latest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  function resetForm() {
    setForm(EMPTY);
    setEditing(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editing) {
        await api(`/notes/${editing.id}`, {
          method: "PUT",
          body: { ...form, version: editing.version },
        });
      } else {
        await api("/notes", { method: "POST", body: form });
      }
      resetForm();
      // saved notes sort to the top of page 1
      if (page === 1) await load(1);
      else setPage(1);
    } catch (err) {
      if (err.code === "VERSION_CONFLICT") {
        setError("This note was changed elsewhere. The latest version is reloaded; edit it again.");
        resetForm();
        await load(page);
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    setError("");
    try {
      await api(`/notes/${id}`, { method: "DELETE" });
      if (editing?.id === id) resetForm();
    } catch (err) {
      setError(err.message);
    }
    await load(page);
  }

  function onEdit(n) {
    setEditing({ id: n.id, version: n.version });
    setForm({ title: n.title, content: n.content });
  }

  return (
    <>
      <div className="row">
        <h1 style={{ flex: 1 }}>My Notes</h1>
        <button onClick={logout}>Logout</button>
      </div>

      <form onSubmit={onSubmit}>
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          disabled={saving}
        />
        <textarea
          placeholder="Content"
          rows={4}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          disabled={saving}
        />
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : editing ? "Update" : "Add note"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} disabled={saving}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : notes.length === 0 ? (
        <p>No notes yet.</p>
      ) : (
        notes.map((n) => (
          <div className="note" key={n.id}>
            <h3>{n.title}</h3>
            <p>{n.content}</p>
            <div className="row">
              <button onClick={() => onEdit(n)}>Edit</button>
              <button onClick={() => onDelete(n.id)}>Delete</button>
            </div>
          </div>
        ))
      )}

      {totalPages > 1 && (
        <div className="row">
          <button onClick={() => setPage(page - 1)} disabled={page <= 1 || loading}>
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages || loading}>
            Next
          </button>
        </div>
      )}
    </>
  );
}