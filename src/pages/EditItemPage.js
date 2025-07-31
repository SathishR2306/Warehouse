import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';

const EditItemPage = () => {
    const { id } = useParams();
    const [item, setItem] = useState({});
    const navigate = useNavigate();

    const fetchItem = async () => {
        const res = await API.get('/items');
        const found = res.data.find(i => i._id === id);
        if (found) setItem(found);
        else alert("Item not found");
    };

    useEffect(() => {
        fetchItem();
    }, []);

    const handleChange = e => {
        setItem({ ...item, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        await API.put(`/items/${id}`, item);
        navigate('/');
    };

    return (
        <div className="container">
            <h2>Edit Item</h2>
            <input name="name" value={item.name || ''} placeholder="Name" onChange={handleChange} />
            <input name="description" value={item.description || ''} placeholder="Description" onChange={handleChange} />
            <input name="quantity" type="number" value={item.quantity || 0} placeholder="Quantity" onChange={handleChange} />
            <input name="threshold" type="number" value={item.threshold || 1} placeholder="Threshold" onChange={handleChange} />
            <input name="location" value={item.location || ''} placeholder="Location" onChange={handleChange} />
            <button onClick={handleSubmit}>Update Item</button>
            <button className="link-btn" onClick={() => navigate('/')}>Back to Dashboard</button>
        </div>
    );
};

export default EditItemPage;
