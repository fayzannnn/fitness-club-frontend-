import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) return resolve(true);
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const PLAN_PERKS = {
  Basic:   ["Smart Workout Plan", "At Home Workout", "Basic Diet Guidance"],
  Pro:     ["Pro Gym Access", "Smart Workout Plan", "At Home Workout", "Trainer Support"],
  Premium: ["Elite Gym Access", "Smart Workout Plan", "At Home Workout", "Personal Trainer", "Diet + Supplement Plan"],
};

export default function PaymentPage() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [loading, setLoading]           = React.useState(false);
  const [cashLoading, setCashLoading]   = React.useState(false);
  const [showCashModal, setShowCashModal] = React.useState(false);
  const [cashDone, setCashDone]         = React.useState(false);

  const queryParams = new URLSearchParams(location.search);
  const plan  = queryParams.get("plan")  || "Basic";
  const price = Number(queryParams.get("price") || 10000);
  const perks = PLAN_PERKS[plan] || PLAN_PERKS.Basic;

  React.useEffect(() => {
    if (!localStorage.getItem("token")) {
      alert("Please login first to proceed with payment!");
      navigate("/login");
    }
  }, [navigate]);

  // ── Razorpay payment ─────────────────────────────────────────────────────────
  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay. Check your internet connection.");

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const { data } = await API.post("/api/payments/create-order", { plan, price });
      if (!data.success) throw new Error(data.message || "Could not create order");

      const options = {
        key:         data.keyId,
        amount:      data.amount,
        currency:    data.currency,
        name:        "Royal Fitness",
        description: `${plan} Plan`,
        order_id:    data.orderId,
        prefill:     { name: user.fullname || "", email: user.email || "" },
        theme:       { color: "#a3d959" },
        handler: async (response) => {
          try {
            const verifyRes = await API.post("/api/payments/verify", {
              razorpay_order_id:  response.razorpay_order_id,
              razorpay_payment_id:response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
              price,
            });
            if (verifyRes.data.success) {
              alert(`Payment of ₹${price.toLocaleString("en-IN")} for ${plan} Plan Successful ✅`);
              navigate("/user");
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (err) {
            alert(err?.response?.data?.message || "Verification failed. Contact support.");
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (r) => {
        alert(`Payment failed: ${r.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Cash payment ──────────────────────────────────────────────────────────────
  const handleCashPayment = async () => {
    setCashLoading(true);
    try {
      const res = await API.post("/api/payments/cash", { plan, price });
      if (res.data.success) {
        setCashDone(true);
        setShowCashModal(false);
        setTimeout(() => navigate("/user"), 2000);
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Cash payment recording failed. Try again.");
    } finally {
      setCashLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pp-root {
          min-height: 100vh;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          color: #f0ede8;
          padding: 24px;
        }

        .pp-wrap {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          max-width: 860px;
          width: 100%;
          background: #111;
          border: 1px solid #1a1a1a;
          border-radius: 16px;
          overflow: hidden;
        }

        /* ── Left panel ── */
        .pp-left {
          padding: 44px 40px;
          background: #0f0f0f;
          border-right: 1px solid #1a1a1a;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .pp-left::before {
          content: '';
          position: absolute;
          top: -100px; left: -80px;
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(163,217,89,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .pp-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px; letter-spacing: 3px;
          color: #a3d959; margin-bottom: 36px;
        }
        .pp-plan-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 48px; letter-spacing: 2px;
          color: #f0ede8; line-height: 1;
          margin-bottom: 6px;
        }
        .pp-plan-label {
          font-size: 12px; color: #555;
          letter-spacing: 1px; text-transform: uppercase;
          margin-bottom: 28px;
        }
        .pp-price {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 56px; letter-spacing: 1px;
          color: #a3d959; line-height: 1;
          margin-bottom: 4px;
        }
        .pp-price-label { font-size: 12px; color: #555; margin-bottom: 32px; }
        .pp-divider { height: 1px; background: #1a1a1a; margin-bottom: 28px; }
        .pp-perks { display: flex; flex-direction: column; gap: 12px; flex: 1; }
        .pp-perk {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; color: #888; font-weight: 300;
        }
        .pp-perk::before {
          content: '✓';
          color: #a3d959; font-size: 12px;
          font-weight: 700; flex-shrink: 0;
        }
        .pp-secure {
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; color: #444;
          margin-top: 32px;
        }
        .pp-secure-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #a3d959; flex-shrink: 0;
          animation: pp-pulse 2s infinite;
        }
        @keyframes pp-pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }

        /* ── Right panel ── */
        .pp-right { padding: 44px 40px; display: flex; flex-direction: column; gap: 0; }
        .pp-right-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px; letter-spacing: 2px;
          color: #f0ede8; margin-bottom: 8px;
        }
        .pp-right-sub { font-size: 13px; color: #555; margin-bottom: 36px; font-weight: 300; }

        /* Payment method cards */
        .pp-method {
          border: 1px solid #1a1a1a;
          border-radius: 12px;
          padding: 22px;
          margin-bottom: 14px;
          transition: border-color 0.2s;
        }
        .pp-method:hover { border-color: #2a2a2a; }
        .pp-method-header {
          display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
        }
        .pp-method-icon {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .pp-method-icon.online { background: rgba(163,217,89,0.12); }
        .pp-method-icon.cash   { background: rgba(224,180,90,0.12); }
        .pp-method-title { font-size: 15px; font-weight: 500; color: #f0ede8; }
        .pp-method-desc  { font-size: 12px; color: #555; margin-top: 2px; }

        /* Buttons */
        .pp-btn {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          border: none;
          font-size: 14px; font-weight: 500;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .pp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pp-btn-online {
          background: #a3d959; color: #0a0a0a;
        }
        .pp-btn-online:hover:not(:disabled) { background: #b8e870; }
        .pp-btn-cash {
          background: transparent;
          border: 1px solid rgba(224,180,90,0.4);
          color: #e0b45a;
        }
        .pp-btn-cash:hover:not(:disabled) { background: rgba(224,180,90,0.08); border-color: rgba(224,180,90,0.7); }

        .pp-or {
          text-align: center; font-size: 11px; color: #333;
          letter-spacing: 1.5px; text-transform: uppercase;
          margin: 4px 0;
        }

        /* ── Cash modal overlay ── */
        .pp-modal-bg {
          position: fixed; inset: 0; z-index: 500;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .pp-modal {
          background: #111;
          border: 1px solid #222;
          border-radius: 16px;
          padding: 36px 32px;
          max-width: 420px; width: 100%;
          text-align: center;
        }
        .pp-modal-icon { font-size: 44px; margin-bottom: 16px; }
        .pp-modal-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 24px; letter-spacing: 2px;
          color: #f0ede8; margin-bottom: 10px;
        }
        .pp-modal-body {
          font-size: 13px; color: #666; line-height: 1.7;
          font-weight: 300; margin-bottom: 28px;
        }
        .pp-modal-body strong { color: #e0b45a; }
        .pp-modal-info {
          background: rgba(224,180,90,0.06);
          border: 1px solid rgba(224,180,90,0.2);
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 24px;
          font-size: 12px; color: #888; line-height: 1.6; text-align: left;
        }
        .pp-modal-btns { display: flex; gap: 10px; }
        .pp-modal-cancel {
          flex: 1; padding: 12px;
          background: transparent; border: 1px solid #222;
          border-radius: 8px; color: #666; font-size: 13px;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .pp-modal-cancel:hover { border-color: #444; color: #888; }
        .pp-modal-confirm {
          flex: 2; padding: 12px;
          background: #e0b45a; border: none;
          border-radius: 8px; color: #0a0a0a; font-size: 13px;
          font-weight: 500; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all 0.2s;
        }
        .pp-modal-confirm:hover  { background: #ecc46a; }
        .pp-modal-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Success state ── */
        .pp-success {
          text-align: center; padding: 48px 0;
        }
        .pp-success-icon { font-size: 52px; margin-bottom: 16px; }
        .pp-success-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px; letter-spacing: 2px; color: #a3d959; margin-bottom: 10px;
        }
        .pp-success-msg { font-size: 13px; color: #666; }

        @media (max-width: 680px) {
          .pp-wrap { grid-template-columns: 1fr; }
          .pp-left { border-right: none; border-bottom: 1px solid #1a1a1a; padding: 32px 24px; }
          .pp-right { padding: 32px 24px; }
        }
      `}</style>

      {/* ── Cash confirmation modal ── */}
      {showCashModal && (
        <div className="pp-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowCashModal(false); }}>
          <div className="pp-modal">
            <div className="pp-modal-icon">💵</div>
            <div className="pp-modal-title">CONFIRM CASH PAYMENT</div>
            <p className="pp-modal-body">
              You are about to record a cash payment of{" "}
              <strong>₹{price.toLocaleString("en-IN")}</strong> for the{" "}
              <strong>{plan} Plan</strong>.
            </p>
            <div className="pp-modal-info">
              <div style={{ marginBottom: 6, color: "#e0b45a", fontWeight: 500, fontSize: 12 }}>📋 Important</div>
              Please visit the front desk and complete your cash payment within 24 hours.
              Your membership will be activated immediately after confirmation.
              Bring this booking ID to the counter.
            </div>
            <div className="pp-modal-btns">
              <button className="pp-modal-cancel" onClick={() => setShowCashModal(false)}>
                Cancel
              </button>
              <button className="pp-modal-confirm" onClick={handleCashPayment} disabled={cashLoading}>
                {cashLoading ? "Confirming..." : "Confirm Cash Payment →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pp-root">
        <div className="pp-wrap">

          {/* ── Left: Plan summary ── */}
          <div className="pp-left">
            <div className="pp-logo">ROYAL FITNESS</div>
            <div className="pp-plan-name">{plan}</div>
            <div className="pp-plan-label">Membership Plan</div>
            <div className="pp-price">₹{price.toLocaleString("en-IN")}</div>
            <div className="pp-price-label">per month</div>
            <div className="pp-divider" />
            <div className="pp-perks">
              {perks.map(p => (
                <div className="pp-perk" key={p}>{p}</div>
              ))}
            </div>
            <div className="pp-secure">
              <div className="pp-secure-dot" />
              100% Secure — Powered by Razorpay & Royal Fitness
            </div>
          </div>

          {/* ── Right: Payment options ── */}
          <div className="pp-right">

            {cashDone ? (
              /* Success state after cash payment */
              <div className="pp-success">
                <div className="pp-success-icon">✅</div>
                <div className="pp-success-title">BOOKING CONFIRMED!</div>
                <p className="pp-success-msg">
                  Your {plan} plan is reserved. Please visit the front desk to complete your cash payment.
                  Redirecting to dashboard...
                </p>
              </div>
            ) : (
              <>
                <div className="pp-right-title">COMPLETE PAYMENT</div>
                <p className="pp-right-sub">Choose how you'd like to pay for your membership</p>

                {/* Online payment via Razorpay */}
                <div className="pp-method">
                  <div className="pp-method-header">
                    <div className="pp-method-icon online">💳</div>
                    <div>
                      <div className="pp-method-title">Pay Online</div>
                      <div className="pp-method-desc">UPI, Credit/Debit Card, Net Banking — instant activation</div>
                    </div>
                  </div>
                  <form onSubmit={handlePayment}>
                    <button type="submit" className="pp-btn pp-btn-online" disabled={loading}>
                      {loading ? "Opening payment..." : `Pay ₹${price.toLocaleString("en-IN")} via Razorpay →`}
                    </button>
                  </form>
                </div>

                <div className="pp-or">or</div>

                {/* Cash payment */}
                <div className="pp-method">
                  <div className="pp-method-header">
                    <div className="pp-method-icon cash">💵</div>
                    <div>
                      <div className="pp-method-title">Pay with Cash</div>
                      <div className="pp-method-desc">Reserve now, pay at the front desk within 24 hours</div>
                    </div>
                  </div>
                  <button
                    className="pp-btn pp-btn-cash"
                    onClick={() => setShowCashModal(true)}
                    disabled={cashLoading}
                  >
                    💵 Reserve with Cash Payment →
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