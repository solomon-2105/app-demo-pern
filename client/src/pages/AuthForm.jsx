import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function AuthForm({ mode }) {
  const isLogin = mode === "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { saveToken } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
  e.preventDefault();
  setError("");
  setSubmitting(true);
  try {
    const data = await api(`/auth/${mode}`, {
      method: "POST",
      body: { email, password },
    });
    saveToken(data.token);
    navigate("/");
  } catch (err) {
    setError(err.message);
  } finally {
    setSubmitting(false);
  }
}

  return (
    <>
      <h1>{isLogin ? "Login" : "Register"}</h1>
      <form onSubmit={onSubmit}>
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (min 8)" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}></button>
      </form>
      {isLogin
        ? <p>No account? <Link to="/register">Register</Link></p>
        : <p>Have an account? <Link to="/login">Login</Link></p>}
    </>
  );
}