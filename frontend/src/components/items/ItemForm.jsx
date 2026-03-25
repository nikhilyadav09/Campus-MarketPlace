// ItemForm component — Original Price → auto-calculated sell/lease sliders

import { useState, useMemo } from 'react';
import Button from '../common/Button';
import './ItemForm.css';

function ItemForm({ categories = [], onSubmit, loading, initialData = null }) {

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        image_url: initialData?.image_url || '',
        original_price: initialData?.original_price || '',
        sell_price: initialData?.sell_price || '',
        lease_price_per_month: initialData?.lease_price_per_month || '',
        category_id: initialData?.category_id || '',
        allow_purchase: initialData?.allow_purchase ?? true,
        allow_lease: initialData?.allow_lease ?? false,
    });

    const [errors, setErrors] = useState({});

    // Computed price ranges based on original_price
    const priceRanges = useMemo(() => {
        const op = parseFloat(formData.original_price);
        if (!op || op <= 0) return null;
        return {
            sellMin: Math.round(op * 0.30),
            sellMax: Math.round(op * 0.50),
            leaseMin: Math.round(op * 0.03),
            leaseMax: Math.round(op * 0.08),
        };
    }, [formData.original_price]);

    const validate = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }
        if (!formData.original_price || parseFloat(formData.original_price) <= 0) {
            newErrors.original_price = 'Original price must be greater than 0';
        }
        if (!formData.category_id) {
            newErrors.category_id = 'Category is required';
        }
        if (!formData.description.trim() || formData.description.trim().length < 20) {
            newErrors.description = 'Add at least 20 characters describing condition, specs, and usage';
        }
        if (!formData.allow_purchase && !formData.allow_lease) {
            newErrors.listing_mode = 'Enable at least one option: Buy or Lease';
        }
        if (formData.allow_purchase && priceRanges) {
            const sp = parseFloat(formData.sell_price);
            if (!sp || sp < priceRanges.sellMin || sp > priceRanges.sellMax) {
                newErrors.sell_price = `Sell price must be between ₹${priceRanges.sellMin} and ₹${priceRanges.sellMax}`;
            }
        }
        if (formData.allow_lease && priceRanges) {
            const lp = parseFloat(formData.lease_price_per_month);
            if (!lp || lp < priceRanges.leaseMin || lp > priceRanges.leaseMax) {
                newErrors.lease_price_per_month = `Lease rate must be between ₹${priceRanges.leaseMin} and ₹${priceRanges.leaseMax}/month`;
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const nextValue = type === 'checkbox' ? checked : value;
        setFormData(prev => {
            const next = { ...prev, [name]: nextValue };

            // When original_price changes, reset sliders to midpoint of new range
            if (name === 'original_price') {
                const op = parseFloat(value);
                if (op && op > 0) {
                    next.sell_price = Math.round(op * 0.40); // midpoint of 30-50%
                    next.lease_price_per_month = Math.round(op * 0.055); // midpoint of 3-8%
                } else {
                    next.sell_price = '';
                    next.lease_price_per_month = '';
                }
            }

            return next;
        });
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSliderChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: Number(value) }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit({
                ...formData,
                original_price: parseFloat(formData.original_price),
                sell_price: parseFloat(formData.sell_price),
                lease_price_per_month: formData.allow_lease ? parseFloat(formData.lease_price_per_month) : null,
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
                <label htmlFor="description">Description</label>
                <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your item..."
                    rows={4}
                    className={errors.description ? 'error' : ''}
                />
                {errors.description && <span className="error-message">{errors.description}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="image_url">Product Image URL (optional)</label>
                <input
                    type="url"
                    id="image_url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleChange}
                    placeholder="https://example.com/item-photo.jpg"
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="category_id">Category *</label>
                    <select
                        id="category_id"
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleChange}
                        className={errors.category_id ? 'error' : ''}
                    >
                        <option value="">Select a category</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    {errors.category_id && <span className="error-message">{errors.category_id}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="original_price">Original Price (₹) *</label>
                    <input
                        type="number"
                        id="original_price"
                        name="original_price"
                        value={formData.original_price}
                        onChange={handleChange}
                        placeholder="What you paid for it"
                        min="1"
                        step="1"
                        className={errors.original_price ? 'error' : ''}
                    />
                    <small className="form-helper">
                        This won't be shown publicly. Used to calculate fair sell & lease prices.
                    </small>
                    {errors.original_price && <span className="error-message">{errors.original_price}</span>}
                </div>
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

            {/* Sell Price Slider */}
            {formData.allow_purchase && priceRanges && (
                <div className="form-group slider-group">
                    <label htmlFor="sell_price">
                        Sell Price — <span className="slider-value">₹{Number(formData.sell_price || 0)}</span>
                    </label>
                    <div className="slider-range-labels">
                        <span>₹{priceRanges.sellMin}</span>
                        <span>₹{priceRanges.sellMax}</span>
                    </div>
                    <input
                        type="range"
                        id="sell_price"
                        name="sell_price"
                        min={priceRanges.sellMin}
                        max={priceRanges.sellMax}
                        step={1}
                        value={formData.sell_price || priceRanges.sellMin}
                        onChange={handleSliderChange}
                        className="price-slider"
                    />
                    <small className="form-helper">
                        Resale value: 30%–50% of original price
                    </small>
                    {errors.sell_price && <span className="error-message">{errors.sell_price}</span>}
                </div>
            )}

            {/* Lease Price Slider */}
            {formData.allow_lease && priceRanges && (
                <div className="form-group slider-group">
                    <label htmlFor="lease_price_per_month">
                        Lease Rate/month — <span className="slider-value">₹{Number(formData.lease_price_per_month || 0)}</span>
                    </label>
                    <div className="slider-range-labels">
                        <span>₹{priceRanges.leaseMin}/mo</span>
                        <span>₹{priceRanges.leaseMax}/mo</span>
                    </div>
                    <input
                        type="range"
                        id="lease_price_per_month"
                        name="lease_price_per_month"
                        min={priceRanges.leaseMin}
                        max={priceRanges.leaseMax}
                        step={1}
                        value={formData.lease_price_per_month || priceRanges.leaseMin}
                        onChange={handleSliderChange}
                        className="price-slider"
                    />
                    <small className="form-helper">
                        Monthly lease rate: 3%–8% of original price
                    </small>
                    {errors.lease_price_per_month && <span className="error-message">{errors.lease_price_per_month}</span>}
                </div>
            )}

            {/* Price Summary */}
            <div className="price-preview-card">
                <h4>Price Summary</h4>
                {formData.allow_purchase && priceRanges && (
                    <p><strong>Sell price:</strong> ₹{Number(formData.sell_price || 0)}</p>
                )}
                {formData.allow_lease && priceRanges && (
                    <p><strong>Lease rate:</strong> ₹{Number(formData.lease_price_per_month || 0)}/month</p>
                )}
                {!priceRanges && (
                    <p className="text-muted">Enter original price to see pricing options</p>
                )}
            </div>

            <div className="form-actions">
                <Button type="submit" variant="primary" size="large" loading={loading}>
                    {initialData ? 'Update Item' : 'Create Listing'}
                </Button>
            </div>
        </form>
    );
}

export default ItemForm;