import React, { useState } from 'react';
import API from '../services/api';
import { useNavigate } from 'react-router-dom';

const AddItemPage = () => {
    const [item, setItem] = useState({
        name: '',
        description: '',
        quantity: 0,
        threshold: 1,
        location: ''
    });
    const navigate = useNavigate();

    const handleChange = e => {
        setItem({ ...item, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        await API.post('/items', item);
        navigate('/');
    };

    return (
        <div className="container">
            <h2>Add Item</h2>
            <input name="name" placeholder="Name" onChange={handleChange} />
            <input name="description" placeholder="Description" onChange={handleChange} />
            <input name="quantity" type="number" placeholder="Quantity" onChange={handleChange} />
            <input name="threshold" type="number" placeholder="Threshold" onChange={handleChange} />
            <input name="location" placeholder="Location" onChange={handleChange} />
            <button onClick={handleSubmit}>Add Item</button>
            <button className="link-btn" onClick={() => navigate('/')}>Back to Dashboard</button>
        </div>
    );
};

export default AddItemPage;
