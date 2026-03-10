// ItemDetailPage - Clear item details with unambiguous state

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useItem } from '../hooks/useItems';
import { getReservations, createReservation, cancelReservation } from '../api/reservations';
import { markItemSold } from '../api/items';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import ReservationTimer from '../components/reservations/ReservationTimer';
import { ITEM_STATUS, RESERVATION_STATUS } from '../constants/status';
import './ItemDetailPage.css';

function ItemDetailPage({ currentUser }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { item, loading, error, refetch } = useItem(id);
    const [reservation, setReservation] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState(null);

    useEffect(() => {
        if (item && item.status === ITEM_STATUS.RESERVED) {
            getReservations({ item_id: item.id, status: RESERVATION_STATUS.ACTIVE })
                .then(reservations => {
                    if (reservations.length > 0) {
                        setReservation(reservations[0]);
                    }
                })
                .catch(console.error);
        } else {
            setReservation(null);
        }
    }, [item]);

    if (loading) {
        return <div className="page-message">Loading item...</div>;
    }

    if (error) {
        return (
            <div className="page-message page-error">
                <p>Error: {error}</p>
                <Link to="/items">Back to items</Link>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="page-message">
                <p>Item not found</p>
                <Link to="/items">Back to items</Link>
            </div>
        );
    }

    const isOwner = currentUser && item.seller_id === currentUser.id;
    const isBuyer = reservation && currentUser && reservation.buyer_id === currentUser.id;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(price);
    };


    const handleReserve = async () => {
        if (!currentUser) return;
        setActionLoading(true);
        setActionError(null);
        try {
            await createReservation(item.id, currentUser.id);
            navigate('/my-reservations');
        } catch (err) {
            setActionError(err.message);
            // Only refetch on error to show current state if something changed
            refetch();
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkSold = async () => {
        if (!currentUser) return;
        setActionLoading(true);
        setActionError(null);
        try {
            await markItemSold(item.id, currentUser.id);
            refetch();
        } catch (err) {
            setActionError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!currentUser || !reservation) return;
        setActionLoading(true);
        setActionError(null);
        try {
            await cancelReservation(reservation.id, currentUser.id);
            setReservation(null);
            refetch();
        } catch (err) {
            setActionError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Determine what actions are available and why
    const getActionState = () => {
        if (item.status === ITEM_STATUS.SOLD) {
            return { canAct: false, reason: 'This item has been sold.' };
        }

        if (!currentUser) {
            return { canAct: false, reason: 'Select a user to take action.' };
        }

        if (item.status === ITEM_STATUS.AVAILABLE) {
            if (isOwner) {
                return { canAct: false, reason: 'You own this item. Wait for a buyer to reserve it.' };
            }
            return { canAct: true, action: 'reserve' };
        }

        if (item.status === ITEM_STATUS.RESERVED) {
            if (isOwner) {
                return { canAct: true, action: 'confirm-sale' };
            }
            if (isBuyer) {
                return { canAct: true, action: 'cancel' };
            }
            return { canAct: false, reason: 'This item is reserved by another user.' };
        }

        return { canAct: false, reason: '' };
    };

    const actionState = getActionState();

    return (
        <div className="item-detail-page">
            <Link to="/items" className="back-link">← Back to items</Link>

            <div className="item-detail-card">
                <div className="item-detail-header">
                    <StatusBadge status={item.status} type="item" />
                    {isOwner && <span className="owner-label">Your listing</span>}
                </div>

                <h1 className="item-detail-title">{item.title}</h1>

                <div className="item-detail-price">{formatPrice(item.price)}</div>

                {item.description && (
                    <div className="item-detail-section">
                        <h3>Description</h3>
                        <p>{item.description}</p>
                    </div>
                )}

                <div className="item-detail-meta">
                    <div className="meta-item">
                        <span className="meta-label">Seller:</span>
                        <span className="meta-value"> {item.seller_name}</span>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Listed:</span>
                        <span className="meta-value">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="meta-item">
                        <span className="meta-label">Category:</span>
                        <span className="meta-value">{item.category_name}</span>
                    </div>

                </div>

                {/* Reservation state - only show when reserved */}
                {item.status === ITEM_STATUS.RESERVED && reservation && (
                    <div className="reservation-info">
                        <ReservationTimer expiresAt={reservation.expires_at} />
                        {isBuyer && (
                            <div className="buyer-reservation-message">
                                <div className="message-icon">⏳</div>
                                <div className="message-content">
                                    <strong>Reserved by you</strong>
                                    <p>Waiting for seller confirmation. You can cancel if needed.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Always Show Seller Contact Info for potential buyers */}
                {!isOwner && (
                    <div className="contact-info-card">
                        <h4>📞 Seller Contact</h4>
                        <div className="contact-details">
                            <p><strong>{item.seller_name}</strong></p>
                            {item.seller_mobile && <p>📱 {item.seller_mobile}</p>}
                            {item.seller_hostel && item.seller_room && (
                                <p>🏠 {item.seller_hostel}, Room {item.seller_room}</p>
                            )}
                            <p className="contact-hint text-sm text-gray-500 mt-2">
                                Contact the seller to arrange meetup or ask questions.
                            </p>
                        </div>
                    </div>
                )}
                {/* Show buyer contact info to seller when their item is reserved */}
                {isOwner && reservation && (
                    <div className="contact-info-card">
                        <h4>📞 Buyer Contact</h4>
                        <div className="contact-details">
                            <p><strong>{reservation.buyer_name}</strong></p>
                            {reservation.buyer_mobile && <p>📱 {reservation.buyer_mobile}</p>}
                            {reservation.buyer_hostel && reservation.buyer_room && (
                                <p>🏠 {reservation.buyer_hostel}, Room {reservation.buyer_room}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Show success message when item is sold and buyer was the one who reserved */}
                {item.status === ITEM_STATUS.SOLD && reservation?.buyer_id === currentUser?.id && (
                    <div className="sale-confirmed-message">
                        <div className="message-icon">✅</div>
                        <div className="message-content">
                            <strong>Order Confirmed!</strong>
                            <p>Contact seller <strong>{item.seller_name}</strong> ({item.seller_email}) to complete the transaction.</p>
                        </div>
                    </div>
                )}

                {/* Show buyer contact info to seller when item is SOLD */}
                {isOwner && item.status === ITEM_STATUS.SOLD && item.buyer_name && (
                    <div className="contact-info-card">
                        <h4>✅ Sold to</h4>
                        <div className="contact-details">
                            <p><strong>{item.buyer_name}</strong></p>
                            {item.buyer_mobile && <p>📱 {item.buyer_mobile}</p>}
                            {item.buyer_hostel && item.buyer_room && (
                                <p>🏠 {item.buyer_hostel}, Room {item.buyer_room}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Action error */}
                {actionError && (
                    <div className="action-error">{actionError}</div>
                )}

                {/* Action section - always visible */}
                <div className="item-actions">
                    {actionState.canAct ? (
                        <>
                            {actionState.action === 'reserve' && (
                                <Button variant="primary" size="large" onClick={handleReserve} loading={actionLoading}>
                                    Reserve Item
                                </Button>
                            )}
                            {actionState.action === 'confirm-sale' && (
                                <div className="action-group">
                                    <Button variant="success" size="large" onClick={handleMarkSold} loading={actionLoading}>
                                        Confirm Sale
                                    </Button>
                                    <Button variant="danger" size="large" onClick={handleCancel} loading={actionLoading}>
                                        Cancel Reservation
                                    </Button>
                                </div>
                            )}
                            {actionState.action === 'cancel' && (
                                <Button variant="danger" size="large" onClick={handleCancel} loading={actionLoading}>
                                    Cancel My Reservation
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="action-blocked">
                            {actionState.reason}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}

export default ItemDetailPage;
