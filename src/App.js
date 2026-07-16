import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

import Landing        from './components/Landing';
import Login          from './components/Login';
import PaymentPage    from './components/PaymentPage';
import UserDashboard  from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import BookClass      from './components/BookClass';
import VerifyEmail    from './components/VerifyEmail';
import './style.css';

function RequireAuth({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
}

export default function App() {
  const [role, setRole] = useState(null);

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/"             element={<Landing />} />
          <Route path="/login"        element={<Login setRole={setRole} />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/book"         element={<BookClass />} />
          <Route path="/payment"      element={<RequireAuth><PaymentPage /></RequireAuth>} />
          <Route path="/user"         element={<RequireAuth><UserDashboard /></RequireAuth>} />
          <Route path="/admin"        element={<RequireAuth><AdminDashboard /></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}