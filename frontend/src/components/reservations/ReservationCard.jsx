// ReservationCard component - Compact card with action buttons

import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import ReservationTimer from './ReservationTimer';
import Button from '../common/Button';
import { RESERVATION_STATUS } from '../../constants/status';
import './ReservationCard.css';

function ReservationCard({ reservation, onConfirm, onCancel, confirming, cancelling }) {
    const isActive = reservation.status === RESERVATION_STATUS.AWAITING_SELLER_CONFIRMATION;
    const isOpenReservation = [
        RESERVATION_STATUS.PENDING_INITIAL_PAYMENT,
        RESERVATION_STATUS.AWAITING_SELLER_CONFIRMATION,
        RESERVATION_STATUS.AWAITING_FINAL_PAYMENT,
    ].includes(reservation.status);
    const showTimer = isOpenReservation;
    const canShowCancel = Boolean(onCancel) && reservation.status === RESERVATION_STATUS.PENDING_INITIAL_PAYMENT;
    const canShowActions = Boolean(onConfirm) || canShowCancel;
    const isCompleted = reservation.status === RESERVATION_STATUS.COMPLETED;

    // Use full item details from reservation
    const itemTitle = reservation.item_title || 'Unknown Item';
    const itemPrice = reservation.item_price;
    const payableAmount = reservation.transaction_type === 'lease' ? reservation.lease_amount : itemPrice;
    const categoryName = reservation.category_name;
    const sellerName = reservation.seller_name || 'Seller';
    const imageUrl = reservation.item_image_url || 'https://placehold.co/80x80/e2e8f0/64748b?text=No+Image';

    return (
        <div className={`reservation-card ${showTimer ? 'reservation-card--active' : 'reservation-card--past'}`}>
            <img
                src={imageUrl}
                alt={itemTitle}
                className="reservation-card-thumb"
            />

            <div className="reservation-card-main">
                <div className="reservation-card-info">
                    <Link to={`/items/${reservation.item_id}`} className="reservation-item-title">
                        {itemTitle}
                    </Link>
                    <div className="reservation-item-meta">
                        {categoryName && <span className="reservation-category">{categoryName}</span>}
                        {payableAmount && (
                            <span className="reservation-price">
                                {reservation.transaction_type === 'lease' ? `Lease (${reservation.lease_days || '-'}d) ` : 'Buy '}
                                ₹{Number(payableAmount).toFixed(2)}
                            </span>
                        )}
                        <span className={`reservation-type-pill reservation-type-pill--${reservation.transaction_type}`}>
                            {reservation.transaction_type === 'lease' ? 'Lease' : 'Buy'}
                        </span>
                    </div>
                </div>

                <div className="reservation-card-status">
                    <StatusBadge status={reservation.status} type="reservation" />
                    {showTimer && <ReservationTimer expiresAt={reservation.expires_at} />}

                    {/* Show seller contact info when active reservation */}
                    {isActive && reservation.seller_mobile && (
                        <div className="reservation-contact-info">
                            <span className="contact-label">📞 Seller:</span>
                            <span className="contact-value">{sellerName}</span>
                            <span className="contact-value">📱 {reservation.seller_mobile}</span>
                            {reservation.seller_hostel && reservation.seller_room && (
                                <span className="contact-value">🏠 {reservation.seller_hostel}, Room {reservation.seller_room}</span>
                            )}
                        </div>
                    )}

                    {/* Show contact seller message when completed */}
                    {isCompleted && (
                        <div className="reservation-completed-message">
                            <div className="completed-icon">✅</div>
                            <div className="completed-text">
                                <strong>Order Completed!</strong>
                                <p>Contact <strong>{sellerName}</strong> to complete the transaction</p>
                                {reservation.seller_mobile && (
                                    <p className="contact-details">📱 {reservation.seller_mobile}</p>
                                )}
                                {reservation.seller_hostel && reservation.seller_room && (
                                    <p className="contact-details">🏠 {reservation.seller_hostel}, Room {reservation.seller_room}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {canShowActions && (
                <div className="reservation-card-actions">
                    {onConfirm && (
                        <Button
                            variant="primary"
                            size="small"
                            onClick={() => onConfirm(reservation.id)}
                            loading={confirming}
                            disabled={cancelling}
                        >
                            Confirm Sale
                        </Button>
                    )}
                    {canShowCancel && (
                        <Button
                            variant="danger"
                            size="small"
                            onClick={() => onCancel(reservation.id)}
                            loading={cancelling}
                            disabled={confirming}
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

export default ReservationCard;
