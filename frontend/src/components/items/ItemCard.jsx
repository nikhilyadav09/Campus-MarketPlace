// ItemCard component - Enhanced with product images and modern styling

import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import StatusBadge from '../common/StatusBadge';
import { ITEM_STATUS } from '../../constants/status';
import './ItemCard.css';

function ItemCard({ item, currentUser, onStatusClick, onDelete }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [imageLoadFailed, setImageLoadFailed] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    const getCategoryColor = (categoryName) => {
        const colors = {
            'Electronics': 'blue',
            'Books': 'amber',
            'Accessories': 'purple',
            'Furniture': 'emerald',
            'Sports': 'rose',
            'Clothing': 'pink',
            'Other': 'slate'
        };
        return colors[categoryName] || 'indigo';
    };

    const isSold = item.status === ITEM_STATUS.SOLD;
    const isOwner = currentUser && item.seller_id === currentUser.id;
    const shouldShowUploadedImage = item.image_url && item.image_url.trim() !== '' && !imageLoadFailed;

    const handleCardClick = () => {
        // Pass current path (including filters) to the detail page
        navigate(`/items/${item.id}`, { state: { from: location.pathname + location.search } });
    };

    const handleStatusClick = (status) => {
        if (onStatusClick) {
            onStatusClick(status);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardClick();
        }
    };

    return (
        <div
            className={`item-card ${isSold ? 'item-card-sold' : ''}`}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`View details for ${item.title}`}
        >
            {/* Image Section */}
            <div className="item-card-image">
                {shouldShowUploadedImage ? (
                    <img
                        src={item.image_url}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        onError={() => setImageLoadFailed(true)}
                    />
                ) : (
                    <div className="item-card-placeholder">
                        <span className="placeholder-icon">📦</span>
                        <span className="placeholder-label">No image</span>
                    </div>
                )}

                {/* Status Badge */}
                {isSold ? (
                    <div className="item-card-ribbon-sold" aria-hidden>
                        <span>SOLD</span>
                    </div>
                ) : (
                    <div className="item-card-badge">
                        <StatusBadge
                            status={item.status}
                            type="item"
                            clickable={!!onStatusClick}
                            onClick={handleStatusClick}
                        />
                    </div>
                )}
                {/* Modern You/Owner badge overlay */}
                {isOwner && (
                    <div className="item-card-owner-badge" aria-label="Your listing">
                        You
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="item-card-content">
                {/* Category Tag */}
                {item.category_name && (
                    <span className={`item-category category-${getCategoryColor(item.category_name)}`}>
                        {item.category_name}
                    </span>
                )}

                {/* Title */}
                {/* Title */}
                <h3 className="item-title">{item.title}</h3>
                {item.description && (
                    <p className="item-description">{item.description}</p>
                )}
                {/* Mode tags removed as per user request (redundant with bottom pricing) */}
                {isOwner && (isSold || item.status === ITEM_STATUS.RESERVED) && item.buyer_name && (
                    <div className="item-buyer-block">
                        <div className="buyer-block-header">
                            <span className="buyer-icon">{isSold ? '🎉' : '⏳'}</span>
                            <span className="buyer-status-text">{isSold ? 'Sold to' : 'Reserved by'}</span>
                        </div>
                        <div className="buyer-block-details">
                            <strong className="buyer-name">{item.buyer_name}</strong>
                            <div className="buyer-contact-row">
                                {item.buyer_mobile && <span className="buyer-contact-item">📱 {item.buyer_mobile}</span>}
                                {item.buyer_hostel && item.buyer_room && (
                                    <span className="buyer-contact-item">🏠 {item.buyer_hostel}, R-{item.buyer_room}</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Unified Pricing Block - Stick to Bottom */}
                <div className="item-card-pricing">
                    <div className="price-main">
                        <span className="price-label">Buy</span>
                        <span className="price-value">{formatPrice(item.sell_price)}</span>
                    </div>
                    {item.allow_lease && item.lease_price_per_day && (
                        <div className="price-sub">
                            <span className="price-label">Lease</span>
                            <span className="price-value">₹{Number(item.lease_price_per_day).toFixed(0)}/day</span>
                        </div>
                    )}
                </div>

                {/* Footer for Deal info when sold */}
                {isOwner && item.status === ITEM_STATUS.SOLD && item.deal_amount && (
                    <div className="item-card-deal-footer">
                        <span className="deal-label">Closed deal:</span>
                        <span className="deal-value">{formatPrice(item.deal_amount)}</span>
                    </div>
                )}
            </div>

            {/* Delete button - only shown in My Items (when onDelete prop is passed) */}
            {onDelete && isOwner && (
                <div className="item-card-delete-bar" onClick={e => e.stopPropagation()}>
                    {confirmDelete ? (
                        <div className="item-card-delete-confirm">
                            <span className="delete-confirm-text">Delete this listing?</span>
                            <button
                                className="delete-confirm-yes"
                                onClick={() => onDelete(item.id)}
                            >
                                Yes, Delete
                            </button>
                            <button
                                className="delete-confirm-no"
                                onClick={() => setConfirmDelete(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            className="item-card-delete-btn"
                            onClick={() => setConfirmDelete(true)}
                            aria-label={`Delete ${item.title}`}
                        >
                            🗑️ Delete item
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default ItemCard;
