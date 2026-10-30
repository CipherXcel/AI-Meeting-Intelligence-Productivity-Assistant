import { useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { api, setToken } from "../lib/workspace";

export function AccountSecurity() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSuccess(false);
    if (next !== confirmation) return setError("New passwords do not match.");
    if (current === next) return setError("Choose a different new password.");
    setSaving(true);
    try {
      const result = await api("/auth/change-password", "POST", {
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirmation,
      });
      setToken(result.token);
      setCurrent("");
      setNext("");
      setConfirmation("");
      setVisible(false);
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not change your password. Please retry.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="panel password-panel" onSubmit={submit}>
      <div className="settings-section-title">
        <span className="settings-section-icon">
          <LockKeyhole size={20} />
        </span>
        <div>
          <h2>Password & sign-in</h2>
          <p>Confirm your current password to choose a new one.</p>
        </div>
      </div>
      <label>
        Current password
        <input
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          name="currentPassword"
          required
          maxLength={128}
          value={current}
          disabled={saving}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </label>
      <div className="form-grid">
        <label>
          New password
          <input
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            name="newPassword"
            required
            minLength={10}
            maxLength={128}
            value={next}
            disabled={saving}
            aria-describedby="password-requirements"
            onChange={(e) => setNext(e.target.value)}
          />
        </label>
        <label>
          Confirm new password
          <input
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            name="confirmPassword"
            required
            minLength={10}
            maxLength={128}
            value={confirmation}
            disabled={saving}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
      </div>
      <div className="password-options">
        <p id="password-requirements">Use 10–128 characters.</p>
        <button
          type="button"
          className="text-button"
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          {visible ? "Hide passwords" : "Show passwords"}
        </button>
      </div>
      <p className="security-hint">
        <ShieldCheck size={17} />
        <span>
          Other sessions will be signed out. You’ll stay signed in here.
        </span>
      </p>
      {error && (
        <p className="settings-feedback error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="settings-feedback success" role="status">
          <Check size={16} />
          Password changed. Other sessions have been signed out.
        </p>
      )}
      <div className="password-submit">
        <button
          className="primary"
          disabled={saving || !current || !next || !confirmation}
        >
          <LockKeyhole size={15} />
          {saving ? "Changing password…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
