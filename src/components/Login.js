import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import API from "../api";

export default function Login({ setRole }) {
  const [view, setView] = useState("login");
  // OTP is now verified server-side — no local OTP state needed
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ── form state ──────────────────────────────────────────────────────────────
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ fullname: "", email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpForm, setOtpForm] = useState({ otp: "", newPassword: "" });
  const [errors, setErrors] = useState({});

  const clearErrors = () => setErrors({});
  const switchView = (v) => { setView(v); clearErrors(); };

  // ── Google Sign-In handler ─────────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const res = await API.post("/api/auth/google", {
        credential: credentialResponse.credential,
      });
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("loggedUser", user.fullname);
      localStorage.setItem("isLoggedIn", "true");

      if (user.role === "admin") {
        setRole("admin");
        navigate("/admin");
        return;
      }

      // Check if user has payments → navigate accordingly
      try {
        const payments = await API.get("/api/payments");
        const hasPaid  = Array.isArray(payments.data) && payments.data.length > 0;
        if (hasPaid) localStorage.setItem("paid_" + user.email, "true");
        setRole("user");
        navigate(hasPaid ? "/user" : "/");
      } catch {
        setRole("user");
        navigate("/");
      }
    } catch (err) {
      setErrors({ submit: err?.response?.data?.message || "Google sign-in failed. Try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrors({ submit: "Google sign-in was cancelled or failed. Please try again." });
  };

  // ── login ───────────────────────────────────────────────────────────────────
  const loginUser = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!loginForm.email.trim()) errs.email = "Email is required";
    if (!loginForm.password.trim()) errs.password = "Password is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const res = await API.post("/api/auth/login", {
        email: loginForm.email,
        password: loginForm.password,
      });
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("loggedUser", user.fullname);
      localStorage.setItem("isLoggedIn", "true");

      if (user.role === "admin") {
        setRole("admin");
        alert(`👑 Welcome Admin ${user.fullname}!`);
        navigate("/admin");
        return;
      }

      const payments = await API.get("/api/payments");
      const paymentsData = Array.isArray(payments.data) ? payments.data : [];
      const hasPaid = paymentsData.length > 0;
      if (hasPaid) localStorage.setItem("paid_" + user.email, "true");

      setRole("user");
      alert("👋 Welcome " + user.fullname + "!");

      // Navigate based on whether user has ever purchased a plan
      if (hasPaid) {
        // Has a plan (active or expired) → go to dashboard
        // Expired users will see the renewal banner inside UserDashboard
        navigate("/user");
      } else {
        // No plan yet → go to landing page to browse plans
        navigate("/");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Login failed. Check your credentials.";
      const notVerified = err?.response?.data?.notVerified;
      if (notVerified) {
        setErrors({ submit: msg, notVerified: true });
      } else {
        setErrors({ submit: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── register ─────────────────────────────────────────────────────────────────
  const registerUser = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!regForm.fullname.trim()) errs.fullname = "Full name is required";
    if (!regForm.email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(regForm.email)) errs.email = "Enter a valid email";
    if (!regForm.password) errs.password = "Password is required";
    else if (regForm.password.length < 6) errs.password = "At least 6 characters";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await API.post("/api/auth/register", {
        fullname: regForm.fullname,
        email: regForm.email,
        password: regForm.password,
      });
      // Show message about email verification
      setErrors({ submit_info: "Account created! Please check your email to verify your account before logging in." });
      setTimeout(() => switchView("login"), 4000);
      switchView("login");
    } catch (err) {
      setErrors({ submit: err?.response?.data?.message || "Registration failed." });
    } finally {
      setLoading(false);
    }
  };

  // ── forgot / OTP (same demo logic as original) ────────────────────────────
  const sendOTP = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setErrors({ forgotEmail: "Enter your email" }); return; }
    setLoading(true);
    try {
      await API.post("/api/auth/forgot-password", { email: forgotEmail });
      switchView("otp");
      clearErrors();
    } catch (err) {
      setErrors({ forgotEmail: err?.response?.data?.message || "Failed to send OTP" });
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!otpForm.otp.trim())            errs.otp         = "Enter the OTP";
    if (otpForm.newPassword.length < 6) errs.newPassword = "Password must be at least 6 characters";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await API.post("/api/auth/verify-otp", { email: forgotEmail, otp: otpForm.otp });
      await API.post("/api/auth/reset-password", {
        email: forgotEmail, otp: otpForm.otp, newPassword: otpForm.newPassword,
      });
      setErrors({ submit_success: "Password reset successfully! You can now sign in." });
      setTimeout(() => { switchView("login"); setOtpForm({ otp:"", newPassword:"" }); setForgotEmail(""); }, 2500);
    } catch (err) {
      setErrors({ otp: err?.response?.data?.message || "Verification failed" });
    } finally {
      setLoading(false);
    }
  };
  // ── left panel content per view ───────────────────────────────────────────
  const panels = {
    login:    { line1: "WELCOME",  line2: "BACK",      sub: "Sign in to continue your fitness journey and pick up right where you left off." },
    register: { line1: "START",    line2: "YOUR JOURNEY", sub: "Create your account and take the first step toward the best version of yourself." },
    forgot:   { line1: "RESET",    line2: "PASSWORD",  sub: "No worries — we'll help you get back into your account in seconds." },
    otp:      { line1: "CHECK",    line2: "YOUR INBOX",sub: "Enter the OTP from your email along with your new password." },
  };
  const panel = panels[view];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lg-root {
          min-height: 100vh;
          background: #0a0a0a;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          color: #f0ede8;
        }

        /* Left panel */
        .lg-left {
          width: 400px;
          flex-shrink: 0;
          background: #111;
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 48px 40px;
          overflow: hidden;
        }
        .lg-left::before {
          content: '';
          position: absolute;
          top: -100px; left: -80px;
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(163,217,89,0.16) 0%, transparent 70%);
          pointer-events: none;
        }
        .lg-left::after {
          content: '';
          position: absolute;
          bottom: -80px; right: -60px;
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(163,217,89,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .lg-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          letter-spacing: 3px;
          color: #a3d959;
          margin-bottom: 64px;
        }
        .lg-headline {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 68px;
          line-height: 0.9;
          letter-spacing: 2px;
          color: #f0ede8;
          margin-bottom: 24px;
        }
        .lg-headline span { color: #a3d959; display: block; }
        .lg-sub {
          font-size: 14px;
          color: #666;
          line-height: 1.75;
          font-weight: 300;
        }
        .lg-badge {
          margin-top: auto;
          padding: 20px;
          background: rgba(163,217,89,0.06);
          border: 1px solid rgba(163,217,89,0.15);
          border-radius: 12px;
        }
        .lg-badge-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 1.5px;
          color: #a3d959;
          margin-bottom: 6px;
        }
        .lg-badge-text { font-size: 12px; color: #666; line-height: 1.6; font-weight: 300; }

        /* Right panel */
        .lg-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }
        .lg-card { width: 100%; max-width: 420px; }

        .lg-view-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 34px;
          letter-spacing: 2px;
          color: #f0ede8;
          margin-bottom: 6px;
        }
        .lg-view-desc { font-size: 13px; color: #555; margin-bottom: 28px; font-weight: 300; }
        .lg-divider { height: 1px; background: #1a1a1a; margin-bottom: 28px; }

        /* Fields */
        .lg-field { margin-bottom: 16px; }
        .lg-label {
          display: block;
          font-size: 11px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #555;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .lg-input {
          width: 100%;
          background: #111;
          border: 1px solid #222;
          border-radius: 8px;
          padding: 13px 16px;
          font-size: 14px;
          color: #f0ede8;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s;
          outline: none;
        }
        .lg-input:focus { border-color: #a3d959; }
        .lg-input.err { border-color: #e05a5a; }
        .lg-err-text { font-size: 11px; color: #e05a5a; margin-top: 5px; display: block; }
        .lg-submit-err {
          background: rgba(224,90,90,0.08);
          border: 1px solid rgba(224,90,90,0.25);
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 13px;
          color: #e05a5a;
          margin-bottom: 16px;
        }

        /* Buttons */
        .lg-btn {
          width: 100%;
          padding: 14px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.5px;
          margin-top: 4px;
          background: #a3d959;
          color: #0a0a0a;
        }
        .lg-btn:hover { background: #b8e870; }
        .lg-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Links */
        .lg-links { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; align-items: center; }
        .lg-link {
          font-size: 13px;
          color: #555;
          cursor: pointer;
          transition: color 0.2s;
          background: none;
          border: none;
          font-family: 'DM Sans', sans-serif;
          padding: 0;
        }
        .lg-link:hover { color: #a3d959; }
        .lg-link span { color: #a3d959; }

        @media (max-width: 760px) {
          .lg-left { display: none; }
          .lg-right { padding: 32px 20px; align-items: flex-start; padding-top: 48px; }
        }
      `}</style>

      <div className="lg-root">

        {/* Left panel */}
        <div className="lg-left">
          <div className="lg-logo">ROYAL FITNESS</div>
          <div className="lg-headline">
            {panel.line1}
            <span>{panel.line2}</span>
          </div>
          <p className="lg-sub">{panel.sub}</p>
          <div className="lg-badge">
            <div className="lg-badge-title">10,000+ Members Strong</div>
            <p className="lg-badge-text">
              Join a community that pushes limits every single day. Real coaches, real results.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg-right">
          <div className="lg-card">

            {/* LOGIN */}
            {view === "login" && (
              <>
                <div className="lg-view-title">SIGN IN</div>
                <p className="lg-view-desc">Enter your credentials to access your account</p>
                <div className="lg-divider" />
                <form onSubmit={loginUser}>
                  <div className="lg-field">
                    <label className="lg-label">Email Address</label>
                    <input className={`lg-input ${errors.email ? "err" : ""}`}
                      type="email" placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={e => { setLoginForm(f => ({ ...f, email: e.target.value })); clearErrors(); }} />
                    {errors.email && <span className="lg-err-text">{errors.email}</span>}
                  </div>
                  <div className="lg-field">
                    <label className="lg-label">Password</label>
                    <input className={`lg-input ${errors.password ? "err" : ""}`}
                      type="password" placeholder="Your password"
                      value={loginForm.password}
                      onChange={e => { setLoginForm(f => ({ ...f, password: e.target.value })); clearErrors(); }} />
                    {errors.password && <span className="lg-err-text">{errors.password}</span>}
                  </div>
                  {errors.submit && (
                    <div className="lg-submit-err">
                      {errors.submit}
                      {errors.notVerified && (
                        <div style={{ marginTop:8 }}>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await API.post("/api/auth/resend-verification", { email: loginForm.email });
                                setErrors({ submit: "Verification email resent! Check your inbox." });
                              } catch {
                                setErrors({ submit: "Failed to resend. Try again." });
                              }
                            }}
                            style={{ background:"none", border:"none", color:"#a3d959", fontSize:12, cursor:"pointer", textDecoration:"underline", padding:0 }}
                          >
                            Resend verification email →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <button type="submit" className="lg-btn" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In →"}
                  </button>
                </form>
                {/* Google Sign-In */}
                <div style={{ marginTop:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                    <div style={{ flex:1, height:1, background:"#1a1a1a" }} />
                    <span style={{ fontSize:11, color:"#444", letterSpacing:"1px", textTransform:"uppercase" }}>or continue with</span>
                    <div style={{ flex:1, height:1, background:"#1a1a1a" }} />
                  </div>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="filled_black"
                    shape="rectangular"
                    size="large"
                    width="100%"
                    text="signin_with"
                  />
                </div>

                <div className="lg-links">
                  {new URLSearchParams(window.location.search).get("verified") === "true" && (
                    <div style={{ background:"rgba(163,217,89,0.08)", border:"1px solid rgba(163,217,89,0.25)", borderRadius:8, padding:"12px 14px", fontSize:13, color:"#a3d959", marginBottom:16, textAlign:"center" }}>
                      ✅ Email verified! You can now sign in.
                    </div>
                  )}
                  <button className="lg-link" onClick={() => switchView("register")}>
                    Don't have an account? <span>Register free</span>
                  </button>
                  <button className="lg-link" onClick={() => switchView("forgot")}>
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {/* REGISTER */}
            {view === "register" && (
              <>
                <div className="lg-view-title">CREATE ACCOUNT</div>
                <p className="lg-view-desc">Join Royal Fitness and start your transformation</p>
                <div className="lg-divider" />
                <form onSubmit={registerUser}>
                  <div className="lg-field">
                    <label className="lg-label">Full Name</label>
                    <input className={`lg-input ${errors.fullname ? "err" : ""}`}
                      type="text" placeholder="e.g. Rahul Sharma"
                      value={regForm.fullname}
                      onChange={e => { setRegForm(f => ({ ...f, fullname: e.target.value })); clearErrors(); }} />
                    {errors.fullname && <span className="lg-err-text">{errors.fullname}</span>}
                  </div>
                  <div className="lg-field">
                    <label className="lg-label">Email Address</label>
                    <input className={`lg-input ${errors.email ? "err" : ""}`}
                      type="email" placeholder="you@example.com"
                      value={regForm.email}
                      onChange={e => { setRegForm(f => ({ ...f, email: e.target.value })); clearErrors(); }} />
                    {errors.email && <span className="lg-err-text">{errors.email}</span>}
                  </div>
                  <div className="lg-field">
                    <label className="lg-label">Password</label>
                    <input className={`lg-input ${errors.password ? "err" : ""}`}
                      type="password" placeholder="Min 6 characters"
                      value={regForm.password}
                      onChange={e => { setRegForm(f => ({ ...f, password: e.target.value })); clearErrors(); }} />
                    {errors.password && <span className="lg-err-text">{errors.password}</span>}
                  </div>
                  {errors.submit && <div className="lg-submit-err">{errors.submit}</div>}
                  {errors.submit_info && (
                    <div style={{ background:"rgba(163,217,89,0.08)", border:"1px solid rgba(163,217,89,0.25)", borderRadius:8, padding:"12px 14px", fontSize:13, color:"#a3d959", marginBottom:8 }}>
                      📧 {errors.submit_info}
                    </div>
                  )}
                  <button type="submit" className="lg-btn" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account →"}
                  </button>
                </form>
                {/* Google Sign-Up */}
                <div style={{ marginTop:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                    <div style={{ flex:1, height:1, background:"#1a1a1a" }} />
                    <span style={{ fontSize:11, color:"#444", letterSpacing:"1px", textTransform:"uppercase" }}>or sign up with</span>
                    <div style={{ flex:1, height:1, background:"#1a1a1a" }} />
                  </div>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="filled_black"
                    shape="rectangular"
                    size="large"
                    width="100%"
                    text="signup_with"
                  />
                </div>

                <div className="lg-links">
                  <button className="lg-link" onClick={() => switchView("login")}>
                    Already have an account? <span>Sign in</span>
                  </button>
                </div>
              </>
            )}

            {/* FORGOT PASSWORD */}
            {view === "forgot" && (
              <>
                <div className="lg-view-title">FORGOT PASSWORD</div>
                <p className="lg-view-desc">We'll send an OTP to your registered email</p>
                <div className="lg-divider" />
                <form onSubmit={sendOTP}>
                  <div className="lg-field">
                    <label className="lg-label">Email Address</label>
                    <input className={`lg-input ${errors.forgotEmail ? "err" : ""}`}
                      type="email" placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={e => { setForgotEmail(e.target.value); clearErrors(); }} />
                    {errors.forgotEmail && <span className="lg-err-text">{errors.forgotEmail}</span>}
                  </div>
                  <button type="submit" className="lg-btn" disabled={loading}>{loading ? "Sending OTP..." : "Send OTP to Email →"}</button>
                </form>
                <div className="lg-links">
                  <button className="lg-link" onClick={() => switchView("login")}>
                    ← Back to <span>Sign In</span>
                  </button>
                </div>
              </>
            )}

            {/* OTP / RESET */}
            {view === "otp" && (
              <>
                <div className="lg-view-title">ENTER OTP</div>
                <p className="lg-view-desc">Enter the 6-digit OTP and choose a new password</p>
                <div className="lg-divider" />
                <form onSubmit={verifyOTP}>
                  <div className="lg-field">
                    <label className="lg-label">6-Digit OTP</label>
                    <input className={`lg-input ${errors.otp ? "err" : ""}`}
                      type="text" placeholder="Enter OTP" maxLength={6}
                      value={otpForm.otp}
                      onChange={e => { setOtpForm(f => ({ ...f, otp: e.target.value })); clearErrors(); }} />
                    {errors.otp && <span className="lg-err-text">{errors.otp}</span>}
                  </div>
                  {errors.submit_success && (
                    <div style={{ background:"rgba(163,217,89,0.08)", border:"1px solid rgba(163,217,89,0.25)", borderRadius:8, padding:"12px 14px", fontSize:13, color:"#a3d959", marginBottom:12 }}>
                      ✅ {errors.submit_success}
                    </div>
                  )}
                  <div className="lg-field">
                    <label className="lg-label">New Password</label>
                    <input className={`lg-input ${errors.newPassword ? "err" : ""}`}
                      type="password" placeholder="Min 6 characters"
                      value={otpForm.newPassword}
                      onChange={e => { setOtpForm(f => ({ ...f, newPassword: e.target.value })); clearErrors(); }} />
                    {errors.newPassword && <span className="lg-err-text">{errors.newPassword}</span>}
                  </div>
                  <button type="submit" className="lg-btn" disabled={loading}>{loading ? "Verifying..." : "Reset Password →"}</button>
                </form>
                <div className="lg-links">
                  <button className="lg-link" onClick={() => switchView("login")}>
                    ← Back to <span>Sign In</span>
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}