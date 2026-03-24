// ItemForm component

import { useState } from 'react';
import Button from '../common/Button';
import './ItemForm.css';

function ItemForm({ categories = [], onSubmit, loading, initialData = null }) {

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        price: initialData?.price || '',
        category_id: initialData?.category_id || '',
        allow_purchase: initialData?.allow_purchase ?? true,
        allow_lease: initialData?.allow_lease ?? false,
        lease_percentage: initialData?.lease_percentage ?? 10
    });

    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }
        if (!formData.price || parseFloat(formData.price) <= 0) {
            newErrors.price = 'Price must be greater than 0';
        }
        if (!formData.category_id) {
            newErrors.category_id = 'Category is required';
        }
        if (!formData.allow_purchase && !formData.allow_lease) {
            newErrors.listing_mode = 'Enable at least one option: Buy or Lease';
        }
        if (formData.allow_lease) {
            const leasePercentage = parseFloat(formData.lease_percentage);
            if (Number.isNaN(leasePercentage) || leasePercentage < 4 || leasePercentage > 10) {
                newErrors.lease_percentage = 'Lease percentage must be between 4% and 10%';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const nextValue = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: nextValue }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit({
                ...formData,
                price: parseFloat(formData.price),
                lease_percentage: parseFloat(formData.lease_percentage)
                // category_id stays as string (UUID)
            });
        }
    };

    return (
        <form className="item-form" onSubmit={handleSubmit}>
            <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="What are you selling?"
                    className={errors.title ? 'error' : ''}
                />
                {errors.title && <span className="error-message">{errors.title}</span>}
            </div>

            <div className="form-group">
                <label>Listing type *</label>
                <div className="listing-mode-options">
                    <label className="toggle-option">
                        <input
                            type="checkbox"
                            name="allow_purchase"
                            checked={formData.allow_purchase}
                            onChange={handleChange}
                        />
                        <span>Allow Buy</span>
                    </label>
                    <label className="toggle-option">
                        <input
                            type="checkbox"
                            name="allow_lease"
                            checked={formData.allow_lease}
                            onChange={handleChange}
                        />
                        <span>Allow Lease</span>
                    </label>
                </div>
                {errors.listing_mode && <span className="error-message">{errors.listing_mode}</span>}
            </div>

            {formData.allow_lease && (
                <div className="form-group">
                    <label htmlFor="lease_percentage">Lease amount (% of total price)</label>
                    <input
                        type="number"
                        id="lease_percentage"
                        name="lease_percentage"
                        value={formData.lease_percentage}
                        onChange={handleChange}
                        min="4"
                        max="10"
                        step="0.1"
                        className={errors.lease_percentage ? 'error' : ''}
                    />
                    <small className="form-helper">Recommended industry range: 4% to 10% of item price.</small>
                    {errors.lease_percentage && <span className="error-message">{errors.lease_percentage}</span>}
                </div>
            )}

            <div className="form-actions">
                <Button type="submit" variant="primary" size="large" loading={loading}>
                    {initialData ? 'Update Item' : 'Create Listing'}
                </Button>
            </div>
        </form>
    );
}

export default ItemForm;