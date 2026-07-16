import React, { useEffect, useState, useRef } from "react";
import API from "../api";

export default function UserDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [user, setUser] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [hiredTrainer, setHiredTrainer] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [myReviews, setMyReviews]   = useState([]);
  const [selectedDiet, setSelectedDiet] = useState(null);
  const [activeDietPlan, setActiveDietPlan] = useState(
    () => localStorage.getItem("activeDietPlan") || null
  ); // persists across sessions
  const [trainers, setTrainers] = useState([]);

  // Profile state
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profileForm, setProfileForm] = useState({ fullname: "", email: "", phone: "", dob: "", gender: "", goal: "" });
  const [profileSaved, setProfileSaved] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    if (!localStorage.getItem("token")) { window.location.href = "/login"; return; }
    setUser(u.fullname || "User");
    setUserEmail(u.email || "");

    const fetchData = async () => {
      try {
        // Load profile from DB
        const meRes = await API.get("/api/auth/me");
        const me = meRes.data || {};
        setUser(me.fullname || u.fullname || "User");
        setUserEmail(me.email || u.email || "");
        setProfileForm({
          fullname: me.fullname || "",
          email:    me.email    || "",
          phone:    me.phone    || "",
          dob:      me.dob      || "",
          gender:   me.gender   || "",
          goal:     me.goal     || "",
        });
        if (me.profilePhoto) setProfilePhoto(me.profilePhoto);

        const paymentsRes = await API.get("/api/payments");
        const payments = paymentsRes.data || [];
        payments.sort((a, b) => new Date(b.date) - new Date(a.date));
        setPaymentHistory(payments);
        if (payments.length > 0) {
          const latest = payments[0];
          setUserPlan({
            plan: latest.plan,
            price: latest.price,
            date: formatSimpleDate(latest.date),
            expiryDate: formatSimpleDate(latest.expiry),
          });
          const diffTime = new Date(latest.expiry).getTime() - new Date().getTime();
          setDaysLeft(Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0));
        } else {
          setUserPlan(null);
          setDaysLeft(null);
        }
        const trainersRes = await API.get("/api/trainers");
        setTrainers(trainersRes.data || []);
        const hiredRes = await API.get("/api/trainers/hired/me");
        if (hiredRes.data) setHiredTrainer(hiredRes.data.trainer);

        const reviewsRes = await API.get("/api/reviews/my");
        setMyReviews(reviewsRes.data || []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  // ── handlers (all original logic) ──────────────────────────────────────────
  const logout = () => { localStorage.clear(); window.location.href = "/login"; };

  const handleHire = async (trainerId) => {
    try {
      await API.post("/api/trainers/hire", { trainerId });
      const hiredRes = await API.get("/api/trainers/hired/me");
      if (hiredRes.data) setHiredTrainer(hiredRes.data.trainer);
      alert("Trainer hired ✅");
    } catch (err) { console.error(err); alert("Hire failed"); }
  };

  const handleRenew = () => { window.location.href = "/#plans"; };

  const handleReviewSubmit = async () => {
    if (rating === 0 || reviewText.trim() === "") { alert("Provide rating and text"); return; }
    try {
      await API.post("/api/reviews", { rating, text: reviewText });
      setRating(0); setReviewText("");
      // Refresh my reviews list instantly after submit
      const reviewsRes = await API.get("/api/reviews/my");
      setMyReviews(reviewsRes.data || []);
      alert("Review submitted ✅");
    } catch (err) { console.error(err); alert("Review failed"); }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfilePhoto(ev.target.result);
      // Keep in localStorage as fast cache, saved to DB on next Save Profile click
      localStorage.setItem("userProfilePhoto", ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async () => {
    try {
      const res = await API.put("/api/auth/profile", {
        fullname:     profileForm.fullname,
        phone:        profileForm.phone,
        dob:          profileForm.dob,
        gender:       profileForm.gender,
        goal:         profileForm.goal,
        profilePhoto: profilePhoto || "",
      });
      // Update localStorage so topbar name stays in sync
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      stored.fullname = profileForm.fullname;
      stored.profilePhoto = profilePhoto || "";
      localStorage.setItem("user", JSON.stringify(stored));
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      console.error(err);
      alert("Failed to save profile. Please try again.");
    }
  };

  // ── date helpers ────────────────────────────────────────────────────────────
  function formatDateTimeForTable(dStr) {
    try {
      const d = new Date(dStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleString("en-US", { month: "short" });
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12; hours = hours ? hours : 12;
      return `${day} ${month} ${year}, ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
    } catch { return dStr; }
  }

  function formatSimpleDate(dStr) {
    try {
      const d = new Date(dStr);
      return `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;
    } catch { return dStr ? String(dStr).split("T")[0] : ""; }
  }

  // ── nav ─────────────────────────────────────────────────────────────────────
  const navItems = [
    { key: "overview", label: "Overview",  icon: "⬛" },
    { key: "plan",     label: "My Plan",   icon: "🏋" },
    { key: "trainer",  label: "Trainer",   icon: "👤" },
    { key: "diet",     label: "Diet",      icon: "🥗" },
    { key: "payments", label: "Payments",  icon: "💳" },
    { key: "review",   label: "Review",    icon: "⭐" },
    { key: "profile",  label: "Profile",   icon: "🪪" },
  ];

  const sectionLabel = navItems.find(n => n.key === activeSection)?.label || "Overview";
  const chooseActiveDiet = (key) => {
    setActiveDietPlan(key);
    localStorage.setItem("activeDietPlan", key);
  };

  // Diet plan display labels for the overview card
  const DIET_LABELS = {
    muscle: "💪 Muscle Gain",
    fat:    "🔥 Fat Loss",
    energy: "⚡ Energy Boost",
  };

  const initials = user ? user.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "U";

  // ── Diet plans data ──────────────────────────────────────────────────────────
  const DIET_PLANS = {
    muscle: {
      key:      "muscle",
      title:    "💪 Muscle Gain",
      theme:    "muscle",
      accent:   "#a3d959",
      tagline:  "Build lean mass with high-protein, nutrient-dense foods",
      categories: [
        {
          label: "🥩 Protein Sources",
          desc:  "Aim for 1.6–2.2g of protein per kg of body weight daily",
          foods: [
            { name:"Chicken Breast",    detail:"30g protein / 165 kcal per 100g — lean and versatile" },
            { name:"Eggs",              detail:"6g protein per egg — complete amino acid profile" },
            { name:"Paneer (Cottage Cheese)", detail:"18g protein per 100g — great vegetarian option" },
            { name:"Whey Protein",      detail:"25g protein per scoop — fast absorbing post-workout" },
            { name:"Greek Yoghurt",     detail:"10g protein per 100g — also good for gut health" },
            { name:"Lentils (Dal)",     detail:"9g protein per 100g cooked — affordable plant protein" },
          ],
        },
        {
          label: "🍚 Complex Carbohydrates",
          desc:  "Fuel your workouts and replenish muscle glycogen",
          foods: [
            { name:"Brown Rice",        detail:"45g carbs per 100g cooked — slow digesting, sustained energy" },
            { name:"Sweet Potato",      detail:"20g carbs, rich in potassium and Vitamin A" },
            { name:"Oats",              detail:"Great pre-workout meal with beta-glucan for endurance" },
            { name:"Whole Wheat Roti",  detail:"Better than white flour — more fibre and micronutrients" },
            { name:"Quinoa",            detail:"Complete protein + carb combo — 8g protein per 100g" },
            { name:"Banana",            detail:"Fast-digesting carbs — ideal 30 min before workout" },
          ],
        },
        {
          label: "🥑 Healthy Fats",
          desc:  "Support testosterone production and joint health",
          foods: [
            { name:"Almonds & Walnuts", detail:"Omega-3s and Vitamin E — handful per day is enough" },
            { name:"Avocado",           detail:"Monounsaturated fats — also high in potassium" },
            { name:"Ghee (in moderation)", detail:"Healthy saturated fat — good for cooking" },
            { name:"Flaxseeds",         detail:"Rich in omega-3 ALA — add to smoothies or yoghurt" },
            { name:"Olive Oil",         detail:"Extra virgin — anti-inflammatory properties" },
          ],
        },
        {
          label: "⏰ Meal Timing Tips",
          desc:  "When you eat matters almost as much as what you eat",
          foods: [
            { name:"Pre-workout (60 min before)",  detail:"Oats + banana + whey shake or eggs on toast" },
            { name:"Post-workout (within 45 min)", detail:"Whey protein + simple carbs like banana or rice" },
            { name:"Before bed",                   detail:"Slow casein protein — paneer or Greek yoghurt" },
            { name:"Eat every 3–4 hours",          detail:"Keeps muscle protein synthesis elevated all day" },
          ],
        },
      ],
    },
    fat: {
      key:      "fat",
      title:    "🔥 Fat Loss",
      theme:    "fat",
      accent:   "#e08a4a",
      tagline:  "Burn fat while preserving muscle with smart calorie management",
      categories: [
        {
          label: "🥗 Lean Proteins",
          desc:  "High protein keeps you full and prevents muscle loss during a cut",
          foods: [
            { name:"Chicken Breast / Tuna", detail:"Low fat, high protein — ideal for calorie deficit meals" },
            { name:"Egg Whites",            detail:"Pure protein with almost zero fat" },
            { name:"Low-fat Paneer",        detail:"Good protein without excess calories" },
            { name:"Moong Dal",             detail:"Easy to digest, filling, and low calorie" },
            { name:"Shrimp / Fish",         detail:"Very lean — high protein with omega-3 benefits" },
          ],
        },
        {
          label: "🥦 Low-Calorie Vegetables",
          desc:  "Fill your plate — these are almost calorie-free but nutrient-rich",
          foods: [
            { name:"Spinach & Kale",        detail:"High in iron, fibre — virtually zero calories" },
            { name:"Broccoli",              detail:"High volume, high fibre — keeps you full longer" },
            { name:"Cucumber & Celery",     detail:"Mostly water — great for snacking guilt-free" },
            { name:"Capsicum / Bell Pepper",detail:"High Vitamin C — boosts metabolism" },
            { name:"Mushrooms",             detail:"Low cal, meaty texture — good meal base" },
          ],
        },
        {
          label: "🚫 Foods to Limit",
          desc:  "Reducing these will accelerate your fat loss significantly",
          foods: [
            { name:"Refined Sugar",         detail:"Replace with fruit or stevia for sweetness" },
            { name:"White Bread / Maida",   detail:"Switch to whole wheat or oats" },
            { name:"Fried Foods",           detail:"Air fry or grill instead — saves 200–400 kcal" },
            { name:"Sugary Drinks / Juice", detail:"Liquid calories are easy to overdo — drink water" },
            { name:"Alcohol",               detail:"7 kcal per gram — slows fat burning for hours" },
          ],
        },
        {
          label: "💧 Hydration & Habits",
          desc:  "Simple habits that boost your fat loss significantly",
          foods: [
            { name:"Drink 3–4L water daily",  detail:"Boosts metabolism by up to 30% for 1–1.5 hours" },
            { name:"Green Tea (2–3 cups)",    detail:"EGCG catechins shown to increase fat oxidation" },
            { name:"Eat slowly, chew well",   detail:"Takes 20 min for brain to register fullness" },
            { name:"Don't skip breakfast",    detail:"Controls hunger hormones throughout the day" },
          ],
        },
      ],
    },
    energy: {
      key:      "energy",
      title:    "⚡ Energy Boost",
      theme:    "energy",
      accent:   "#6a9fd8",
      tagline:  "Fuel your body for peak performance and all-day vitality",
      categories: [
        {
          label: "🍇 Natural Energy Foods",
          desc:  "Sustained energy without the crash of caffeine or sugar",
          foods: [
            { name:"Banana",               detail:"Quick glucose + potassium — nature's energy bar" },
            { name:"Dates",                detail:"Natural sugars + iron — great pre-workout snack" },
            { name:"Oats with honey",      detail:"Slow-release carbs + natural sugars for sustained power" },
            { name:"Beetroot",             detail:"Increases blood flow and oxygen to muscles by ~16%" },
            { name:"Dark Chocolate (70%+)",detail:"Theobromine + caffeine — gentle energy lift" },
          ],
        },
        {
          label: "🥤 Smoothies & Drinks",
          desc:  "Easy to digest and absorb — great before or after training",
          foods: [
            { name:"Banana + Milk + Honey",       detail:"Classic pre-workout energy smoothie" },
            { name:"Spinach + Apple + Ginger",    detail:"Iron + natural sugar + anti-inflammatory boost" },
            { name:"Coconut Water",               detail:"Natural electrolytes — better than sports drinks" },
            { name:"Lemon + Honey + Warm Water",  detail:"Morning metabolism kick-start ritual" },
            { name:"Turmeric Golden Milk",        detail:"Anti-inflammatory — great for recovery nights" },
          ],
        },
        {
          label: "🌾 Balanced Meals",
          desc:  "Every meal should have all 3 macros for steady energy",
          foods: [
            { name:"Dal + Rice + Sabzi",     detail:"Complete Indian meal — protein + carb + micronutrients" },
            { name:"Roti + Egg Bhurji",      detail:"Great protein + carb combo for lunch or dinner" },
            { name:"Poha with peanuts",      detail:"Light, easy to digest — ideal morning meal" },
            { name:"Curd Rice",              detail:"Probiotic + carb — calming and energising" },
            { name:"Sprouts Salad",          detail:"Live food — packed with enzymes and micronutrients" },
          ],
        },
        {
          label: "😴 Recovery & Sleep",
          desc:  "Real energy comes from proper rest and recovery",
          foods: [
            { name:"Sleep 7–9 hours",             detail:"Growth hormone is released mainly during deep sleep" },
            { name:"Magnesium-rich foods",         detail:"Almonds, spinach, dark chocolate — improve sleep quality" },
            { name:"Avoid heavy meals after 9pm", detail:"Digestive work disrupts sleep quality" },
            { name:"Chamomile or Ashwagandha tea", detail:"Adaptogen — reduces cortisol and improves recovery" },
          ],
        },
      ],
    },
  };

  // ── reusable banners ────────────────────────────────────────────────────────
  const ExpiredBanner = () => (
    <div style={{
      background: "rgba(224,90,90,0.08)",
      border: "1px solid rgba(224,90,90,0.3)",
      borderRadius: 12,
      padding: "16px 20px",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    }}>
      <div>
        <div style={{ color: "#e05a5a", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1, marginBottom: 4 }}>
          ⚠ YOUR MEMBERSHIP HAS EXPIRED
        </div>
        <div style={{ color: "#888", fontSize: 13, fontWeight: 300 }}>
          Your {userPlan.plan} plan expired on {userPlan.expiryDate}. Renew now to restore full access.
        </div>
      </div>
      <button onClick={handleRenew} style={{
        padding: "10px 20px",
        background: "#a3d959",
        color: "#0a0a0a",
        border: "none",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "DM Sans, sans-serif",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}>
        Renew Now →
      </button>
    </div>
  );

  const NoPlanBanner = () => (
    <div style={{
      background: "rgba(163,217,89,0.05)",
      border: "1px solid rgba(163,217,89,0.15)",
      borderRadius: 12,
      padding: "16px 20px",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    }}>
      <div>
        <div style={{ color: "#a3d959", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1, marginBottom: 4 }}>
          NO ACTIVE MEMBERSHIP
        </div>
        <div style={{ color: "#888", fontSize: 13, fontWeight: 300 }}>
          You don't have an active plan yet. Browse plans to get started.
        </div>
      </div>
      <button onClick={handleRenew} style={{
        padding: "10px 20px",
        background: "#a3d959",
        color: "#0a0a0a",
        border: "none",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "DM Sans, sans-serif",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}>
        Browse Plans →
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ud-root { display: flex; min-height: 100vh; background: #0a0a0a; font-family: 'DM Sans', sans-serif; color: #f0ede8; }

        /* Sidebar */
        .ud-sidebar { width: 240px; flex-shrink: 0; background: #111; display: flex; flex-direction: column; padding: 28px 20px; position: fixed; top: 0; left: 0; bottom: 0; border-right: 1px solid #1a1a1a; z-index: 100; overflow-y: auto; }
        .ud-logo { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 3px; color: #a3d959; margin-bottom: 6px; }
        .ud-logo-sub { font-size: 11px; color: #333; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 32px; }
        .ud-nav { display: flex; flex-direction: column; gap: 3px; flex: 1; }
        .ud-nav-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; border: none; background: none; color: #555; font-size: 13px; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.2s; text-align: left; width: 100%; }
        .ud-nav-btn:hover { background: #1a1a1a; color: #888; }
        .ud-nav-btn.active { background: rgba(163,217,89,0.1); color: #a3d959; }
        .ud-nav-btn.active .ud-nav-dot { background: #a3d959; }
        .ud-nav-dot { width: 5px; height: 5px; border-radius: 50%; background: #2a2a2a; flex-shrink: 0; transition: background 0.2s; }
        .ud-nav-icon { font-size: 14px; flex-shrink: 0; }

        /* Sidebar footer */
        .ud-sidebar-footer { margin-top: 20px; padding-top: 18px; border-top: 1px solid #1a1a1a; }
        .ud-user-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; cursor: pointer; padding: 8px; border-radius: 8px; transition: background 0.2s; }
        .ud-user-row:hover { background: #1a1a1a; }
        .ud-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(163,217,89,0.12); border: 1.5px solid rgba(163,217,89,0.3); display: flex; align-items: center; justify-content: center; font-size: 13px; color: #a3d959; font-weight: 600; flex-shrink: 0; overflow: hidden; }
        .ud-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .ud-user-name { font-size: 13px; color: #888; font-weight: 500; line-height: 1.2; }
        .ud-user-email { font-size: 11px; color: #333; }
        .ud-logout-btn { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #1e1e1e; background: transparent; color: #e05a5a; font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; text-align: left; }
        .ud-logout-btn:hover { background: rgba(224,90,90,0.08); border-color: rgba(224,90,90,0.3); }

        /* Main */
        .ud-main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .ud-topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px; border-bottom: 1px solid #1a1a1a; background: #0a0a0a; position: sticky; top: 0; z-index: 10; }
        .ud-page-title { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 2px; color: #f0ede8; }
        .ud-topbar-right { display: flex; align-items: center; gap: 10px; }
        .ud-topbar-name { font-size: 13px; color: #a3d959; font-weight: 500; }
        .ud-content { padding: 24px 28px; flex: 1; }

        /* Stat cards */
        .ud-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
        .ud-stat-card { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.2s; }
        .ud-stat-card:hover { border-color: rgba(163,217,89,0.2); }
        .ud-stat-icon { font-size: 20px; }
        .ud-stat-label { font-size: 11px; color: #555; letter-spacing: 0.5px; }
        .ud-stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 1px; color: #a3d959; line-height: 1; }
        .ud-stat-value.small { font-size: 16px; letter-spacing: 0; }

        /* Generic card */
        .ud-card { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 22px; }
        .ud-card + .ud-card { margin-top: 16px; }
        .ud-card-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 2px; color: #f0ede8; margin-bottom: 18px; }
        .ud-muted { color: #555; font-size: 13px; }
        .ud-green { color: #a3d959; font-weight: 600; }
        .ud-red { color: #e05a5a; }
        .ud-badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 500; background: rgba(163,217,89,0.1); color: #a3d959; border: 1px solid rgba(163,217,89,0.2); }

        /* Plan card */
        .ud-plan-big { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 28px; }
        .ud-plan-name-big { font-family: 'Bebas Neue', sans-serif; font-size: 56px; letter-spacing: 3px; color: #a3d959; line-height: 1; margin-bottom: 6px; }
        .ud-plan-dates { font-size: 13px; color: #555; margin-bottom: 20px; }
        .ud-plan-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 14px; color: #888; }
        .ud-plan-row strong { color: #f0ede8; }
        .ud-renew-btn { padding: 11px 22px; background: #a3d959; color: #0a0a0a; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.2s; margin-top: 8px; }
        .ud-renew-btn:hover { background: #b8e870; }
        .ud-objectives { background: rgba(163,217,89,0.06); border: 1px solid rgba(163,217,89,0.15); border-radius: 12px; padding: 20px; margin-top: 16px; }
        .ud-objectives h3 { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 1.5px; color: #a3d959; margin-bottom: 14px; }
        .ud-objectives ul { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .ud-objectives li { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #888; font-weight: 300; }
        .ud-objectives li::before { content: '✓'; color: #a3d959; font-weight: 600; }

        /* Table */
        .ud-table-wrap { overflow-x: auto; }
        .ud-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 500px; font-size: 14px; }
        .ud-table thead tr { background: #0a0a0a; }
        .ud-table th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 500; letter-spacing: 1.2px; text-transform: uppercase; color: #555; border-bottom: 1px solid #1a1a1a; white-space: nowrap; }
        .ud-table td { padding: 13px 16px; border-bottom: 1px solid #141414; color: #888; vertical-align: middle; }
        .ud-table tbody tr:hover td { background: rgba(163,217,89,0.02); }
        .ud-table tbody tr:last-child td { border-bottom: none; }

        /* Trainer grid */
        .ud-trainer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
        .ud-trainer-card { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 22px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: border-color 0.2s; }
        .ud-trainer-card:hover { border-color: rgba(163,217,89,0.2); }
        .ud-trainer-avatar { width: 72px; height: 72px; border-radius: 50%; border: 2px solid rgba(163,217,89,0.3); object-fit: cover; margin-bottom: 4px; }
        .ud-trainer-name { font-size: 15px; font-weight: 500; color: #f0ede8; }
        .ud-trainer-spec { font-size: 12px; color: #555; }
        .ud-hire-btn { padding: 8px 18px; border-radius: 8px; border: 1px solid #222; background: transparent; color: #888; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; margin-top: 4px; }
        .ud-hire-btn:hover { background: #a3d959; border-color: #a3d959; color: #0a0a0a; }
        .ud-hire-btn.hired { background: rgba(163,217,89,0.1); border-color: rgba(163,217,89,0.3); color: #a3d959; cursor: default; }

        /* Diet cards */
        .ud-diet-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .ud-diet-card {
          border-radius: 12px; padding: 20px; border: 1px solid #1a1a1a;
          cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
        }
        .ud-diet-card::after {
          content: 'View diet plan →';
          position: absolute; bottom: 12px; right: 14px;
          font-size: 11px; color: #555; font-family: 'DM Sans', sans-serif;
          transition: color 0.2s;
        }
        .ud-diet-card:hover { transform: translateY(-3px); }
        .ud-diet-card:hover::after { color: #a3d959; }
        .ud-diet-card.muscle { background: rgba(163,217,89,0.06); border-color: rgba(163,217,89,0.15); }
        .ud-diet-card.muscle:hover { border-color: rgba(163,217,89,0.4); background: rgba(163,217,89,0.1); }
        .ud-diet-card.fat { background: rgba(224,130,90,0.06); border-color: rgba(224,130,90,0.15); }
        .ud-diet-card.fat:hover { border-color: rgba(224,130,90,0.4); background: rgba(224,130,90,0.1); }
        .ud-diet-card.fat::after { color: #555; }
        .ud-diet-card.fat:hover::after { color: #e08a4a; }
        .ud-diet-card.energy { background: rgba(90,150,224,0.06); border-color: rgba(90,150,224,0.15); }
        .ud-diet-card.energy:hover { border-color: rgba(90,150,224,0.4); background: rgba(90,150,224,0.1); }
        .ud-diet-card.energy::after { color: #555; }
        .ud-diet-card.energy:hover::after { color: #6a9fd8; }
        .ud-diet-title { font-size: 15px; font-weight: 500; color: #f0ede8; margin-bottom: 12px; }
        .ud-diet-items { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
        .ud-diet-item { font-size: 13px; color: #666; font-weight: 300; display: flex; align-items: center; gap: 8px; }
        .ud-diet-item::before { content: '→'; color: #a3d959; font-size: 11px; }
        /* Detail view */
        .ud-diet-detail { }
        .ud-diet-back {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 16px; background: transparent;
          border: 1px solid #222; border-radius: 8px;
          color: #888; font-size: 13px; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all 0.2s;
          margin-bottom: 20px;
        }
        .ud-diet-back:hover { border-color: #a3d959; color: #a3d959; }
        .ud-diet-hero {
          border-radius: 12px; padding: 24px 28px;
          margin-bottom: 20px;
          display: flex; align-items: center; gap: 20px;
        }
        .ud-diet-hero.muscle { background: rgba(163,217,89,0.08); border: 1px solid rgba(163,217,89,0.2); }
        .ud-diet-hero.fat    { background: rgba(224,130,90,0.08); border: 1px solid rgba(224,130,90,0.2); }
        .ud-diet-hero.energy { background: rgba(90,150,224,0.08); border: 1px solid rgba(90,150,224,0.2); }
        .ud-diet-hero-icon { font-size: 48px; flex-shrink: 0; line-height: 1; }
        .ud-diet-hero-title {
          font-family: "'Bebas Neue',sans-serif";
          font-size: 28px; letter-spacing: 2px; color: #f0ede8; margin-bottom: 6px;
        }
        .ud-diet-hero-tagline { font-size: 13px; color: #888; font-weight: 300; line-height: 1.6; }
        .ud-diet-cats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .ud-diet-cat {
          background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 18px;
        }
        .ud-diet-cat-label {
          font-size: 14px; font-weight: 500; color: #f0ede8; margin-bottom: 4px;
        }
        .ud-diet-cat-desc { font-size: 11px; color: #555; margin-bottom: 14px; line-height: 1.5; }
        .ud-diet-food {
          display: flex; flex-direction: column;
          padding: 9px 0; border-bottom: 1px solid #141414;
        }
        .ud-diet-food:last-child { border-bottom: none; padding-bottom: 0; }
        .ud-diet-food-name { font-size: 13px; color: #c8c5c0; font-weight: 500; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
        .ud-diet-food-name::before { content: '✓'; color: #a3d959; font-size: 11px; font-weight: 700; }
        .ud-diet-food-detail { font-size: 11px; color: #555; font-weight: 300; line-height: 1.5; padding-left: 16px; }

        /* Review */
        .ud-review-wrap { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 24px; max-width: 540px; }
        .ud-stars { display: flex; gap: 8px; margin-bottom: 18px; }
        .ud-star { font-size: 28px; cursor: pointer; transition: transform 0.1s; line-height: 1; }
        .ud-star:hover { transform: scale(1.15); }
        .ud-star.on { color: #a3d959; }
        .ud-star.off { color: #222; }
        .ud-textarea { width: 100%; min-height: 110px; background: #0f0f0f; border: 1px solid #1e1e1e; border-radius: 8px; padding: 12px 14px; font-size: 14px; color: #f0ede8; font-family: 'DM Sans', sans-serif; resize: vertical; outline: none; transition: border-color 0.2s; }
        .ud-textarea:focus { border-color: #a3d959; }
        .ud-textarea::placeholder { color: #333; }
        .ud-submit-btn { margin-top: 14px; padding: 11px 22px; background: #a3d959; color: #0a0a0a; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.2s; }
        .ud-submit-btn:hover { background: #b8e870; }

        /* Profile */
        /* My Reviews */
        .ud-my-reviews { display: flex; flex-direction: column; gap: 12px; }
        .ud-my-review-card { background: #0f0f0f; border: 1px solid #1a1a1a; border-radius: 10px; padding: 16px 18px; transition: border-color 0.2s; }
        .ud-my-review-card:hover { border-color: #2a2a2a; }
        .ud-my-review-card.featured { border-color: rgba(163,217,89,0.25); background: rgba(163,217,89,0.03); }
        .ud-my-review-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .ud-my-review-stars { color: #a3d959; font-size: 14px; letter-spacing: 2px; }
        .ud-my-review-date { font-size: 11px; color: #444; }
        .ud-my-review-text { font-size: 13px; color: #666; line-height: 1.65; font-weight: 300; font-style: italic; }
        .ud-my-review-text::before { content: '"'; }
        .ud-my-review-text::after  { content: '"'; }
        .ud-featured-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 100px; font-size: 10px; font-weight: 500; background: rgba(163,217,89,0.1); color: #a3d959; border: 1px solid rgba(163,217,89,0.25); }

        .ud-profile-wrap { display: grid; grid-template-columns: 200px 1fr; gap: 24px; align-items: start; }
        .ud-profile-photo-col { display: flex; flex-direction: column; align-items: center; gap: 14px; }
        .ud-profile-avatar-big { width: 120px; height: 120px; border-radius: 50%; border: 2px solid rgba(163,217,89,0.3); background: rgba(163,217,89,0.08); display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 40px; color: #a3d959; overflow: hidden; cursor: pointer; transition: border-color 0.2s; }
        .ud-profile-avatar-big:hover { border-color: #a3d959; }
        .ud-profile-avatar-big img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .ud-photo-hint { font-size: 11px; color: #444; text-align: center; }
        .ud-profile-form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ud-form-field { display: flex; flex-direction: column; gap: 6px; }
        .ud-form-label { font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: #555; font-weight: 500; }
        .ud-form-input, .ud-form-select { background: #0f0f0f; border: 1px solid #1e1e1e; border-radius: 8px; padding: 11px 14px; font-size: 14px; color: #f0ede8; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s; -webkit-appearance: none; }
        .ud-form-input:focus, .ud-form-select:focus { border-color: #a3d959; }
        .ud-form-input option, .ud-form-select option { background: #111; }
        .ud-save-btn { grid-column: 1 / -1; padding: 12px; background: #a3d959; color: #0a0a0a; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.2s; }
        .ud-save-btn:hover { background: #b8e870; }
        .ud-saved-msg { grid-column: 1 / -1; text-align: center; font-size: 13px; color: #a3d959; padding: 8px; background: rgba(163,217,89,0.08); border: 1px solid rgba(163,217,89,0.2); border-radius: 8px; }

        @media (max-width: 900px) {
          .ud-sidebar { display: none; }
          .ud-main { margin-left: 0; }
          .ud-stat-grid { grid-template-columns: 1fr 1fr; }
          .ud-diet-grid { grid-template-columns: 1fr; }
          .ud-diet-cats { grid-template-columns: 1fr; }
          .ud-profile-wrap { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="ud-root">

        {/* ── Sidebar ── */}
        <aside className="ud-sidebar">
          <div className="ud-logo">ROYAL FITNESS</div>
          <div className="ud-logo-sub">Member Panel</div>
          <nav className="ud-nav">
            {navItems.map(n => (
              <button key={n.key}
                className={`ud-nav-btn ${activeSection === n.key ? "active" : ""}`}
                onClick={() => { setActiveSection(n.key); setSelectedDiet(null); }}>
                <span className="ud-nav-dot" />
                <span className="ud-nav-icon">{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>
          <div className="ud-sidebar-footer">
            <div className="ud-user-row" onClick={() => setActiveSection("profile")}>
              <div className="ud-avatar">
                {profilePhoto ? <img src={profilePhoto} alt="avatar" /> : initials}
              </div>
              <div>
                <div className="ud-user-name">{user}</div>
                <div className="ud-user-email">{userEmail}</div>
              </div>
            </div>
            <button className="ud-logout-btn" onClick={logout}>← Sign Out</button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="ud-main">
          <div className="ud-topbar">
            <span className="ud-page-title">{sectionLabel}</span>
            <div className="ud-topbar-right">
              <span className="ud-topbar-name">Welcome, {user}</span>
              <div className="ud-avatar" style={{ cursor: "pointer" }} onClick={() => setActiveSection("profile")}>
                {profilePhoto ? <img src={profilePhoto} alt="avatar" /> : initials}
              </div>
            </div>
          </div>

          <div className="ud-content">

            {/* ── OVERVIEW ── */}
            {activeSection === "overview" && (
              <>
                {userPlan && daysLeft === 0 && <ExpiredBanner />}
                {!userPlan && <NoPlanBanner />}

                <div className="ud-stat-grid">
                  <div className="ud-stat-card">
                    <div className="ud-stat-icon">🏋</div>
                    <div className="ud-stat-label">Current Plan</div>
                    <div className={`ud-stat-value ${userPlan ? "" : "small"}`}>
                      {userPlan ? userPlan.plan : "No Plan"}
                    </div>
                  </div>
                  <div className="ud-stat-card">
                    <div className="ud-stat-icon">👤</div>
                    <div className="ud-stat-label">Personal Trainer</div>
                    <div className={`ud-stat-value ${hiredTrainer ? "" : "small"}`}>
                      {hiredTrainer ? hiredTrainer.name : "Not Hired"}
                    </div>
                  </div>
                  <div
                    className="ud-stat-card"
                    onClick={() => { setActiveSection("diet"); setSelectedDiet(null); }}
                    style={{ cursor:"pointer" }}
                    title="Go to Diet section"
                  >
                    <div className="ud-stat-icon">🥗</div>
                    <div className="ud-stat-label">Diet Plan</div>
                    <div className={`ud-stat-value ${activeDietPlan ? "" : "small"}`}>
                      {activeDietPlan
                        ? DIET_LABELS[activeDietPlan]
                        : "Not Set"}
                    </div>
                  </div>
                  <div className="ud-stat-card">
                    <div className="ud-stat-icon">⏳</div>
                    <div className="ud-stat-label">Plan Expiry</div>
                    <div className={`ud-stat-value ${userPlan ? "" : "small"}`}>
                      {userPlan ? `${daysLeft}d left` : "No Plan"}
                    </div>
                  </div>
                </div>

                <div className="ud-card">
                  <div className="ud-card-title">Expiry Date</div>
                  {userPlan
                    ? <p className="ud-green" style={{ fontSize: 15 }}>
                        Your {userPlan.plan} plan {daysLeft === 0 ? "expired on" : "expires on"} <strong>{userPlan.expiryDate}</strong>
                      </p>
                    : <p className="ud-muted">No active plan. <a href="/#plans" style={{ color: "#a3d959" }}>Browse plans →</a></p>}
                </div>
              </>
            )}

            {/* ── MY PLAN ── */}
            {activeSection === "plan" && (
              <>
                {userPlan && daysLeft === 0 && (
                  <div style={{
                    background: "rgba(224,90,90,0.08)",
                    border: "1px solid rgba(224,90,90,0.3)",
                    borderRadius: 12,
                    padding: "14px 18px",
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}>
                    <div style={{ color: "#e05a5a", fontSize: 14 }}>
                      ⚠ Your membership expired on {userPlan.expiryDate} — renew below to reactivate.
                    </div>
                    <button onClick={handleRenew} style={{
                      padding: "8px 16px", background: "#a3d959", color: "#0a0a0a",
                      border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500,
                      cursor: "pointer", fontFamily: "DM Sans, sans-serif", whiteSpace: "nowrap",
                    }}>
                      Renew Now →
                    </button>
                  </div>
                )}

                <div className="ud-plan-big">
                  {userPlan ? (
                    <>
                      <div className="ud-plan-name-big">{userPlan.plan}</div>
                      <div className="ud-plan-dates">{userPlan.date} → {userPlan.expiryDate}</div>
                      <div className="ud-plan-row"><strong>Price:</strong> ₹{userPlan.price}</div>
                      <div className="ud-plan-row">
                        <strong>Status:</strong>
                        {daysLeft === 0
                          ? <span className="ud-red">❌ Expired</span>
                          : <span className="ud-green">✅ Active ({daysLeft} days left)</span>}
                      </div>
                      <button className="ud-renew-btn" onClick={handleRenew}>
                        {daysLeft === 0 ? "Renew Plan →" : "Upgrade Plan →"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="ud-plan-name-big" style={{ color: "#333" }}>NO PLAN</div>
                      <div className="ud-plan-dates">You don't have an active membership.</div>
                      <button className="ud-renew-btn" onClick={handleRenew}>Browse Plans →</button>
                    </>
                  )}
                </div>

                {userPlan && (
                  <div className="ud-objectives">
                    <h3>🎯 PLAN OBJECTIVES</h3>
                    <ul>
                      {userPlan.plan === "Basic" && (<><li>2 Steam Sessions per week</li><li>Home Workout Access</li><li>Basic Diet Guidance</li></>)}
                      {userPlan.plan === "Pro" && (<><li>Unlimited Steam Sessions</li><li>Full Gym Access</li><li>Pro Diet & Trainer Support</li></>)}
                      {userPlan.plan === "Premium" && (<><li>VIP Gym Access</li><li>Elite Trainer Support</li><li>Premium Nutrition Plans</li><li>Massage & Spa Access</li></>)}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* ── TRAINER ── */}
            {activeSection === "trainer" && (
              <div className="ud-trainer-grid">
                {trainers.map(t => (
                  <div className="ud-trainer-card" key={t._id}>
                    {t.photo
                      ? <img className="ud-trainer-avatar" src={t.photo} alt={t.name} />
                      : <div className="ud-trainer-avatar" style={{ display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#a3d959", background:"rgba(163,217,89,0.08)" }}>
                          {(t.name||"T")[0].toUpperCase()}
                        </div>}
                    <div className="ud-trainer-name">{t.name}</div>
                    <div className="ud-trainer-spec">{t.specialty}</div>
                    <div className="ud-muted" style={{ fontSize: 12 }}>Exp: {t.experience}</div>
                    <div className="ud-muted" style={{ fontSize: 12 }}>⭐ {t.rating}</div>
                    {hiredTrainer && hiredTrainer._id === t._id
                      ? <button className="ud-hire-btn hired">Hired ✅</button>
                      : <button className="ud-hire-btn" onClick={() => handleHire(t._id)}>Hire Trainer</button>}
                  </div>
                ))}
              </div>
            )}

            {/* ── DIET ── */}
            {activeSection === "diet" && (
              <div className="ud-diet-detail">
                {!selectedDiet ? (
                  /* ── Diet card grid ── */
                  <>
                    <div style={{ marginBottom:20 }}>
                      <div className="ud-card-title" style={{ marginBottom:4 }}>Diet Plans</div>
                      <div className="ud-muted">Choose a goal to see your personalised diet guide</div>
                    </div>
                    <div className="ud-diet-grid">
                      {[
                        { key:"muscle", cls:"muscle", title:"💪 Muscle Gain",  items:["High protein diet","Complex carbs","Healthy fats"]   },
                        { key:"fat",    cls:"fat",    title:"🔥 Fat Loss",     items:["Calorie deficit","Lean protein","Green veggies"]      },
                        { key:"energy", cls:"energy", title:"⚡ Energy Boost", items:["Balanced meals","Fruits & smoothies","Hydration"]     },
                      ].map(d => {
                        const isActive = activeDietPlan === d.key;
                        return (
                          <div
                            key={d.key}
                            className={`ud-diet-card ${d.cls}`}
                            style={{ outline: isActive ? "2px solid #a3d959" : "none", outlineOffset:2 }}
                            onClick={() => setSelectedDiet(d.key)}
                          >
                            {/* Active badge */}
                            {isActive && (
                              <div style={{
                                position:"absolute", top:12, right:12,
                                background:"rgba(163,217,89,0.15)",
                                border:"1px solid rgba(163,217,89,0.4)",
                                borderRadius:100, padding:"2px 10px",
                                fontSize:10, fontWeight:600,
                                color:"#a3d959", letterSpacing:"0.5px",
                              }}>
                                ✦ MY PLAN
                              </div>
                            )}
                            <div className="ud-diet-title">{d.title}</div>
                            <div className="ud-diet-items">
                              {d.items.map(item => (
                                <div className="ud-diet-item" key={item}>{item}</div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* ── Diet detail view ── */
                  (() => {
                    const plan = DIET_PLANS[selectedDiet];
                    return (
                      <>
                        {/* Back button + Set as My Plan button */}
                        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                          <button className="ud-diet-back" style={{ marginBottom:0 }} onClick={() => setSelectedDiet(null)}>
                            ← Back
                          </button>
                          {activeDietPlan === plan.key ? (
                            <div style={{
                              display:"flex", alignItems:"center", gap:6,
                              padding:"8px 16px", borderRadius:8,
                              background:"rgba(163,217,89,0.1)",
                              border:"1px solid rgba(163,217,89,0.3)",
                              fontSize:13, color:"#a3d959", fontWeight:500,
                            }}>
                              ✦ This is your active diet plan
                            </div>
                          ) : (
                            <button
                              onClick={() => chooseActiveDiet(plan.key)}
                              style={{
                                padding:"8px 20px",
                                background:"#a3d959", color:"#0a0a0a",
                                border:"none", borderRadius:8,
                                fontSize:13, fontWeight:500,
                                cursor:"pointer", fontFamily:"DM Sans,sans-serif",
                                transition:"background 0.2s",
                              }}
                              onMouseEnter={e => e.currentTarget.style.background="#b8e870"}
                              onMouseLeave={e => e.currentTarget.style.background="#a3d959"}
                            >
                              ✓ Set as My Diet Plan
                            </button>
                          )}
                        </div>

                        {/* Hero banner */}
                        <div className={`ud-diet-hero ${plan.theme}`}>
                          <div className="ud-diet-hero-icon">{plan.title.split(" ")[0]}</div>
                          <div>
                            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, color:"#f0ede8", marginBottom:6 }}>
                              {plan.title.substring(2)}
                            </div>
                            <div style={{ fontSize:13, color:"#888", fontWeight:300, lineHeight:1.6 }}>
                              {plan.tagline}
                            </div>
                          </div>
                        </div>

                        {/* Category cards */}
                        <div className="ud-diet-cats">
                          {plan.categories.map((cat, ci) => (
                            <div className="ud-diet-cat" key={ci}>
                              <div className="ud-diet-cat-label">{cat.label}</div>
                              <div className="ud-diet-cat-desc">{cat.desc}</div>
                              {cat.foods.map((food, fi) => (
                                <div className="ud-diet-food" key={fi}>
                                  <div className="ud-diet-food-name">{food.name}</div>
                                  <div className="ud-diet-food-detail">{food.detail}</div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()
                )}
              </div>
            )}

            {/* ── PAYMENTS ── */}
            {activeSection === "payments" && (
              <div className="ud-card">
                <div className="ud-card-title">Payment History</div>
                <div className="ud-table-wrap">
                  <table className="ud-table">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Price</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.length === 0
                        ? <tr><td colSpan={3} className="ud-muted">No payments yet.</td></tr>
                        : paymentHistory.map((p, i) => (
                          <tr key={i}>
                            <td><span className="ud-badge">{p.plan}</span></td>
                            <td className="ud-green">₹{p.price}</td>
                            <td className="ud-muted">{formatDateTimeForTable(p.date)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── REVIEW ── */}
            {activeSection === "review" && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"start" }}>

                {/* ── LEFT: Write new review ── */}
                <div className="ud-review-wrap" style={{ maxWidth:"100%" }}>
                  <div className="ud-card-title" style={{ marginBottom:16 }}>Write a Review</div>
                  <div className="ud-stars">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s}
                        className={`ud-star ${s <= rating ? "on" : "off"}`}
                        onClick={() => setRating(s)}>★</span>
                    ))}
                  </div>
                  <textarea className="ud-textarea" value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    placeholder="Share your experience at Royal Fitness..." />
                  <button className="ud-submit-btn" onClick={handleReviewSubmit}>Submit Review →</button>
                </div>

                {/* ── RIGHT: Previous reviews ── */}
                <div>
                  <div className="ud-card-title" style={{ marginBottom:16 }}>
                    My Reviews
                    {myReviews.length > 0 && (
                      <span style={{ fontSize:12, color:"#555", fontFamily:"DM Sans,sans-serif", fontWeight:400, letterSpacing:0, marginLeft:10 }}>
                        {myReviews.length} review{myReviews.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {myReviews.length === 0 ? (
                    <div style={{ background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:10, padding:"24px 18px", textAlign:"center" }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>✍️</div>
                      <div style={{ fontSize:13, color:"#444" }}>You haven't written any reviews yet.</div>
                      <div style={{ fontSize:12, color:"#333", marginTop:4 }}>Submit your first review on the left!</div>
                    </div>
                  ) : (
                    <div className="ud-my-reviews">
                      {myReviews.map((r, i) => (
                        <div key={i} className={`ud-my-review-card ${r.featured ? "featured" : ""}`}>
                          <div className="ud-my-review-top">
                            <div className="ud-my-review-stars">
                              {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              {r.featured && (
                                <span className="ud-featured-tag">✦ On landing page</span>
                              )}
                              <span className="ud-my-review-date">
                                {new Date(r.date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                              </span>
                            </div>
                          </div>
                          <p className="ud-my-review-text">{r.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ── PROFILE ── */}
            {activeSection === "profile" && (
              <div className="ud-card">
                <div className="ud-card-title">My Profile</div>
                <div className="ud-profile-wrap">
                  <div className="ud-profile-photo-col">
                    <div className="ud-profile-avatar-big" onClick={() => fileInputRef.current.click()}>
                      {profilePhoto ? <img src={profilePhoto} alt="profile" /> : initials}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef}
                      style={{ display: "none" }} onChange={handlePhotoChange} />
                    <p className="ud-photo-hint">Click photo to upload</p>
                  </div>

                  <div className="ud-profile-form">
                    <div className="ud-form-field">
                      <label className="ud-form-label">Full Name</label>
                      <input className="ud-form-input" placeholder="Your full name"
                        value={profileForm.fullname}
                        onChange={e => setProfileForm(f => ({ ...f, fullname: e.target.value }))} />
                    </div>
                    <div className="ud-form-field">
                      <label className="ud-form-label">Email</label>
                      <input className="ud-form-input" placeholder="you@example.com" type="email"
                        value={profileForm.email}
                        onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div className="ud-form-field">
                      <label className="ud-form-label">Phone</label>
                      <input className="ud-form-input" placeholder="10-digit number" type="tel"
                        value={profileForm.phone}
                        onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="ud-form-field">
                      <label className="ud-form-label">Date of Birth</label>
                      <input className="ud-form-input" type="date"
                        value={profileForm.dob}
                        onChange={e => setProfileForm(f => ({ ...f, dob: e.target.value }))} />
                    </div>
                    <div className="ud-form-field">
                      <label className="ud-form-label">Gender</label>
                      <select className="ud-form-select"
                        value={profileForm.gender}
                        onChange={e => setProfileForm(f => ({ ...f, gender: e.target.value }))}>
                        <option value="">Select gender</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Non-binary</option>
                        <option>Prefer not to say</option>
                      </select>
                    </div>
                    <div className="ud-form-field">
                      <label className="ud-form-label">Fitness Goal</label>
                      <select className="ud-form-select"
                        value={profileForm.goal}
                        onChange={e => setProfileForm(f => ({ ...f, goal: e.target.value }))}>
                        <option value="">Select goal</option>
                        <option>Weight Loss</option>
                        <option>Muscle Gain</option>
                        <option>Endurance</option>
                        <option>Flexibility</option>
                        <option>General Fitness</option>
                      </select>
                    </div>
                    <div className="ud-form-field">
                      <label className="ud-form-label">Current Plan</label>
                      <input className="ud-form-input" readOnly
                        value={userPlan
                          ? `${userPlan.plan} — ${daysLeft === 0 ? "expired" : "expires"} ${userPlan.expiryDate}`
                          : "No active plan"}
                        style={{ color: "#a3d959", cursor: "default" }} />
                    </div>
                    <div className="ud-form-field">
                      <label className="ud-form-label">Personal Trainer</label>
                      <input className="ud-form-input" readOnly
                        value={hiredTrainer ? hiredTrainer.name : "No trainer hired"}
                        style={{ color: "#a3d959", cursor: "default" }} />
                    </div>
                    <button className="ud-save-btn" onClick={handleProfileSave}>Save Profile →</button>
                    {profileSaved && <div className="ud-saved-msg">✅ Profile saved successfully!</div>}
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}