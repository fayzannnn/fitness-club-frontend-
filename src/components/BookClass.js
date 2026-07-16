import React, { useState } from "react";
import API from "../api";
import "../style.css";

export default function BookClass() {
  const [form, setForm] = useState({ name: '', contact: '', address: '', service: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/bookings", {
        name: form.name,
        contact: form.contact,
        address: form.address,
        service: form.service,
        date: new Date(),
      });
      alert("Booking created ✅");
      setForm({ name: "", contact: "", address: "", service: "" });
    } catch (err) {
      console.error(err);
      alert("Booking failed ❌");
    }
  };

  return (
    <div className="booking-container">
      <div className="booking-card">
        <h2 className="booking-title">Book a Free Class</h2>
        <form onSubmit={submit} className="booking-form">
          <label className="booking-label">Name</label>
          <input
            className="booking-input"
            name="name"
            placeholder="Enter your name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <label className="booking-label">Address</label>
          <textarea
            className="booking-textarea"
            name="address"
            placeholder="Enter your address"
            value={form.address}
            onChange={handleChange}
            required
          />

          <label className="booking-label">Contact No.</label>
          <input
            className="booking-input"
            name="contact"
            placeholder="Enter your contact number"
            value={form.contact}
            onChange={handleChange}
            required
          />

          <label className="booking-label">Select Service</label>
          <select
            className="booking-select"
            name="service"
            value={form.service}
            onChange={handleChange}
            required
          >
            <option value="">-- Choose a Service --</option>
            <option value="Zumba">Zumba</option>
            <option value="Strength Training">Strength Training</option>
            <option value="Cardio">Cardio</option>
            <option value="Weight Training">Weight Training</option>
            <option value="Physical Fitness">Physical Fitness</option>
          </select>

          <button type="submit" className="booking-btn">
            Book Class
          </button>
        </form>
      </div>
    </div>
  );
}
