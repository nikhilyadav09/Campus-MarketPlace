// ItemForm component — Original Price → auto-calculated sell/lease sliders

import { useState, useMemo, useRef, useEffect } from 'react';
import Button from '../common/Button';
import './ItemForm.css';

function ItemForm({ categories = [], onSubmit, loading, initialData = null }) {

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        image_url: initialData?.image_url || '',
        original_price: initialData?.original_price || '',
        sell_price: initialData?.sell_price || '',
        lease_price_per_day: initialData?.lease_price_per_day || '',
        max_lease_days: initialData?.max_lease_days || '',
        category_id: initialData?.category_id || '',
        allow_purchase: initialData?.allow_purchase ?? true,
        allow_lease: initialData?.allow_lease ?? false,
    });

    const [errors, setErrors] = useState({});
    const [uploadingImage, setUploadingImage] = useState(false);
    const [localPreviewUrl, setLocalPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        return () => {
            if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        };
    }, [localPreviewUrl]);

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
                const lp = parseFloat(formData.lease_price_per_day);
            if (!lp || lp < priceRanges.leaseMin || lp > priceRanges.leaseMax) {
                newErrors.lease_price_per_day = `Lease rate must be between ₹${priceRanges.leaseMin} and ₹${priceRanges.leaseMax}/day`;
            }
            const maxDays = parseInt(formData.max_lease_days, 10);
            if (!maxDays || maxDays < 1 || maxDays > 365) {
                newErrors.max_lease_days = 'Max lease days must be between 1 and 365';
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
                    next.lease_price_per_day = Math.round(op * 0.055); // midpoint of 3-8%
                } else {
                    next.sell_price = '';
                    next.lease_price_per_day = '';
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

    const uploadImageFile = async (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        setUploadingImage(true);
        const prevLocal = localPreviewUrl;
        if (prevLocal) URL.revokeObjectURL(prevLocal);
        const objectUrl = URL.createObjectURL(file);
        setLocalPreviewUrl(objectUrl);

        const data = new FormData();
        data.append("file", file);

        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "campus_marketplace";
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "demo";

        data.append("upload_preset", uploadPreset);

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: "POST",
                body: data
            });

            if (!res.ok) {
                throw new Error(`Upload failed: ${res.statusText}`);
            }

            const uploadedImage = await res.json();

            if (uploadedImage.secure_url) {
                setFormData(prev => ({ ...prev, image_url: uploadedImage.secure_url }));
                setLocalPreviewUrl((url) => {
                    if (url) URL.revokeObjectURL(url);
                    return null;
                });
            }
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Failed to upload image. Please check your Cloudinary configuration or try again.");
            setLocalPreviewUrl((url) => {
                if (url) URL.revokeObjectURL(url);
                return null;
            });
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleImageInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) uploadImageFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) uploadImageFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const toggleListingMode = (field) => {
        setFormData((prev) => {
            const nextVal = !prev[field];
            const purchase = field === 'allow_purchase' ? nextVal : prev.allow_purchase;
            const lease = field === 'allow_lease' ? nextVal : prev.allow_lease;
            if (!purchase && !lease) {
                return prev;
            }
            return { ...prev, [field]: nextVal };
        });
        setErrors((prev) => ({ ...prev, listing_mode: '' }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit({
                ...formData,
                original_price: parseFloat(formData.original_price),
                sell_price: parseFloat(formData.sell_price),
                lease_price_per_day: formData.allow_lease ? parseFloat(formData.lease_price_per_day) : null,
                max_lease_days: formData.allow_lease ? parseInt(formData.max_lease_days, 10) : null,
            });
        }
    };

    const displayPreviewSrc = formData.image_url || localPreviewUrl;

    return (
        <form className="item-form" onSubmit={handleSubmit}>
            <section className="item-form-section">
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
            </section>

            <section className="item-form-section">
                <div className="form-group">
                    <label>Product Image (optional)</label>

                    {displayPreviewSrc ? (
                        <div className="image-preview-container">
                            <img
                                src={displayPreviewSrc}
                                alt="Product preview"
                                className="image-preview-thumb"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                size="small"
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, image_url: '' }));
                                    setLocalPreviewUrl((url) => {
                                        if (url) URL.revokeObjectURL(url);
                                        return null;
                                    });
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                disabled={uploadingImage}
                            >
                                Remove Image
                            </Button>
                        </div>
                    ) : (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                id="image_upload"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageInputChange}
                                disabled={uploadingImage}
                                className="item-form-file-input-hidden"
                                aria-hidden
                            />
                            <button
                                type="button"
                                className={`item-form-dropzone ${uploadingImage ? 'item-form-dropzone--busy' : ''}`}
                                onClick={() => !uploadingImage && fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                disabled={uploadingImage}
                                aria-label="Upload product image"
                            >
                                <span className="item-form-dropzone-icon" aria-hidden>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                </span>
                                <span className="item-form-dropzone-text">
                                    {uploadingImage ? 'Uploading…' : 'Drag & drop or click to upload'}
                                </span>
                            </button>
                        </>
                    )}

                    <small className="form-helper">
                        Take a photo or upload from your device.
                    </small>
                </div>
            </section>

            <section className="item-form-section item-form-section--compact">
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
                <span id="listing-type-label" className="form-group-label-text">Listing type *</span>
                <div
                    className="listing-mode-pills"
                    role="group"
                    aria-labelledby="listing-type-label"
                >
                    <button
                        type="button"
                        className={`listing-pill ${formData.allow_purchase ? 'listing-pill--on' : ''}`}
                        aria-pressed={formData.allow_purchase}
                        onClick={() => toggleListingMode('allow_purchase')}
                    >
                        Allow Buy
                    </button>
                    <button
                        type="button"
                        className={`listing-pill ${formData.allow_lease ? 'listing-pill--on' : ''}`}
                        aria-pressed={formData.allow_lease}
                        onClick={() => toggleListingMode('allow_lease')}
                    >
                        Allow Lease
                    </button>
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
                    <label htmlFor="lease_price_per_day">
                        Lease Rate/day — <span className="slider-value">₹{Number(formData.lease_price_per_day || 0)}</span>
                    </label>
                    <div className="slider-range-labels">
                        <span>₹{priceRanges.leaseMin}/day</span>
                        <span>₹{priceRanges.leaseMax}/day</span>
                    </div>
                    <input
                        type="range"
                        id="lease_price_per_day"
                        name="lease_price_per_day"
                        min={priceRanges.leaseMin}
                        max={priceRanges.leaseMax}
                        step={1}
                        value={formData.lease_price_per_day || priceRanges.leaseMin}
                        onChange={handleSliderChange}
                        className="price-slider"
                    />
                    <small className="form-helper">
                        Daily lease rate: 3%–8% of original price
                    </small>
                    {errors.lease_price_per_day && <span className="error-message">{errors.lease_price_per_day}</span>}
                </div>
            )}

            {formData.allow_lease && (
                <div className="form-group">
                    <label htmlFor="max_lease_days">Maximum Lease Days</label>
                    <input
                        type="number"
                        id="max_lease_days"
                        name="max_lease_days"
                        min={1}
                        max={365}
                        value={formData.max_lease_days}
                        onChange={handleChange}
                        placeholder="e.g. 7"
                    />
                    {errors.max_lease_days && <span className="error-message">{errors.max_lease_days}</span>}
                </div>
            )}
            </section>

            {/* Price Summary */}
            <div className="price-preview-card">
                <h4>Price Summary</h4>
                {formData.allow_purchase && priceRanges && (
                    <p><strong>Sell price:</strong> ₹{Number(formData.sell_price || 0)}</p>
                )}
                {formData.allow_lease && priceRanges && (
                    <p><strong>Lease rate:</strong> ₹{Number(formData.lease_price_per_day || 0)}/day</p>
                )}
                {!priceRanges && (
                    <div className="price-preview-placeholder">
                        <div className="price-preview-skeleton" aria-hidden>
                            <div className="price-preview-skeleton-line price-preview-skeleton-line--long" />
                            <div className="price-preview-skeleton-line price-preview-skeleton-line--short" />
                        </div>
                        <p className="price-preview-hint text-muted">Enter original price to see pricing options.</p>
                    </div>
                )}
            </div>

            <div className="form-actions">
                <Button type="submit" variant="primary" size="large" loading={loading} className="item-form-submit-btn">
                    {initialData ? 'Update Item' : 'Create Listing'}
                </Button>
            </div>
        </form>
    );
}

export default ItemForm;