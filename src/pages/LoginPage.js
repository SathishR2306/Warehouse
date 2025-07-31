// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      const res = await API.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="container">
      <h2>Login</h2>
      <input type="text" name="email" placeholder="User ID" value={form.email} onChange={handleChange} /><br/>
      <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} /><br/>
      <button onClick={handleSubmit}>Login</button>
      <p>New User? <Link to="/register">Register</Link></p>
    </div>
  );
};

export default LoginPage;
