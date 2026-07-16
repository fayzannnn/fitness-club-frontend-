// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx"; // npm install xlsx
import API from "../api";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState("");
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [trainerHires, setTrainerHires] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [allTrainers, setAllTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [selectedMember,  setSelectedMember]  = useState(null);  // full member profile
  const [memberLoading,   setMemberLoading]   = useState(false);
  const [showAddModal, setShowAddModal]           = useState(false);
  const [addLoading, setAddLoading]               = useState(false);
  const [trainerForm, setTrainerForm]             = useState({ name:"", specialty:"", experience:"", rating:"", bio:"", photo:"" });
  const [trainerFormErrors, setTrainerFormErrors] = useState({});

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    if (!localStorage.getItem("token")) { window.location.href = "/login"; return; }
    setUser(u.fullname || "Admin");
    fetchAll();
    // eslint-disable-next-line
  }, []);

  // ── ALL ORIGINAL LOGIC UNCHANGED ────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      const paymentsRes = await API.get("/api/payments");
      const paymentsData = paymentsRes.data || [];
      paymentsData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setPayments(paymentsData);

      const map = {};
      paymentsData.forEach((p) => {
        if (!p.email) return;
        const existing = map[p.email];
        if (!existing || new Date(p.date) > new Date(existing.date)) map[p.email] = p;
      });
      const membersArr = Object.values(map).map((m) => {
        const expiryDate = m.expiry ? new Date(m.expiry) : null;
        const diff = expiryDate !== null
          ? Math.max(Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0)
          : null;
        // Fetch profilePhoto from user populate if available
        const photoSrc = m.user && m.user.profilePhoto ? m.user.profilePhoto : (m.profilePhoto || "");
        // monthLabel used for grouping — e.g. "May 2026"
        const joinDate = m.date ? new Date(m.date) : null;
        const monthLabel = joinDate
          ? joinDate.toLocaleString("en-US", { month: "long", year: "numeric" })
          : "Unknown";
        const monthKey = joinDate
          ? joinDate.getFullYear() * 100 + (joinDate.getMonth() + 1) // e.g. 202605
          : 0;
        return { name: m.name, email: m.email, plan: m.plan, price: m.price, expiry: m.expiry, expiryLabel: expiryDate ? formatSimpleDate(m.expiry) : "—", daysLeft: diff, profilePhoto: photoSrc, monthLabel, monthKey };
      });
      setMembers(membersArr);

      const bookingsRes = await API.get("/api/bookings");
      setBookings(bookingsRes.data || []);
      const hiresRes = await API.get("/api/trainers/hires");
      setTrainerHires(hiresRes.data || []);
      const trainersListRes = await API.get("/api/trainers");
      setAllTrainers(trainersListRes.data || []);
      const reviewsRes = await API.get("/api/reviews");
      setReviews(reviewsRes.data || []);
      const statsRes = await API.get("/api/admin/stats");
      setStats(statsRes.data || []);
    } catch (err) { console.error(err); }
  };

  const logout = () => { localStorage.clear(); window.location.href = "/login"; };

  // ── Add new trainer ───────────────────────────────────────────────────────
  const handleAddTrainer = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!trainerForm.name.trim())       errs.name       = "Name is required";
    if (!trainerForm.specialty.trim())  errs.specialty  = "Specialty is required";
    if (!trainerForm.experience.trim()) errs.experience = "Experience is required";
    if (!trainerForm.rating)            errs.rating     = "Rating is required";
    else if (Number(trainerForm.rating) < 1 || Number(trainerForm.rating) > 5)
                                        errs.rating     = "Rating must be 1–5";
    if (Object.keys(errs).length) { setTrainerFormErrors(errs); return; }
    setAddLoading(true);
    try {
      await API.post("/api/trainers", {
        name:       trainerForm.name.trim(),
        specialty:  trainerForm.specialty.trim(),
        experience: trainerForm.experience.trim(),
        rating:     Number(trainerForm.rating),
        bio:        trainerForm.bio.trim(),
        photo:      trainerForm.photo,
      });
      const res = await API.get("/api/trainers");
      setAllTrainers(res.data || []);
      setShowAddModal(false);
      setTrainerForm({ name:"", specialty:"", experience:"", rating:"", bio:"", photo:"" });
      setTrainerFormErrors({});
    } catch (err) {
      console.error(err);
      setTrainerFormErrors({ submit: err?.response?.data?.message || "Failed to add trainer" });
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteTrainer = async (trainerId, trainerName) => {
    if (!window.confirm("Remove " + trainerName + " from the club? This cannot be undone.")) return;
    try {
      await API.delete("/api/trainers/" + trainerId);
      setAllTrainers(prev => prev.filter(t => t._id !== trainerId));
      if (selectedTrainer && selectedTrainer._id === trainerId) setSelectedTrainer(null);
    } catch (err) {
      alert((err && err.response && err.response.data && err.response.data.message) || "Failed to remove trainer");
    }
  };

  const handleTrainerPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const canvas = document.createElement("canvas");
    const img    = new Image();
    const url    = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 300;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      setTrainerForm(f => ({ ...f, photo: canvas.toDataURL("image/jpeg", 0.75) }));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // ── Fetch full member profile when admin clicks a member row ────────────────
  const fetchMemberProfile = async (email) => {
    setMemberLoading(true);
    try {
      const res = await API.get("/api/admin/member/" + encodeURIComponent(email));
      setSelectedMember(res.data);
    } catch (err) {
      alert("Could not load member profile");
    } finally {
      setMemberLoading(false);
    }
  };

  // ── Excel Export Utility ────────────────────────────────────────────────────
  const exportToExcel = (rows, filename, sheetName = "Data") => {
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] || "").length)) + 2
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename + "_" + new Date().toISOString().split("T")[0] + ".xlsx");
  };

  const exportMembers = () => {
    if (!members.length) return alert("No member data to export");
    const rows = members.map((m, i) => ({
      "S.No":          i + 1,
      "Full Name":     m.name    || "",
      "Email":         m.email   || "",
      "Plan":          m.plan    || "",
      "Price (₹)":     m.price   || 0,
      "Expiry Date":   m.expiryLabel || "",
      "Days Left":     m.daysLeft !== null ? m.daysLeft : "—",
      "Status":        m.daysLeft !== null && m.daysLeft > 0 ? "Active" : "Expired",
    }));
    exportToExcel(rows, "Royal_Fitness_Members", "Members");
  };

  const exportPayments = () => {
    if (!payments.length) return alert("No payment data to export");
    const rows = payments.map((p, i) => ({
      "S.No":       i + 1,
      "Member Name":p.name  || "",
      "Email":      p.email || "",
      "Plan":       p.plan  || "",
      "Price (₹)":  p.price || 0,
      "Payment Date": formatDateTimeForTable(p.date),
    }));
    exportToExcel(rows, "Royal_Fitness_Payments", "Payments");
  };

  const exportClasses = () => {
    if (!bookings.length) return alert("No bookings data to export");
    const rows = bookings.map((b, i) => ({
      "S.No":     i + 1,
      "Name":     b.name    || "",
      "Contact":  b.contact || "",
      "Address":  b.address || "",
      "Service":  b.service || "",
      "Date":     formatDateTimeForTable(b.date),
    }));
    exportToExcel(rows, "Royal_Fitness_Classes", "Classes");
  };

  const exportTrainers = () => {
    if (!trainerHires.length) return alert("No trainer hire data to export");
    const rows = trainerHires.map((h, i) => ({
      "S.No":       i + 1,
      "Member Name":h.user?.fullname     || "",
      "Email":      h.user?.email        || "",
      "Trainer":    h.trainer?.name      || "",
      "Specialty":  h.trainer?.specialty || "",
      "Date Hired": formatDateTimeForTable(h.date),
    }));
    exportToExcel(rows, "Royal_Fitness_TrainerHires", "Trainer Hires");
  };

  const exportReviews = () => {
    if (!reviews.length) return alert("No review data to export");
    const rows = reviews.map((r, i) => ({
      "S.No":       i + 1,
      "Member":     r.fullname || "",
      "Rating":     r.rating || 0,
      "Review":     r.text || "",
      "Featured":   r.featured ? "Yes" : "No",
      "Date":       formatDateTimeForTable(r.date),
    }));
    exportToExcel(rows, "Royal_Fitness_Reviews", "Reviews");
  };

  const exportAll = () => {
    if (!members.length && !payments.length) return alert("No data to export");
    const wb = XLSX.utils.book_new();

    // Members sheet
    if (members.length) {
      const rows = members.map((m, i) => ({
        "S.No": i+1, "Name": m.name, "Email": m.email,
        "Plan": m.plan, "Price": m.price, "Expiry": m.expiryLabel,
        "Status": m.daysLeft > 0 ? "Active" : "Expired",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Members");
    }
    // Payments sheet
    if (payments.length) {
      const rows = payments.map((p, i) => ({
        "S.No": i+1, "Name": p.name, "Email": p.email,
        "Plan": p.plan, "Price": p.price, "Date": formatDateTimeForTable(p.date),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Payments");
    }
    // Bookings sheet
    if (bookings.length) {
      const rows = bookings.map((b, i) => ({
        "S.No": i+1, "Name": b.name, "Contact": b.contact,
        "Service": b.service, "Date": formatDateTimeForTable(b.date),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Classes");
    }
    // Trainer hires sheet
    if (trainerHires.length) {
      const rows = trainerHires.map((h, i) => ({
        "S.No": i+1, "Member": h.user?.fullname, "Trainer": h.trainer?.name,
        "Specialty": h.trainer?.specialty, "Date": formatDateTimeForTable(h.date),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Trainer Hires");
    }
    // Reviews sheet
    if (reviews.length) {
      const rows = reviews.map((r, i) => ({
        "S.No": i+1, "Member": r.fullname, "Rating": r.rating,
        "Review": r.text, "Featured": r.featured ? "Yes" : "No",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Reviews");
    }

    XLSX.writeFile(wb, "Royal_Fitness_Full_Report_" + new Date().toISOString().split("T")[0] + ".xlsx");
  };

  // ── Toggle featured on landing page (max 3 allowed) ──────────────────────
  const toggleFeature = async (id) => {
    try {
      const featuredCount = reviews.filter(r => r.featured).length;
      const thisReview = reviews.find(r => r._id === id);
      // Block if already 3 featured and trying to add a new one
      if (!thisReview.featured && featuredCount >= 3) {
        alert("You can only feature up to 3 reviews on the landing page.\nUnfeature one first to add another.");
        return;
      }
      const res = await API.patch(`/api/reviews/${id}/feature`);
      setReviews(prev => prev.map(r => r._id === id ? res.data.review : r));
    } catch (err) {
      console.error(err);
      alert("Failed to update review");
    }
  };

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
      return `${day} ${month} ${year}, ${String(hours).padStart(2,"0")}:${minutes} ${ampm}`;
    } catch { return dStr; }
  }
  function formatSimpleDate(dStr) {
    try {
      const d = new Date(dStr);
      return `${String(d.getDate()).padStart(2,"0")} ${d.toLocaleString("en-US",{month:"short"})} ${d.getFullYear()}`;
    } catch { return dStr ? String(dStr).split("T")[0] : ""; }
  }

  const totalRevenue = payments.reduce((s, p) => s + (Number(p.price) || 0), 0);

  // Unique trainers actually hired (not total hire records)
  const uniqueTrainerCount = new Set(
    trainerHires.map(h => h.trainer?._id || h.trainer).filter(Boolean)
  ).size;

  // ── Search filter — applied per section based on relevant fields ───────────
  const q = searchQuery.toLowerCase().trim();

  const filteredMembers = q
    ? members.filter(m =>
        (m.name   || "").toLowerCase().includes(q) ||
        (m.email  || "").toLowerCase().includes(q) ||
        (m.plan   || "").toLowerCase().includes(q))
    : members;

  const filteredPayments = q
    ? payments.filter(p =>
        (p.name  || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.plan  || "").toLowerCase().includes(q) ||
        String(p.price || "").includes(q))
    : payments;

  const filteredBookings = q
    ? bookings.filter(b =>
        (b.name    || "").toLowerCase().includes(q) ||
        (b.contact || "").toLowerCase().includes(q) ||
        (b.address || "").toLowerCase().includes(q) ||
        (b.service || "").toLowerCase().includes(q))
    : bookings;

  const filteredHires = q
    ? trainerHires.filter(h =>
        (h.user?.fullname    || "").toLowerCase().includes(q) ||
        (h.trainer?.name     || "").toLowerCase().includes(q) ||
        (h.trainer?.specialty|| "").toLowerCase().includes(q))
    : trainerHires;

  const filteredReviews = q
    ? reviews.filter(r =>
        (r.fullname || "").toLowerCase().includes(q) ||
        (r.text     || "").toLowerCase().includes(q))
    : reviews;

  // ── NAV ITEMS ────────────────────────────────────────────────────────────────
  const navItems = [
    { key: "dashboard", label: "Dashboard",  icon: "⬛" },
    { key: "members",   label: "Members",    icon: "👥" },
    { key: "trainers",  label: "Trainers",   icon: "🏋" },
    { key: "classes",   label: "Classes",    icon: "📅" },
    { key: "payments",  label: "Payments",   icon: "💳" },
    { key: "reviews",   label: "Reviews",    icon: "⭐" },
    { key: "reports",   label: "Reports",    icon: "📊" },
  ];

  // ── RENDER SECTION — all original logic, new CSS classes only ───────────────
  const renderSection = () => {
    switch (activeSection) {
      case "members":
        // ── Member profile detail view ──────────────────────────────────────
        if (selectedMember) {
          const mu = selectedMember.user;
          const mp = selectedMember.payments || [];
          const mt = selectedMember.hiredTrainer;
          const mr = selectedMember.reviews   || [];
          const totalSpent = mp.reduce((s, p) => s + (Number(p.price) || 0), 0);
          const latestPayment = mp[0];
          const expiryDate = latestPayment?.expiry ? new Date(latestPayment.expiry) : null;
          const dLeft = expiryDate
            ? Math.max(Math.ceil((expiryDate - new Date()) / (1000*60*60*24)), 0)
            : null;

          return (
            <div>
              {/* Back */}
              <button
                onClick={() => setSelectedMember(null)}
                style={{ marginBottom:22, padding:"8px 16px", background:"transparent", border:"1px solid #222", borderRadius:8, color:"#888", fontSize:13, cursor:"pointer", fontFamily:"DM Sans,sans-serif", transition:"all 0.2s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#a3d959";e.currentTarget.style.color="#a3d959";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#222";e.currentTarget.style.color="#888";}}
              >← Back to Members</button>

              {/* Profile hero */}
              <div style={{ background:"#111", border:"1px solid rgba(163,217,89,0.2)", borderRadius:14, padding:28, marginBottom:20, display:"flex", alignItems:"center", gap:28 }}>
                {/* Avatar */}
                {mu.profilePhoto
                  ? <img src={mu.profilePhoto} alt={mu.fullname} style={{ width:96, height:96, borderRadius:"50%", objectFit:"cover", border:"3px solid rgba(163,217,89,0.4)", flexShrink:0 }} />
                  : <div style={{ width:96, height:96, borderRadius:"50%", background:"rgba(163,217,89,0.1)", border:"3px solid rgba(163,217,89,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:38, color:"#a3d959", flexShrink:0 }}>
                      {(mu.fullname||"U")[0].toUpperCase()}
                    </div>}

                {/* Name + role + status */}
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, letterSpacing:2, color:"#f0ede8", marginBottom:4 }}>{mu.fullname}</div>
                  <div style={{ fontSize:13, color:"#555", marginBottom:12 }}>{mu.email}</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                    <span className="ad-badge">{latestPayment?.plan || "No plan"}</span>
                    {dLeft !== null && (
                      <span style={{ padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:500,
                        background: dLeft > 0 ? "rgba(163,217,89,0.08)" : "rgba(224,90,90,0.08)",
                        color:      dLeft > 0 ? "#a3d959"                : "#e05a5a",
                        border:     dLeft > 0 ? "1px solid rgba(163,217,89,0.2)" : "1px solid rgba(224,90,90,0.2)",
                      }}>
                        {dLeft > 0 ? `${dLeft} days left` : "Expired"}
                      </span>
                    )}
                    <span style={{ padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:500, background:"rgba(255,255,255,0.04)", color:"#555", border:"1px solid #1e1e1e" }}>
                      Member since {formatSimpleDate(mu.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Quick stats */}
                <div style={{ display:"flex", gap:20, flexShrink:0 }}>
                  {[
                    { label:"Payments", value: mp.length },
                    { label:"Total Spent", value: "₹" + totalSpent.toLocaleString("en-IN") },
                    { label:"Reviews", value: mr.length },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign:"center", minWidth:72 }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:"#a3d959", letterSpacing:1 }}>{s.value}</div>
                      <div style={{ fontSize:11, color:"#555" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profile details grid */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>

                {/* Personal details card */}
                <div className="ad-card">
                  <h3 className="ad-card-title" style={{ fontSize:16, marginBottom:16 }}>PERSONAL DETAILS</h3>
                  {[
                    { label:"Phone",        value: mu.phone    || "—" },
                    { label:"Date of Birth",value: mu.dob      || "—" },
                    { label:"Gender",       value: mu.gender   || "—" },
                    { label:"Fitness Goal", value: mu.goal     || "—" },
                    { label:"Account Role", value: mu.role     || "user" },
                  ].map(row => (
                    <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #141414" }}>
                      <span style={{ fontSize:12, color:"#555", letterSpacing:"0.5px" }}>{row.label}</span>
                      <span style={{ fontSize:13, color:"#c8c5c0" }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Membership + Trainer card */}
                <div className="ad-card">
                  <h3 className="ad-card-title" style={{ fontSize:16, marginBottom:16 }}>MEMBERSHIP & TRAINER</h3>
                  {[
                    { label:"Current Plan",    value: latestPayment?.plan      || "No plan"   },
                    { label:"Plan Price",      value: latestPayment ? "₹" + latestPayment.price : "—" },
                    { label:"Start Date",      value: latestPayment ? formatSimpleDate(latestPayment.date) : "—" },
                    { label:"Expiry Date",     value: latestPayment ? formatSimpleDate(latestPayment.expiry) : "—" },
                    { label:"Personal Trainer",value: mt ? mt.name + " (" + mt.specialty + ")" : "Not hired" },
                  ].map(row => (
                    <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #141414" }}>
                      <span style={{ fontSize:12, color:"#555", letterSpacing:"0.5px" }}>{row.label}</span>
                      <span style={{ fontSize:13, color:"#c8c5c0" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment history */}
              {mp.length > 0 && (
                <div className="ad-card" style={{ marginBottom:16 }}>
                  <h3 className="ad-card-title" style={{ fontSize:16, marginBottom:16 }}>PAYMENT HISTORY</h3>
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <thead><tr><th>#</th><th>Plan</th><th>Price</th><th>Payment Type</th><th>Date</th><th>Expiry</th></tr></thead>
                      <tbody>
                        {mp.map((p, i) => {
                          const isCash   = p.providerId === "CASH";
                          const isOnline = p.providerId && p.providerId !== "CASH";
                          return (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td><span className="ad-badge">{p.plan}</span></td>
                              <td className="ad-green">₹{p.price}</td>
                              <td>
                                <span style={{
                                  display:"inline-flex", alignItems:"center", gap:5,
                                  padding:"3px 10px", borderRadius:100,
                                  fontSize:11, fontWeight:500,
                                  background: isCash ? "rgba(224,180,90,0.1)" : isOnline ? "rgba(90,150,224,0.1)" : "rgba(255,255,255,0.04)",
                                  color:      isCash ? "#e0b45a"              : isOnline ? "#6a9fd8"              : "#555",
                                  border:     isCash ? "1px solid rgba(224,180,90,0.3)" : isOnline ? "1px solid rgba(90,150,224,0.3)" : "1px solid #1e1e1e",
                                }}>
                                  {isCash ? "💵 Cash" : isOnline ? "💳 Online" : "—"}
                                </span>
                              </td>
                              <td className="ad-muted">{formatSimpleDate(p.date)}</td>
                              <td className="ad-muted">{formatSimpleDate(p.expiry)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Reviews by this member */}
              {mr.length > 0 && (
                <div className="ad-card">
                  <h3 className="ad-card-title" style={{ fontSize:16, marginBottom:16 }}>REVIEWS ({mr.length})</h3>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {mr.map((r, i) => (
                      <div key={i} style={{ background:"#0f0f0f", border: r.featured ? "1px solid rgba(163,217,89,0.25)" : "1px solid #1a1a1a", borderRadius:10, padding:"14px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                          <div style={{ color:"#a3d959", fontSize:14, letterSpacing:2 }}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            {r.featured && <span className="ad-badge" style={{ fontSize:10 }}>✦ Featured</span>}
                            <span style={{ fontSize:11, color:"#444" }}>{formatSimpleDate(r.date)}</span>
                          </div>
                        </div>
                        <p style={{ fontSize:13, color:"#666", lineHeight:1.6, fontStyle:"italic" }}>"{r.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }

        // ── Members grouped by month (default) ──────────────────────────────────
        // Group filteredMembers by monthLabel, sorted newest month first
        const monthGroups = (() => {
          const grouped = {};
          filteredMembers.forEach(m => {
            const key = m.monthLabel || "Unknown";
            if (!grouped[key]) grouped[key] = { label: key, monthKey: m.monthKey || 0, members: [] };
            grouped[key].members.push(m);
          });
          // Sort groups newest first by monthKey (e.g. 202605 > 202604)
          return Object.values(grouped).sort((a, b) => b.monthKey - a.monthKey);
        })();

        return (
          <div>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div>
                <h2 className="ad-section-title" style={{ marginBottom:2 }}>Registered Members</h2>
                <span style={{ fontSize:12, color:"#555" }}>
                  Grouped by month — {members.length} total · Click any row to view full profile
                </span>
              </div>
              <button onClick={exportMembers} style={{padding:"8px 16px",background:"transparent",border:"1px solid rgba(163,217,89,0.4)",borderRadius:8,color:"#a3d959",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"DM Sans,sans-serif",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(163,217,89,0.1)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                ⬇ Export Excel
              </button>
            </div>

            {memberLoading && <p className="ad-empty" style={{ marginBottom:16 }}>Loading profile...</p>}

            {members.length === 0 ? (
              <div className="ad-card"><p className="ad-empty">No members yet.</p></div>
            ) : filteredMembers.length === 0 ? (
              <div className="ad-card">
                <div className="ad-empty" style={{display:"flex",alignItems:"center",gap:8}}>
                  <span>No members match</span>
                  <strong style={{color:"#a3d959"}}>"{searchQuery}"</strong>
                  <button onClick={()=>setSearchQuery("")} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:12,textDecoration:"underline"}}>clear</button>
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {monthGroups.map((group) => (
                  <div key={group.label}>
                    {/* Month header */}
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                      <div style={{
                        fontFamily:"'Bebas Neue',sans-serif", fontSize:15,
                        letterSpacing:2, color:"#a3d959",
                        padding:"4px 14px", borderRadius:100,
                        background:"rgba(163,217,89,0.08)",
                        border:"1px solid rgba(163,217,89,0.2)",
                      }}>
                        {group.label}
                      </div>
                      <span style={{ fontSize:12, color:"#444" }}>
                        {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                      </span>
                      <div style={{ flex:1, height:1, background:"#1a1a1a" }} />
                    </div>

                    {/* Members table for this month */}
                    <div className="ad-card" style={{ padding:0, overflow:"hidden" }}>
                      <div className="ad-table-wrap">
                        <table className="ad-table">
                          <thead><tr>
                            <th>#</th><th>Name</th><th>Email</th><th>Plan</th><th>Price</th><th>Expiry</th>
                          </tr></thead>
                          <tbody>
                            {group.members.map((m, i) => (
                              <tr key={m.email}
                                onClick={() => fetchMemberProfile(m.email)}
                                style={{ cursor:"pointer" }}
                                className="ad-member-row"
                              >
                                <td style={{ color:"#444", fontSize:12 }}>{i + 1}</td>
                                <td>
                                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                                    {m.profilePhoto
                                      ? <img src={m.profilePhoto} alt={m.name} style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",border:"1px solid rgba(163,217,89,0.3)",flexShrink:0}} />
                                      : <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(163,217,89,0.1)",border:"1px solid rgba(163,217,89,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#a3d959",fontWeight:600,flexShrink:0}}>{m.name?m.name[0].toUpperCase():"U"}</div>}
                                    <span style={{ fontWeight:500, color:"#f0ede8" }}>{m.name}</span>
                                  </div>
                                </td>
                                <td className="ad-muted">{m.email}</td>
                                <td><span className="ad-badge">{m.plan}</span></td>
                                <td className="ad-green">₹{m.price}</td>
                                <td>
                                  <div style={{ fontSize:13, color:"#888" }}>{m.expiryLabel}</div>
                                  <div className={m.daysLeft !== null && m.daysLeft <= 0 ? "ad-red ad-small" : "ad-green ad-small"}>
                                    {m.daysLeft === null ? "—" : `${m.daysLeft} days left`}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "trainers": {
        // Build a map: trainerId -> { trainer info + list of hired users }
        const trainerMap = {};
        // Seed with all trainers so even un-hired trainers appear
        allTrainers.forEach(t => {
          trainerMap[t._id] = {
            _id:        t._id,
            name:       t.name,
            specialty:  t.specialty,
            experience: t.experience,
            rating:     t.rating,
            hires:      [],
          };
        });
        // Attach hire records
        trainerHires.forEach(h => {
          const tid = h.trainer?._id;
          if (!tid) return;
          if (!trainerMap[tid]) {
            trainerMap[tid] = {
              _id:        tid,
              name:       h.trainer?.name       || "Unknown",
              specialty:  h.trainer?.specialty  || "—",
              experience: h.trainer?.experience || "—",
              rating:     h.trainer?.rating     || "—",
              hires:      [],
            };
          }
          trainerMap[tid].hires.push(h);
        });
        const trainerList = Object.values(trainerMap);

        // Filter by search
        const filteredTrainerList = searchQuery
          ? trainerList.filter(t =>
              (t.name      || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
              (t.specialty || "").toLowerCase().includes(searchQuery.toLowerCase()))
          : trainerList;

        return (
          <div>
            {/* ── Back button when a trainer is selected ── */}
            {selectedTrainer ? (
              <div>
                {/* Header */}
                <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:24 }}>
                  <button
                    onClick={() => setSelectedTrainer(null)}
                    style={{ padding:"8px 16px", background:"transparent", border:"1px solid #222", borderRadius:8, color:"#888", fontSize:13, cursor:"pointer", fontFamily:"DM Sans,sans-serif", transition:"all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor="#a3d959"; e.currentTarget.style.color="#a3d959"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="#222"; e.currentTarget.style.color="#888"; }}
                  >
                    ← Back to Trainers
                  </button>
                  <h2 className="ad-section-title" style={{ margin:0 }}>
                    {selectedTrainer.name}'s Members
                  </h2>
                </div>

                {/* Selected trainer big card */}
                <div style={{
                  background:"#111", border:"1px solid rgba(163,217,89,0.3)",
                  borderRadius:14, padding:24, marginBottom:20,
                  display:"flex", alignItems:"center", gap:24,
                }}>
                  {selectedTrainer.photo
                    ? <img src={selectedTrainer.photo} alt={selectedTrainer.name} style={{ width:80, height:80, borderRadius:"50%", border:"2px solid rgba(163,217,89,0.4)", objectFit:"cover", flexShrink:0 }} />
                    : <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(163,217,89,0.1)", border:"2px solid rgba(163,217,89,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:"#a3d959", flexShrink:0 }}>
                        {(selectedTrainer.name||"T")[0].toUpperCase()}
                      </div>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, color:"#a3d959", marginBottom:4 }}>{selectedTrainer.name}</div>
                    <div style={{ fontSize:13, color:"#666", marginBottom:6 }}>{selectedTrainer.specialty}</div>
                    <div style={{ display:"flex", gap:20 }}>
                      <span style={{ fontSize:12, color:"#555" }}>Experience: <span style={{ color:"#888" }}>{selectedTrainer.experience}</span></span>
                      <span style={{ fontSize:12, color:"#555" }}>Rating: <span style={{ color:"#a3d959" }}>⭐ {selectedTrainer.rating}</span></span>
                      <span style={{ fontSize:12, color:"#555" }}>Total Hires: <span style={{ color:"#f0ede8", fontWeight:600 }}>{selectedTrainer.hires.length}</span></span>
                    </div>
                  </div>
                </div>

                {/* Users who hired this trainer */}
                {selectedTrainer.hires.length === 0 ? (
                  <div className="ad-card"><p className="ad-empty">No users have hired this trainer yet.</p></div>
                ) : (
                  <div className="ad-card">
                    <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1.5, color:"#888", marginBottom:16 }}>
                      HIRED BY {selectedTrainer.hires.length} USER{selectedTrainer.hires.length !== 1 ? "S" : ""}
                    </h3>
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead><tr>
                          <th>#</th><th>Member Name</th><th>Email</th><th>Date Hired</th>
                        </tr></thead>
                        <tbody>
                          {selectedTrainer.hires.map((h, i) => (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td>
                                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                  <div style={{ width:30, height:30, borderRadius:"50%", background:"rgba(163,217,89,0.1)", border:"1px solid rgba(163,217,89,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#a3d959", fontWeight:600, flexShrink:0 }}>
                                    {(h.user?.fullname || "U")[0].toUpperCase()}
                                  </div>
                                  {h.user?.fullname || "—"}
                                </div>
                              </td>
                              <td className="ad-muted">{h.user?.email || "—"}</td>
                              <td className="ad-muted">{formatDateTimeForTable(h.date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            ) : (
              /* ── Trainer cards grid ── */
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
                  <div>
                    <h2 className="ad-section-title" style={{ margin:0, marginBottom:2 }}>Our Trainers</h2>
                    <span style={{ fontSize:12, color:"#555" }}>Click a card to see hired members</span>
                  </div>
                  <button onClick={exportTrainers} style={{padding:"8px 16px",background:"transparent",border:"1px solid rgba(163,217,89,0.4)",borderRadius:8,color:"#a3d959",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"DM Sans,sans-serif",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(163,217,89,0.1)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    ⬇ Export Hire Data
                  </button>
                </div>

                {filteredTrainerList.length === 0 ? (
                  <div className="ad-card">
                    <div className="ad-empty" style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span>No trainers match</span>
                      <strong style={{ color:"#a3d959" }}>"{searchQuery}"</strong>
                      <button onClick={() => setSearchQuery("")} style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:12, textDecoration:"underline" }}>clear</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:16 }}>
                    {filteredTrainerList.map((t) => (
                      <div
                        key={t._id}
                        onClick={() => setSelectedTrainer(t)}
                        className="ad-trainer-card"
                      >
                        {/* Hire count badge */}
                        <div style={{
                          position:"absolute", top:14, right:14,
                          background: t.hires.length > 0 ? "rgba(163,217,89,0.15)" : "rgba(255,255,255,0.04)",
                          border: t.hires.length > 0 ? "1px solid rgba(163,217,89,0.3)" : "1px solid #222",
                          borderRadius:100, padding:"3px 10px",
                          fontSize:11, fontWeight:500,
                          color: t.hires.length > 0 ? "#a3d959" : "#555",
                        }}>
                          {t.hires.length} {t.hires.length === 1 ? "member" : "members"}
                        </div>

                        {/* Photo */}
                        {t.photo
                          ? <img src={t.photo} alt={t.name} style={{ width:80, height:80, borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(163,217,89,0.3)", marginBottom:14 }} />
                          : <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(163,217,89,0.1)", border:"2px solid rgba(163,217,89,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#a3d959", marginBottom:14 }}>
                              {(t.name||"T")[0].toUpperCase()}
                            </div>}

                        {/* Info */}
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:1.5, color:"#f0ede8", marginBottom:4 }}>{t.name}</div>
                        <div style={{ fontSize:12, color:"#a3d959", marginBottom:8, fontWeight:500 }}>{t.specialty}</div>

                        <div style={{ display:"flex", gap:14, marginBottom:16 }}>
                          <div style={{ textAlign:"center" }}>
                            <div style={{ fontSize:11, color:"#444", letterSpacing:0.5 }}>EXP</div>
                            <div style={{ fontSize:12, color:"#888" }}>{t.experience}</div>
                          </div>
                          <div style={{ width:1, background:"#1a1a1a" }} />
                          <div style={{ textAlign:"center" }}>
                            <div style={{ fontSize:11, color:"#444", letterSpacing:0.5 }}>RATING</div>
                            <div style={{ fontSize:12, color:"#a3d959" }}>⭐ {t.rating}</div>
                          </div>
                        </div>

                        {/* CTA */}
                        <div style={{ fontSize:12, color:"#555", borderTop:"1px solid #1a1a1a", paddingTop:12, width:"100%", textAlign:"center" }}>
                          {t.hires.length > 0 ? `View ${t.hires.length} hired member${t.hires.length !== 1 ? "s" : ""} →` : "No members hired yet"}
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteTrainer(t._id, t.name); }}
                          style={{
                            marginTop:10, padding:"5px 12px",
                            background:"transparent",
                            border:"1px solid rgba(224,90,90,0.2)",
                            borderRadius:6, color:"rgba(224,90,90,0.5)",
                            fontSize:11, cursor:"pointer",
                            fontFamily:"DM Sans, sans-serif",
                            transition:"all 0.2s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background="rgba(224,90,90,0.08)"; e.currentTarget.style.color="#e05a5a"; e.currentTarget.style.borderColor="rgba(224,90,90,0.4)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(224,90,90,0.5)"; e.currentTarget.style.borderColor="rgba(224,90,90,0.2)"; }}
                        >
                          Remove trainer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      case "classes":
        return (
          <div className="ad-card">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 className="ad-section-title" style={{ marginBottom:0 }}>Booked Free Classes</h2>
              <button onClick={exportClasses} style={{padding:"8px 16px",background:"transparent",border:"1px solid rgba(163,217,89,0.4)",borderRadius:8,color:"#a3d959",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"DM Sans,sans-serif",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(163,217,89,0.1)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                ⬇ Export Excel
              </button>
            </div>
            {bookings.length === 0 ? <p className="ad-empty">No bookings yet.</p> :
             filteredBookings.length === 0 ? (
               <div className="ad-empty" style={{display:"flex",alignItems:"center",gap:8}}>
                 <span>No bookings match</span>
                 <strong style={{color:"#a3d959"}}>"{searchQuery}"</strong>
                 <button onClick={()=>setSearchQuery("")} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:12,textDecoration:"underline"}}>clear</button>
               </div>) : (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead><tr>
                    <th>#</th><th>Name</th><th>Address</th><th>Contact</th><th>Service</th><th>Date & Time</th>
                  </tr></thead>
                  <tbody>
                    {filteredBookings.map((b, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td><td>{b.name}</td>
                        <td className="ad-muted">{b.address}</td>
                        <td className="ad-muted">{b.contact}</td>
                        <td><span className="ad-badge">{b.service}</span></td>
                        <td className="ad-muted">{formatDateTimeForTable(b.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "payments":
        return (
          <div className="ad-card">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 className="ad-section-title" style={{ marginBottom:0 }}>User Payments</h2>
              <button onClick={exportPayments} style={{padding:"8px 16px",background:"transparent",border:"1px solid rgba(163,217,89,0.4)",borderRadius:8,color:"#a3d959",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"DM Sans,sans-serif",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(163,217,89,0.1)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                ⬇ Export Excel
              </button>
            </div>
            {payments.length === 0 ? <p className="ad-empty">No payments yet.</p> :
             filteredPayments.length === 0 ? (
               <div className="ad-empty" style={{display:"flex",alignItems:"center",gap:8}}>
                 <span>No payments match</span>
                 <strong style={{color:"#a3d959"}}>"{searchQuery}"</strong>
                 <button onClick={()=>setSearchQuery("")} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:12,textDecoration:"underline"}}>clear</button>
               </div>) : (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead><tr>
                    <th>#</th><th>User</th><th>Email</th><th>Plan</th><th>Price</th><th>Date & Time</th>
                  </tr></thead>
                  <tbody>
                    {filteredPayments.map((p, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td><td>{p.name}</td>
                        <td className="ad-muted">{p.email}</td>
                        <td><span className="ad-badge">{p.plan}</span></td>
                        <td className="ad-green">₹{p.price}</td>
                        <td className="ad-muted">{formatDateTimeForTable(p.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "reviews": {
        const featuredCount = reviews.filter(r => r.featured).length;
        return (
          <div className="ad-card">
            {/* Header row with count */}
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <h2 className="ad-section-title" style={{ marginBottom:0 }}>User Reviews</h2>
                <button onClick={exportReviews} style={{padding:"6px 12px",background:"transparent",border:"1px solid rgba(163,217,89,0.4)",borderRadius:8,color:"#a3d959",fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"DM Sans,sans-serif",display:"flex",alignItems:"center",gap:5,transition:"all 0.2s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(163,217,89,0.1)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  ⬇ Export
                </button>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{
                  display:"flex", alignItems:"center", gap:6,
                  background: featuredCount >= 3 ? "rgba(163,217,89,0.1)" : "rgba(163,217,89,0.05)",
                  border: featuredCount >= 3 ? "1px solid rgba(163,217,89,0.4)" : "1px solid rgba(163,217,89,0.15)",
                  borderRadius:8, padding:"5px 12px",
                }}>
                  <span style={{ fontSize:13, color:"#a3d959", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>
                    {featuredCount}/3
                  </span>
                  <span style={{ fontSize:11, color:"#555" }}>featured on landing page</span>
                </div>
                {featuredCount >= 3 && (
                  <span style={{ fontSize:11, color:"#e05a5a", background:"rgba(224,90,90,0.08)", border:"1px solid rgba(224,90,90,0.2)", borderRadius:6, padding:"4px 10px" }}>
                    Max reached — unfeature one to swap
                  </span>
                )}
              </div>
            </div>

            {reviews.length === 0 ? <p className="ad-empty">No reviews yet.</p> :
             filteredReviews.length === 0 ? (
               <div className="ad-empty" style={{display:"flex",alignItems:"center",gap:8}}>
                 <span>No reviews match</span>
                 <strong style={{color:"#a3d959"}}>"{searchQuery}"</strong>
                 <button onClick={()=>setSearchQuery("")} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:12,textDecoration:"underline"}}>clear</button>
               </div>) : (
              <div className="ad-reviews-grid">
                {filteredReviews.map((r, i) => (
                  <div key={i} className="ad-review-card" style={{
                    border: r.featured ? "1px solid rgba(163,217,89,0.35)" : "1px solid #1a1a1a",
                    background: r.featured ? "rgba(163,217,89,0.04)" : "#0f0f0f",
                    transition: "all 0.2s",
                  }}>
                    {/* Top: avatar + name + date */}
                    <div className="ad-review-top">
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        {r.profilePhoto
                          ? <img src={r.profilePhoto} alt={r.fullname} style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover", border:"1.5px solid rgba(163,217,89,0.3)", flexShrink:0 }} />
                          : <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(163,217,89,0.1)", border:"1px solid rgba(163,217,89,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#a3d959", fontWeight:600, flexShrink:0 }}>
                              {r.fullname ? r.fullname[0].toUpperCase() : "U"}
                            </div>}
                        <div>
                          <strong className="ad-review-name">{r.fullname}</strong>
                          {r.featured && (
                            <div style={{ fontSize:10, color:"#a3d959", letterSpacing:1, textTransform:"uppercase", marginTop:2 }}>
                              ✦ On landing page
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="ad-muted ad-small">{formatDateTimeForTable(r.date)}</span>
                    </div>

                    {/* Stars */}
                    <div className="ad-review-stars" style={{ margin:"8px 0" }}>
                      {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    </div>

                    {/* Review text */}
                    <p className="ad-review-text">{r.text}</p>

                    {/* Feature toggle button */}
                    <button
                      onClick={() => toggleFeature(r._id)}
                      style={{
                        marginTop:14,
                        width:"100%",
                        padding:"9px 14px",
                        borderRadius:8,
                        border: r.featured ? "1px solid rgba(163,217,89,0.5)" : "1px solid #222",
                        background: r.featured ? "rgba(163,217,89,0.12)" : "transparent",
                        color: r.featured ? "#a3d959" : (!r.featured && featuredCount >= 3 ? "#333" : "#555"),
                        fontSize:12,
                        fontWeight:500,
                        cursor: (!r.featured && featuredCount >= 3) ? "not-allowed" : "pointer",
                        fontFamily:"DM Sans, sans-serif",
                        transition:"all 0.2s",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"center",
                        gap:8,
                        opacity: (!r.featured && featuredCount >= 3) ? 0.4 : 1,
                      }}
                    >
                      {r.featured
                        ? "✦ Featured — click to remove from landing page"
                        : featuredCount >= 3
                          ? "✕ Max 3 reached — unfeature another first"
                          : "+ Feature on Landing Page"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case "reports":
        return (
          <div className="ad-card">
            <h2 className="ad-section-title">Monthly Reports & Analytics</h2>
            {stats.length === 0 ? <p className="ad-empty">No data yet.</p> : (
              <>
                <div className="ad-chart-block">
                  <h3 className="ad-chart-title">Members Joined (Monthly)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                      <XAxis dataKey="monthLabel" stroke="#555" tick={{ fill: "#888", fontSize: 12 }} />
                      <YAxis stroke="#555" tick={{ fill: "#888", fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8, color: "#f0ede8" }} />
                      <Legend wrapperStyle={{ color: "#888", fontSize: 12 }} />
                      <Bar dataKey="members" fill="#a3d959" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="ad-chart-block">
                  <h3 className="ad-chart-title">Classes Booked (Monthly)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={stats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                      <XAxis dataKey="monthLabel" stroke="#555" tick={{ fill: "#888", fontSize: 12 }} />
                      <YAxis stroke="#555" tick={{ fill: "#888", fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8, color: "#f0ede8" }} />
                      <Legend wrapperStyle={{ color: "#888", fontSize: 12 }} />
                      <Line type="monotone" dataKey="classes" stroke="#a3d959" strokeWidth={2} dot={{ r: 4, fill: "#a3d959" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="ad-chart-block">
                  <h3 className="ad-chart-title">Revenue Overview (₹)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={stats}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#a3d959" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a3d959" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                      <XAxis dataKey="monthLabel" stroke="#555" tick={{ fill: "#888", fontSize: 12 }} />
                      <YAxis stroke="#555" tick={{ fill: "#888", fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8, color: "#f0ede8" }} />
                      <Area type="monotone" dataKey="revenue" stroke="#a3d959" fill="url(#colorRev)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        );

      default:
        return (
          <>
            {/* Export All button on dashboard */}
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
              <button onClick={exportAll}
                style={{padding:"10px 20px",background:"rgba(163,217,89,0.1)",border:"1px solid rgba(163,217,89,0.4)",borderRadius:10,color:"#a3d959",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"DM Sans,sans-serif",display:"flex",alignItems:"center",gap:8,transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(163,217,89,0.18)";e.currentTarget.style.boxShadow="0 0 16px rgba(163,217,89,0.15)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(163,217,89,0.1)";e.currentTarget.style.boxShadow="none";}}>
                ⬇ Export Full Report (All Sheets)
              </button>
            </div>
            <div className="ad-stat-grid">
              {[
                { label: "Total Members",   value: members.length,                              icon: "👥", section: "members",  hint: "View all members"  },
                { label: "Booked Classes",  value: bookings.length,                             icon: "📅", section: "classes",  hint: "View all classes"  },
                { label: "Active Trainers", value: uniqueTrainerCount,                          icon: "🏋", section: "trainers", hint: "View trainer hires" },
                { label: "Total Revenue",   value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: "💰", section: "reports",  hint: "View reports"      },
              ].map((s) => (
                <div
                  key={s.label}
                  className="ad-stat-card"
                  onClick={() => { setActiveSection(s.section); setSearchQuery(""); }}
                  style={{ cursor: "pointer", position: "relative", overflow: "hidden" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(163,217,89,0.45)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.querySelector(".ad-card-hint").style.opacity = "1";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "#1a1a1a";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.querySelector(".ad-card-hint").style.opacity = "0";
                  }}
                >
                  <div className="ad-stat-icon">{s.icon}</div>
                  <div className="ad-stat-label">{s.label}</div>
                  <div className="ad-stat-value">{s.value}</div>
                  {/* Hover hint that slides up */}
                  <div className="ad-card-hint" style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "linear-gradient(transparent, rgba(163,217,89,0.1))",
                    padding: "8px 14px 12px",
                    fontSize: 11, color: "#a3d959", fontWeight: 500,
                    letterSpacing: "0.5px", textAlign: "right",
                    opacity: 0, transition: "opacity 0.2s",
                  }}>
                    {s.hint} →
                  </div>
                </div>
              ))}
            </div>
            {stats.length > 0 && (
              <div className="ad-card" style={{ marginTop: 20 }}>
                <h3 className="ad-chart-title">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats}>
                    <defs>
                      <linearGradient id="colorRevD" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#a3d959" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#a3d959" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                    <XAxis dataKey="monthLabel" stroke="#555" tick={{ fill: "#666", fontSize: 12 }} />
                    <YAxis stroke="#555" tick={{ fill: "#666", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: 8, color: "#f0ede8" }} />
                    <Area type="monotone" dataKey="revenue" stroke="#a3d959" fill="url(#colorRevD)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        );
    }
  };

  const sectionLabel = navItems.find(n => n.key === activeSection)?.label || "Dashboard";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ad-root {
          display: flex;
          min-height: 100vh;
          background: #0a0a0a;
          font-family: 'DM Sans', sans-serif;
          color: #f0ede8;
        }

        /* ── Sidebar ── */
        .ad-sidebar {
          width: 260px;
          flex-shrink: 0;
          background: #111;
          display: flex;
          flex-direction: column;
          padding: 32px 24px;
          position: fixed;
          top: 0; left: 0; bottom: 0;
          overflow-y: auto;
          z-index: 100;
          border-right: 1px solid #1a1a1a;
        }
        .ad-sidebar-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 3px;
          color: #a3d959;
          margin-bottom: 8px;
        }
        .ad-sidebar-sub {
          font-size: 11px;
          color: #444;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 36px;
        }
        .ad-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .ad-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #555;
          transition: all 0.2s;
          border: none;
          background: none;
          font-family: 'DM Sans', sans-serif;
          width: 100%;
          text-align: left;
        }
        .ad-nav-item:hover { background: #1a1a1a; color: #888; }
        .ad-nav-item.active { background: rgba(163,217,89,0.1); color: #a3d959; }
        .ad-nav-item.active .ad-nav-dot { background: #a3d959; }
        .ad-nav-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #333; flex-shrink: 0;
          transition: background 0.2s;
        }
        .ad-nav-icon { font-size: 16px; flex-shrink: 0; }
        .ad-nav-label { font-size: 14px; font-weight: 400; }
        .ad-sidebar-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #1a1a1a;
        }
        .ad-admin-row {
          display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
        }
        .ad-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(163,217,89,0.15);
          border: 1.5px solid rgba(163,217,89,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; color: #a3d959; font-weight: 500;
          flex-shrink: 0;
        }
        .ad-admin-name { font-size: 13px; color: #888; font-weight: 500; }
        .ad-admin-role { font-size: 11px; color: #444; }
        .ad-logout-btn {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #222;
          background: transparent;
          color: #e05a5a;
          font-size: 13px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
          text-align: left;
        }
        .ad-logout-btn:hover { background: rgba(224,90,90,0.08); border-color: rgba(224,90,90,0.3); }

        /* ── Main ── */
        .ad-main {
          margin-left: 260px;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .ad-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 28px;
          border-bottom: 1px solid #1a1a1a;
          background: #0a0a0a;
          position: sticky; top: 0; z-index: 10;
        }
        .ad-page-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 2px;
          color: #f0ede8;
        }
        .ad-topbar-right { display: flex; align-items: center; gap: 12px; }
        .ad-search {
          padding: 9px 16px;
          border-radius: 8px;
          border: 1px solid #1e1e1e;
          background: #111;
          color: #f0ede8;
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          width: 240px;
          outline: none;
          transition: border-color 0.2s;
        }
        .ad-search:focus { border-color: #a3d959; }
        .ad-search::placeholder { color: #444; }

        /* ── Content ── */
        .ad-content { padding: 24px 28px; flex: 1; }

        /* ── Stat cards ── */
        .ad-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 4px;
        }
        .ad-stat-card {
          background: #111;
          border: 1px solid #1a1a1a;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color 0.2s;
        }
        .ad-stat-card:hover { border-color: rgba(163,217,89,0.25); }
        .ad-stat-icon { font-size: 22px; }
        .ad-stat-label { font-size: 12px; color: #555; letter-spacing: 0.5px; }
        .ad-stat-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px;
          letter-spacing: 1px;
          color: #a3d959;
          line-height: 1;
        }

        /* ── Section card ── */
        .ad-card {
          background: #111;
          border: 1px solid #1a1a1a;
          border-radius: 12px;
          padding: 24px;
        }
        .ad-section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 24px;
          letter-spacing: 2px;
          color: #f0ede8;
          margin-bottom: 20px;
        }
        .ad-empty { color: #444; font-size: 14px; }

        /* ── Table ── */
        .ad-table-wrap { overflow-x: auto; }
        .ad-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 700px;
          font-size: 14px;
        }
        .ad-table thead tr { background: #0a0a0a; }
        .ad-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #555;
          border-bottom: 1px solid #1a1a1a;
          white-space: nowrap;
        }
        .ad-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #141414;
          color: #c8c5c0;
          vertical-align: middle;
        }
        .ad-table tbody tr:hover td { background: rgba(163,217,89,0.03); }
        .ad-table tbody tr:last-child td { border-bottom: none; }
        .ad-member-row:hover td { background: rgba(163,217,89,0.04) !important; }
        .ad-member-row td:last-child::after { content: 'View profile →'; float: right; font-size: 11px; color: #333; transition: color 0.2s; }
        .ad-member-row:hover td:last-child::after { color: #a3d959; }
        .ad-card-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 2px; color: #f0ede8; margin-bottom: 18px; }

        /* ── Utilities ── */
        .ad-green { color: #a3d959; font-weight: 600; }
        .ad-red   { color: #e05a5a; font-weight: 600; }
        .ad-muted { color: #555; }
        .ad-small { font-size: 12px; margin-top: 3px; }
        .ad-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 500;
          background: rgba(163,217,89,0.1);
          color: #a3d959;
          border: 1px solid rgba(163,217,89,0.2);
          white-space: nowrap;
        }

        /* ── Reviews ── */
        .ad-reviews-grid { display: flex; flex-direction: column; gap: 12px; }
        .ad-review-card {
          background: #0f0f0f;
          border: 1px solid #1a1a1a;
          border-radius: 10px;
          padding: 16px;
          transition: border-color 0.2s;
        }
        .ad-review-card:hover { border-color: #2a2a2a; }
        .ad-review-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .ad-review-name { font-size: 14px; color: #f0ede8; font-weight: 500; }
        .ad-review-stars { color: #a3d959; font-size: 14px; letter-spacing: 2px; margin-bottom: 8px; }
        .ad-review-text { font-size: 13px; color: #666; line-height: 1.6; }

        /* ── Charts ── */
        .ad-chart-block { margin-top: 24px; }
        .ad-chart-block:first-child { margin-top: 0; }
        .ad-chart-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 1.5px;
          color: #888;
          margin-bottom: 16px;
        }

        @media (max-width: 1024px) {
          .ad-stat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        /* ── Trainer cards ── */
        .ad-trainer-card {
          background: #111;
          border: 1px solid #1a1a1a;
          border-radius: 14px;
          padding: 24px 20px 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          cursor: pointer;
          position: relative;
          transition: border-color 0.2s, transform 0.2s, background 0.2s;
          overflow: hidden;
        }
        .ad-trainer-card:hover {
          border-color: rgba(163,217,89,0.4);
          background: rgba(163,217,89,0.03);
          transform: translateY(-3px);
        }
        .ad-trainer-card::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #a3d959, transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .ad-trainer-card:hover::after { opacity: 1; }

        /* Export button */
        .ad-export-btn {
          padding: 8px 16px;
          background: transparent;
          border: 1px solid rgba(163,217,89,0.4);
          border-radius: 8px;
          color: #a3d959;
          font-size: 12px; font-weight: 500;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          display: flex; align-items: center; gap: 6px;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .ad-export-btn:hover { background: rgba(163,217,89,0.1); }

        @media (max-width: 700px) {
          .ad-sidebar { display: none; }
          .ad-main { margin-left: 0; }
          .ad-stat-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="ad-root">

        {/* Sidebar */}
        <aside className="ad-sidebar">
          <div className="ad-sidebar-logo">ROYAL FITNESS</div>
          <div className="ad-sidebar-sub">Admin Panel</div>

          <nav className="ad-nav">
            {navItems.map(n => (
              <button key={n.key}
                className={`ad-nav-item ${activeSection === n.key ? "active" : ""}`}
                onClick={() => { setActiveSection(n.key); setSearchQuery(''); setSelectedTrainer(null); setSelectedMember(null); }}>
                <span className="ad-nav-dot" />
                <span className="ad-nav-icon">{n.icon}</span>
                <span className="ad-nav-label">{n.label}</span>
              </button>
            ))}
          </nav>

          <div className="ad-sidebar-footer">
            <div className="ad-admin-row">
              <div className="ad-avatar">{user ? user[0].toUpperCase() : "A"}</div>
              <div>
                <div className="ad-admin-name">{user}</div>
                <div className="ad-admin-role">Administrator</div>
              </div>
            </div>
            <button className="ad-logout-btn" onClick={logout}>← Sign Out</button>
          </div>
        </aside>

        {/* Main */}
        <main className="ad-main">
          <div className="ad-topbar">
            <span className="ad-page-title">{sectionLabel}</span>
            <div className="ad-topbar-right">
              <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
                <input
                  className="ad-search"
                  placeholder={`Search ${sectionLabel}...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingRight: searchQuery ? 32 : 16 }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} style={{
                    position:"absolute", right:10,
                    background:"none", border:"none",
                    color:"#555", fontSize:16, cursor:"pointer",
                    lineHeight:1, padding:0,
                  }}>✕</button>
                )}
              </div>
            </div>
          </div>
          <div className="ad-content">
            {renderSection()}
          </div>
        </main>

      </div>

      {/* ── Floating Add Trainer button — only visible in trainers section ── */}
      {activeSection === "trainers" && !selectedTrainer && (
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            position:"fixed", bottom:32, right:32, zIndex:200,
            width:56, height:56, borderRadius:"50%",
            background:"#a3d959", border:"none",
            color:"#0a0a0a", fontSize:28, fontWeight:300,
            cursor:"pointer", boxShadow:"0 4px 24px rgba(163,217,89,0.4)",
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform="scale(1.1)"; e.currentTarget.style.boxShadow="0 6px 32px rgba(163,217,89,0.6)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform="scale(1)";   e.currentTarget.style.boxShadow="0 4px 24px rgba(163,217,89,0.4)"; }}
          title="Add new trainer"
        >+</button>
      )}

      {/* ── Add Trainer Modal ── */}
      {showAddModal && (
        <div style={{
          position:"fixed", inset:0, zIndex:300,
          background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)",
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:20,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div style={{
            background:"#111", border:"1px solid #222",
            borderRadius:16, width:"100%", maxWidth:500,
            maxHeight:"90vh", overflowY:"auto",
            padding:28,
          }}>
            {/* Modal header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:2, color:"#f0ede8" }}>
                ADD NEW TRAINER
              </div>
              <button onClick={() => { setShowAddModal(false); setTrainerFormErrors({}); }}
                style={{ background:"none", border:"none", color:"#555", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
            </div>

            <form onSubmit={handleAddTrainer}>

              {/* Photo upload */}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:24 }}>
                <div
                  onClick={() => document.getElementById("trainer-photo-input").click()}
                  style={{
                    width:100, height:100, borderRadius:"50%",
                    border:"2px dashed rgba(163,217,89,0.4)",
                    background:"rgba(163,217,89,0.05)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", overflow:"hidden", marginBottom:8,
                    transition:"border-color 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="rgba(163,217,89,0.8)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="rgba(163,217,89,0.4)"}
                >
                  {trainerForm.photo
                    ? <img src={trainerForm.photo} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <span style={{ fontSize:32, color:"rgba(163,217,89,0.5)" }}>+</span>}
                </div>
                <input id="trainer-photo-input" type="file" accept="image/*"
                  style={{ display:"none" }} onChange={handleTrainerPhoto} />
                <span style={{ fontSize:11, color:"#444" }}>Click to upload photo</span>
              </div>

              {/* Form fields */}
              {[
                { key:"name",       label:"Full Name",            type:"text",   placeholder:"e.g. Amit Sharma"           },
                { key:"specialty",  label:"Specialty",            type:"text",   placeholder:"e.g. Strength Training"     },
                { key:"experience", label:"Experience",           type:"text",   placeholder:"e.g. 5 years"               },
                { key:"rating",     label:"Rating (1–5)",         type:"number", placeholder:"e.g. 4.8", min:"1", max:"5", step:"0.1" },
                { key:"bio",        label:"Short Bio (optional)", type:"text",   placeholder:"Brief description..."       },
              ].map(f => (
                <div key={f.key} style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:11, letterSpacing:1.2, textTransform:"uppercase", color:"#555", fontWeight:500, marginBottom:7 }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    min={f.min} max={f.max} step={f.step}
                    value={trainerForm[f.key]}
                    onChange={e => {
                      setTrainerForm(prev => ({ ...prev, [f.key]: e.target.value }));
                      setTrainerFormErrors(prev => ({ ...prev, [f.key]: "" }));
                    }}
                    style={{
                      width:"100%", padding:"11px 14px",
                      background:"#0f0f0f",
                      border: trainerFormErrors[f.key] ? "1px solid #e05a5a" : "1px solid #1e1e1e",
                      borderRadius:8, fontSize:14, color:"#f0ede8",
                      fontFamily:"DM Sans, sans-serif", outline:"none",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor="#a3d959"}
                    onBlur={e  => e.currentTarget.style.borderColor = trainerFormErrors[f.key] ? "#e05a5a" : "#1e1e1e"}
                  />
                  {trainerFormErrors[f.key] && (
                    <span style={{ fontSize:11, color:"#e05a5a", marginTop:4, display:"block" }}>
                      {trainerFormErrors[f.key]}
                    </span>
                  )}
                </div>
              ))}

              {trainerFormErrors.submit && (
                <div style={{ background:"rgba(224,90,90,0.08)", border:"1px solid rgba(224,90,90,0.2)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#e05a5a", marginBottom:14 }}>
                  {trainerFormErrors.submit}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display:"flex", gap:10, marginTop:8 }}>
                <button type="button"
                  onClick={() => { setShowAddModal(false); setTrainerFormErrors({}); }}
                  style={{ flex:1, padding:"12px", background:"transparent", border:"1px solid #222", borderRadius:8, color:"#888", fontSize:13, cursor:"pointer", fontFamily:"DM Sans, sans-serif" }}>
                  Cancel
                </button>
                <button type="submit" disabled={addLoading}
                  style={{ flex:2, padding:"12px", background: addLoading ? "#6a8f35" : "#a3d959", border:"none", borderRadius:8, color:"#0a0a0a", fontSize:13, fontWeight:500, cursor: addLoading ? "not-allowed" : "pointer", fontFamily:"DM Sans, sans-serif", transition:"background 0.2s" }}>
                  {addLoading ? "Adding trainer..." : "Add Trainer →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}