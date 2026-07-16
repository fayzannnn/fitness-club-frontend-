import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";

export default function Landing() {
  const navigate = useNavigate();

  // Live reviews from backend (admin-featured ones)
  const [liveReviews, setLiveReviews] = useState([]);
  useEffect(() => {
    API.get("/api/reviews/public")
      .then(res => { if (Array.isArray(res.data) && res.data.length > 0) setLiveReviews(res.data); })
      .catch(() => {}); // silently fall back to hardcoded reviews if API fails
  }, []);

  const handleJoinNow = async (plan, price) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Please login or sign up first to proceed with payment.");
      navigate("/login");
      return;
    }
    try {
      const res = await API.get('/api/payments');
      const hasPaid = Array.isArray(res.data) && res.data.length > 0;
      if (hasPaid) {
        alert("You have already purchased a plan ✅");
        navigate("/user");
      } else {
        navigate(`/payment?plan=${encodeURIComponent(plan)}&price=${encodeURIComponent(price)}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error checking payment status');
    }
  };

  const handleBookClass = () => navigate("/book");

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('loggedUser');
    localStorage.removeItem('isLoggedIn');
    window.location.reload();
  };

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const loggedUser = localStorage.getItem("loggedUser");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --green: #a3d959;
          --dark: #0a0a0a;
          --card: #111;
          --border: #1a1a1a;
          --text: #f0ede8;
          --muted: #555;
        }

        html { scroll-behavior: smooth; font-size: 62.5%; overflow-x: hidden; }

        body {
          background: var(--dark);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
        }

        /* ── HEADER ── */
        .ln-header {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6%;
          height: 70px;
          background: rgba(10,10,10,0.85);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
        }
        .ln-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.2rem;
          letter-spacing: 3px;
          color: var(--green);
          text-decoration: none;
        }
        .ln-logo span { color: var(--text); }
        .ln-nav {
          display: flex;
          align-items: center;
          gap: 3.6rem;
          list-style: none;
        }
        .ln-nav a {
          font-size: 1.4rem;
          font-weight: 400;
          color: var(--muted);
          text-decoration: none;
          letter-spacing: 0.5px;
          transition: color 0.2s;
        }
        .ln-nav a:hover { color: var(--green); }
        .ln-header-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .ln-welcome {
          font-size: 1.3rem;
          color: var(--green);
          font-weight: 500;
        }
        .ln-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 20px;
          background: var(--green);
          color: var(--dark);
          border: none;
          border-radius: 8px;
          font-size: 1.3rem;
          font-weight: 500;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          text-decoration: none;
          transition: background 0.2s;
        }
        .ln-btn:hover { background: #b8e870; }
        .ln-btn-outline {
          background: transparent;
          border: 1px solid #222;
          color: #888;
        }
        .ln-btn-outline:hover { border-color: var(--green); color: var(--green); background: transparent; }

        /* ── HERO ── */
        .ln-hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 100px 6% 60px;
          position: relative;
          overflow: hidden;
        }
        .ln-hero::before {
          content: 'FITNESS';
          position: absolute;
          right: -2%;
          top: 50%;
          transform: translateY(-50%);
          font-family: 'Bebas Neue', sans-serif;
          font-size: 24rem;
          color: var(--text);
          opacity: 0.03;
          pointer-events: none;
          letter-spacing: 10px;
        }
        .ln-hero::after {
          content: '';
          position: absolute;
          top: -200px; right: -200px;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(163,217,89,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .ln-hero-text { position: relative; z-index: 1; max-width: 600px; }
        .ln-hero-eyebrow {
          font-size: 1.2rem;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--green);
          margin-bottom: 16px;
          font-weight: 500;
        }
        .ln-hero-h1 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 10rem;
          line-height: 0.9;
          letter-spacing: 3px;
          color: var(--text);
          margin-bottom: 10px;
        }
        .ln-hero-h1 span { color: var(--green); }
        .ln-hero-sub {
          font-size: 1.6rem;
          color: var(--muted);
          margin: 20px 0 36px;
          font-weight: 300;
          line-height: 1.7;
        }
        .ln-hero-img {
          position: absolute;
          right: 6%;
          bottom: 0;
          width: 34vw;
          max-width: 520px;
          z-index: 1;
        }
        .ln-hero-img img { width: 100%; display: block; }

        /* ── SECTION SHARED ── */
        .ln-section { padding: 100px 6%; }
        .ln-section-label {
          font-size: 1.1rem;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--green);
          margin-bottom: 10px;
          font-weight: 500;
        }
        .ln-section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 5.5rem;
          letter-spacing: 2px;
          color: var(--text);
          margin-bottom: 48px;
        }
        .ln-section-title span { color: var(--green); }
        .ln-divider {
          width: 48px; height: 2px;
          background: var(--green);
          margin-bottom: 48px;
        }

        /* ── SERVICES ── */
        .ln-services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .ln-service-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
          cursor: pointer;
        }
        .ln-service-card:hover {
          border-color: rgba(163,217,89,0.3);
          transform: translateY(-4px);
        }
        .ln-service-card img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
        }
        .ln-service-card h4 {
          padding: 16px 18px;
          font-size: 1.5rem;
          font-weight: 500;
          color: var(--text);
        }

        /* ── ABOUT ── */
        .ln-about {
          display: flex;
          align-items: center;
          gap: 60px;
          padding: 100px 6%;
          background: var(--card);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .ln-about-img {
          flex: 1;
          min-width: 0;
        }
        .ln-about-img img {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--border);
          display: block;
        }
        .ln-about-text { flex: 1; min-width: 0; }
        .ln-about-perks {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
        }
        .ln-perk {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.5rem;
          color: #888;
          font-weight: 300;
        }
        .ln-perk-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--green);
          flex-shrink: 0;
        }

        /* ── PLANS ── */
        .ln-plans { padding: 100px 6%; }
        .ln-plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .ln-plan-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 0;
          transition: border-color 0.2s, transform 0.2s;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .ln-plan-card:hover {
          border-color: rgba(163,217,89,0.4);
          transform: translateY(-4px);
        }
        .ln-plan-card.featured {
          border-color: rgba(163,217,89,0.4);
          background: rgba(163,217,89,0.04);
        }
        .ln-plan-card.featured::before {
          content: 'POPULAR';
          position: absolute;
          top: 16px; right: -28px;
          background: var(--green);
          color: var(--dark);
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 1px;
          padding: 4px 36px;
          transform: rotate(45deg);
        }
        .ln-plan-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.8rem;
          letter-spacing: 2px;
          color: var(--text);
          margin-bottom: 8px;
        }
        .ln-plan-price {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 4.8rem;
          color: var(--green);
          letter-spacing: 1px;
          line-height: 1;
          margin-bottom: 4px;
        }
        .ln-plan-period {
          font-size: 1.2rem;
          color: var(--muted);
          margin-bottom: 24px;
        }
        .ln-plan-divider {
          height: 1px;
          background: var(--border);
          margin-bottom: 20px;
        }
        .ln-plan-perks {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 28px;
          flex: 1;
        }
        .ln-plan-perks li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.4rem;
          color: #888;
          font-weight: 300;
        }
        .ln-plan-perks li::before {
          content: '✓';
          color: var(--green);
          font-size: 1.2rem;
          font-weight: 600;
        }
        .ln-plan-btn {
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 1px solid #222;
          border-radius: 8px;
          color: #888;
          font-size: 1.3rem;
          font-weight: 500;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .ln-plan-btn:hover, .ln-plan-card.featured .ln-plan-btn {
          background: var(--green);
          border-color: var(--green);
          color: var(--dark);
        }

        /* ── REVIEWS ── */
        .ln-reviews {
          padding: 100px 6%;
          background: var(--card);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        /* split layout: left headline + right cards */
        .ln-reviews-layout {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 60px;
          align-items: start;
        }
        /* left panel */
        .ln-reviews-left { position: sticky; top: 100px; }
        .ln-reviews-headline {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 5.5rem;
          line-height: 0.95;
          letter-spacing: 2px;
          color: var(--text);
          margin-bottom: 24px;
        }
        .ln-reviews-headline span { color: var(--green); }
        .ln-reviews-divider {
          width: 100%;
          height: 1px;
          background: var(--border);
          margin-bottom: 32px;
        }
        /* stacked avatars row */
        .ln-avatar-stack {
          display: flex;
          align-items: center;
          margin-bottom: 14px;
        }
        .ln-avatar-stack-img {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: 2px solid var(--card);
          object-fit: cover;
          margin-left: -12px;
          transition: transform 0.2s;
        }
        .ln-avatar-stack-img:first-child { margin-left: 0; }
        .ln-avatar-stack-img:hover { transform: translateY(-4px); z-index: 2; }
        .ln-avatar-more {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: 2px solid var(--border);
          background: rgba(163,217,89,0.1);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; font-weight: 500; color: var(--green);
          margin-left: -12px;
          flex-shrink: 0;
        }
        .ln-member-count {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 3.2rem;
          letter-spacing: 2px;
          color: var(--green);
          line-height: 1;
          margin-bottom: 4px;
        }
        .ln-member-label {
          font-size: 1.3rem;
          color: var(--muted);
          font-weight: 300;
        }
        /* right panel — stacked review cards */
        .ln-reviews-right {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ln-review-card {
          background: var(--dark);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 24px 28px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .ln-review-card:hover {
          border-color: rgba(163,217,89,0.25);
          transform: translateX(4px);
        }
        .ln-review-top {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }
        .ln-review-avatar {
          width: 52px; height: 52px;
          border-radius: 50%;
          border: 2px solid rgba(163,217,89,0.3);
          object-fit: cover;
          flex-shrink: 0;
        }
        .ln-review-avatar-initials {
          width: 52px; height: 52px;
          border-radius: 50%;
          border: 2px solid rgba(163,217,89,0.3);
          background: rgba(163,217,89,0.08);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2rem; color: var(--green);
          flex-shrink: 0;
        }
        .ln-review-meta { flex: 1; }
        .ln-review-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.8rem;
          letter-spacing: 1.5px;
          color: var(--text);
          margin-bottom: 3px;
        }
        .ln-review-stars { color: var(--green); font-size: 1.3rem; letter-spacing: 2px; }
        .ln-review-text {
          font-size: 1.4rem;
          color: #666;
          line-height: 1.75;
          font-weight: 300;
          font-style: italic;
        }
        .ln-review-text::before { content: '"'; }
        .ln-review-text::after  { content: '"'; }

        /* ── FOOTER ── */
        .ln-footer {
          background: var(--dark);
          border-top: 1px solid var(--border);
          padding: 48px 6%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .ln-footer-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2rem;
          letter-spacing: 3px;
          color: var(--green);
        }
        .ln-footer-socials { display: flex; gap: 12px; }
        .ln-social-link {
          width: 40px; height: 40px;
          border-radius: 50%;
          border: 1px solid #1e1e1e;
          display: flex; align-items: center; justify-content: center;
          color: var(--muted);
          font-size: 1.6rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .ln-social-link:hover {
          border-color: var(--green);
          color: var(--green);
          transform: translateY(-3px);
        }
        .ln-copyright { font-size: 1.3rem; color: #333; }

        @media (max-width: 900px) {
          .ln-hero-img { display: none; }
          .ln-hero-h1 { font-size: 7rem; }
          .ln-about { flex-direction: column; }
          .ln-reviews-layout { grid-template-columns: 1fr; }
          .ln-reviews-left { position: static; }
          .ln-reviews-headline { font-size: 4rem; }
          .ln-nav { display: none; }
        }
      `}</style>

      {/* HEADER */}
      <header className="ln-header">
        <a href="#home" className="ln-logo">ROYAL <span>FITNESS</span></a>
        <ul className="ln-nav">
          <li><a href="#home">Home</a></li>
          <li><a href="#service">Services</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#plans">Pricing</a></li>
          <li><a href="#reviews">Reviews</a></li>
        </ul>
        <div className="ln-header-right">
          {isLoggedIn ? (
            <>
              <span className="ln-welcome">Welcome, {loggedUser}</span>
              <button className="ln-btn ln-btn-outline" onClick={logout}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="ln-btn">Sign up →</Link>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="ln-hero" id="home">
        <div className="ln-hero-text">
          <p className="ln-hero-eyebrow">Royal Fitness Club</p>
          <h1 className="ln-hero-h1">
            BUILD YOUR<br />
            <span>DREAM</span><br />
            PHYSIQUE
          </h1>
          <p className="ln-hero-sub">
            World-class equipment, elite trainers,<br />
            and a community that pushes you further.
          </p>
          <a href="#plans" className="ln-btn">Join Now →</a>
        </div>
        <div className="ln-hero-img">
          <img src="/images/hero.png" alt="Hero" />
        </div>
      </section>

      {/* SERVICES */}
      <section className="ln-section" id="service">
        <p className="ln-section-label">What we offer</p>
        <h2 className="ln-section-title">Our <span>Services</span></h2>
        <div className="ln-services-grid">
          {[
            { img: "/images/service1.jpg", label: "Physical Fitness" },
            { img: "/images/service2.jpg", label: "Strength Training" },
            { img: "/images/service3.jpg", label: "Weight Gain" },
            { img: "/images/service4.jpg", label: "Weightlifting" },
            { img: "/images/service5.jpg", label: "Cardio" },
            { img: "/images/service6.jpg", label: "Zumba" },
          ].map((s) => (
            <div className="ln-service-card" key={s.label}>
              <img src={s.img} alt={s.label} />
              <h4>{s.label}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <div className="ln-about" id="about">
        <div className="ln-about-img">
          <img src="/images/about.jpg" alt="About Us" />
        </div>
        <div className="ln-about-text">
          <p className="ln-section-label">Why us</p>
          <h2 className="ln-section-title" style={{ marginBottom: 24 }}>Why Choose <span>Us?</span></h2>
          <div className="ln-about-perks">
            {["Good fitness environment", "Modern equipment", "Professional trainers", "Great atmosphere"].map(p => (
              <div className="ln-perk" key={p}>
                <div className="ln-perk-dot" />
                {p}
              </div>
            ))}
          </div>
          <button className="ln-btn" onClick={handleBookClass}>Book Free Class →</button>
        </div>
      </div>

      {/* PLANS */}
      <section className="ln-plans" id="plans">
        <p className="ln-section-label">Membership</p>
        <h2 className="ln-section-title">Our <span>Plans</span></h2>
        <div className="ln-plans-grid">
          <div className="ln-plan-card">
            <div className="ln-plan-name">BASICS</div>
            <div className="ln-plan-price">₹10,000</div>
            <div className="ln-plan-period">per month</div>
            <div className="ln-plan-divider" />
            <ul className="ln-plan-perks">
              <li>Smart Workout Plan</li>
              <li>At Home Workout</li>
            </ul>
            <button className="ln-plan-btn" onClick={() => handleJoinNow('Basic', 10000)}>Join Now →</button>
          </div>

          <div className="ln-plan-card featured">
            <div className="ln-plan-name">PRO</div>
            <div className="ln-plan-price">₹14,000</div>
            <div className="ln-plan-period">per month</div>
            <div className="ln-plan-divider" />
            <ul className="ln-plan-perks">
              <li>PRO GYMs Access</li>
              <li>Smart Workout Plan</li>
              <li>At Home Workout</li>
            </ul>
            <button className="ln-plan-btn" onClick={() => handleJoinNow('Pro', 14000)}>Join Now →</button>
          </div>

          <div className="ln-plan-card">
            <div className="ln-plan-name">PREMIUM</div>
            <div className="ln-plan-price">₹20,000</div>
            <div className="ln-plan-period">per month</div>
            <div className="ln-plan-divider" />
            <ul className="ln-plan-perks">
              <li>ELITE GYMs Access</li>
              <li>Smart Workout Plan</li>
              <li>At Home Workout</li>
            </ul>
            <button className="ln-plan-btn" onClick={() => handleJoinNow('Premium', 20000)}>Join Now →</button>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <div className="ln-reviews" id="reviews">
        <div className="ln-reviews-layout">

          {/* ── Left: headline + avatar stack ── */}
          <div className="ln-reviews-left">
            <p className="ln-section-label">Testimonials</p>
            <h2 className="ln-reviews-headline">
              OUR CLIENT'S<br /><span>REVIEWS...</span>
            </h2>
            <div className="ln-reviews-divider" />

            {/* stacked avatars — first 5 clients + overflow count */}
            <div className="ln-avatar-stack">
              <img className="ln-avatar-stack-img" src="/images/client1.jpg" alt="member" />
              <img className="ln-avatar-stack-img" src="/images/client2.jpg" alt="member" />
              <img className="ln-avatar-stack-img" src="/images/client3.jpg" alt="member" />
              {/* extra avatars using pravatar as placeholder for remaining members */}
              <img className="ln-avatar-stack-img" src="https://i.pravatar.cc/44?img=12" alt="member" />
              <img className="ln-avatar-stack-img" src="https://i.pravatar.cc/44?img=25" alt="member" />
              <div className="ln-avatar-more">+</div>
            </div>
            <div className="ln-member-count">500+</div>
            <div className="ln-member-label">Happy Members</div>
          </div>

          {/* ── Right: 3 review cards stacked ── */}
          <div className="ln-reviews-right">
            {(liveReviews.length > 0 ? liveReviews.slice(0, 3) : [
              { img: "/images/client1.jpg", fullname: "John D.",   rating: 5, text: "Joining Royal Fitness has been life-changing! The trainers are incredibly knowledgeable, and they truly care about your progress. I feel stronger, healthier, and more confident than ever." },
              { img: "/images/client2.jpg", fullname: "Joe M.",    rating: 5, text: "I signed up and saw a huge improvement in my fitness and mindset. The energy at the gym is next level — every session feels like a win!" },
              { img: "/images/client3.jpg", fullname: "Johnny K.", rating: 5, text: "Best gym I've ever joined. Friendly staff, modern equipment, and a community that actually motivates you to show up every single day." },
            ]).map((r, i) => (
              <div className="ln-review-card" key={i}>
                <div className="ln-review-top">
                  {(r.profilePhoto || r.img)
                    ? <img className="ln-review-avatar" src={r.profilePhoto || r.img} alt={r.fullname} />
                    : <div className="ln-review-avatar-initials">{r.fullname ? r.fullname[0].toUpperCase() : "U"}</div>}
                  <div className="ln-review-meta">
                    <div className="ln-review-name">{r.fullname}</div>
                    <div className="ln-review-stars">{"★".repeat(r.rating || 5)}</div>
                  </div>
                </div>
                <p className="ln-review-text">{r.text}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="ln-footer">
        <div className="ln-footer-logo">ROYAL FITNESS</div>
        <div className="ln-footer-socials">
          <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="ln-social-link">ig</a>
          <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" className="ln-social-link">fb</a>
          <a href="https://www.twitter.com/" target="_blank" rel="noreferrer" className="ln-social-link">tw</a>
        </div>
        <p className="ln-copyright">© Royal Fitness 2025 — All Rights Reserved</p>
      </footer>
    </>
  );
}