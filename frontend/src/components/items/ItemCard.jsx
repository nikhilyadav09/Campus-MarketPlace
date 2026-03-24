// ItemCard component - Enhanced with product images and modern styling

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import StatusBadge from '../common/StatusBadge';
import { ITEM_STATUS } from '../../constants/status';
import './ItemCard.css';

// Import category default images
import electronicsImg from '../../assets/category-electronics.png';
import booksImg from '../../assets/category-books.png';
import accessoriesImg from '../../assets/category-accessories.png';
import furnitureImg from '../../assets/category-furniture.png';
import sportsImg from '../../assets/category-sports.png';
import clothingImg from '../../assets/category-clothing.png';
import otherImg from '../../assets/category-other.png';

function ItemCard({ item, currentUser, onStatusClick }) {
    const navigate = useNavigate();
    const [imageLoadFailed, setImageLoadFailed] = useState(false);

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

    // Get default image for category
    const getCategoryDefaultImage = (categoryName) => {
        const categoryImages = {
            'Electronics': electronicsImg,
            'Books': booksImg,
            'Accessories': accessoriesImg,
            'Furniture': furnitureImg,
            'Sports': sportsImg,
            'Clothing': clothingImg,
            'Other': otherImg,
        };
        return categoryImages[categoryName] || null;
    };

    const isSold = item.status === ITEM_STATUS.SOLD;
    const isOwner = currentUser && item.seller_id === currentUser.id;
    const shouldShowUploadedImage = item.image_url && item.image_url.trim() !== '' && !imageLoadFailed;

    const handleCardClick = () => {
        navigate(`/items/${item.id}`);
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
                {/* Check for valid image_url (not null, not empty string, not whitespace) */}
                {shouldShowUploadedImage ? (
                    <img
                        src={item.image_url}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        onError={() => setImageLoadFailed(true)}
                    />
                ) : getCategoryDefaultImage(item.category_name) ? (
                    <img
                        src={getCategoryDefaultImage(item.category_name)}
                        alt={`${item.category_name} item`}
                        className="category-default-img"
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className={`item-card-placeholder placeholder-${getCategoryColor(item.category_name)}`}>
                        <span className="placeholder-text">
                            {item.title.length > 10 ? item.title.substring(0, 10) + '..' : item.title}
                        </span>
                    </div>
                )}

                {/* Status Badge - Overlay on image */}
                <div className="item-card-badge">
                    <StatusBadge
                        status={item.status}
                        type="item"
                        clickable={!!onStatusClick}
                        onClick={handleStatusClick}
                    />
                </div>
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
                <h3 className="item-title">{item.title}</h3>
                <div className="item-mode-row">
                    {item.allow_purchase && <span className="item-mode-pill">Buy</span>}
                    {item.allow_lease && <span className="item-mode-pill item-mode-pill--lease">Lease</span>}
                </div>

                {/* Buyer Info for Sold/Reserved items (only for seller) */}
                {isOwner && (isSold || item.status === ITEM_STATUS.RESERVED) && item.buyer_name && (
                    <div className="item-buyer-info">
                        <div className="buyer-label">👤 {isSold ? 'Sold to' : 'Reserved by'}:</div>
                        <div className="buyer-details">
                            <span className="buyer-name">{item.buyer_name}</span>
                            {item.buyer_mobile && <span className="buyer-contact">📱 {item.buyer_mobile}</span>}
                            {item.buyer_hostel && item.buyer_room && (
                                <span className="buyer-contact">🏠 {item.buyer_hostel}, Room {item.buyer_room}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Price & Seller Footer */}
                <div className="item-card-footer">
                    <span className="item-price">
                        {item.allow_lease && !item.allow_purchase
                            ? `Lease ₹${((Number(item.price) * Number(item.lease_percentage || 0)) / 100).toFixed(0)}`
                            : formatPrice(item.price)}
                    </span>
                    <span className="item-seller">
                        {item.seller_name ? (
                            isOwner ? 'Your listing' : `by ${item.seller_name}`
                        ) : (
                            isOwner && 'Your listing'
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default ItemCard;
