// src/components/VerifyEmail.jsx
// This page handles the email verification link clicked from inbox
// Add route: <Route path="/verify-email" element={<VerifyEmail />} /> in App.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setStatus("error");
      setMessage("Verification link is invalid or missing. Please register again.");
      return;
    }

    // Call backend to verify the token
    API.get(`/api/auth/verify-email?token=${token}`)
      .then(res => {
        setStatus("success");
        setMessage(res.data.message || "Email verified successfully!");
      })
      .catch(err => {
        setStatus("error");
        setMessage(
          err?.response?.data?.message ||
          "This verification link has expired or already been used."
        );
      });
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .ve-root {
          min-height: 100vh;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          padding: 24px;
        }
        .ve-card {
          background: #111;
          border: 1px solid #1a1a1a;
          border-radius: 16px;
          padding: 48px 40px;
          text-align: center;
          max-width: 440px;
          width: 100%;
        }
        .ve-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 3px;
          color: #a3d959;
          margin-bottom: 36px;
        }
        .ve-icon { font-size: 56px; margin-bottom: 20px; line-height: 1; }
        .ve-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 2px;
          margin-bottom: 12px;
        }
        .ve-title.success { color: #a3d959; }
        .ve-title.error   { color: #e05a5a; }
        .ve-title.loading { color: #555; }
        .ve-msg { font-size: 14px; color: #666; line-height: 1.7; margin-bottom: 32px; font-weight: 300; }
        .ve-spinner {
          width: 40px; height: 40px;
          border: 3px solid #1a1a1a;
          border-top-color: #a3d959;
          border-radius: 50%;
          animation: ve-spin 0.8s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes ve-spin { to { transform: rotate(360deg); } }
        .ve-btn {
          display: inline-block;
          padding: 13px 28px;
          background: #a3d959;
          color: #0a0a0a;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.2s;
          text-decoration: none;
        }
        .ve-btn:hover { background: #b8e870; }
        .ve-btn-outline {
          background: transparent;
          border: 1px solid #222;
          color: #666;
          margin-top: 12px;
          display: inline-block;
        }
        .ve-btn-outline:hover { border-color: #a3d959; color: #a3d959; background: transparent; }
        .ve-divider { height: 1px; background: #1a1a1a; margin: 24px 0; }
      `}</style>

      <div className="ve-root">
        <div className="ve-card">
          <div className="ve-logo">ROYAL FITNESS</div>

          {/* Loading state */}
          {status === "loading" && (
            <>
              <div className="ve-spinner" />
              <div className="ve-title loading">VERIFYING EMAIL</div>
              <p className="ve-msg">Please wait while we verify your email address...</p>
            </>
          )}

          {/* Success state */}
          {status === "success" && (
            <>
              <div className="ve-icon">✅</div>
              <div className="ve-title success">EMAIL VERIFIED!</div>
              <p className="ve-msg">{message} You can now sign in and start your fitness journey.</p>
              <div className="ve-divider" />
              <button className="ve-btn" onClick={() => navigate("/login")}>
                Sign In to Your Account →
              </button>
            </>
          )}

          {/* Error state */}
          {status === "error" && (
            <>
              <div className="ve-icon">❌</div>
              <div className="ve-title error">VERIFICATION FAILED</div>
              <p className="ve-msg">{message}</p>
              <div className="ve-divider" />
              <button className="ve-btn" onClick={() => navigate("/login")}>
                Back to Login
              </button>
              <br />
              <button
                className="ve-btn ve-btn-outline"
                onClick={() => navigate("/login")}
                style={{ marginTop: 12 }}
              >
                Register again →
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}