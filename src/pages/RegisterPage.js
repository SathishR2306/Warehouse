// src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      await API.post('/auth/register', form);
      alert("Registered successfully! Please login.");
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="container">
      <h2>Register</h2>
      <input type="text" name="name" placeholder="Name" value={form.name} onChange={handleChange} /><br/>
      <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} /><br/>
      <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} /><br/>
      <button onClick={handleSubmit}>Register</button>
    </div>
  );
};

export default RegisterPage;
