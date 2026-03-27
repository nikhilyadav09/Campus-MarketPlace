// ItemDetailPage - Clear item details with unambiguous state

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useItem } from '../hooks/useItems';
import { getReservations, createReservation, cancelReservation, verifyPayment, confirmReservation } from '../api/reservations';
import { getPaymentConfig } from '../api/payments';
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
    const [transactionType, setTransactionType] = useState('purchase');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState(null);

    useEffect(() => {
        const syncReservation = async () => {
            if (!item) {
                setReservation(null);
                return;
            }

            try {
                if (item.status === ITEM_STATUS.RESERVED) {
                    const all = await getReservations({ item_id: item.id });
                    const relevant = all.find(r => [RESERVATION_STATUS.ACTIVE, RESERVATION_STATUS.PENDING_PAYMENT].includes(r.status));
                    setReservation(relevant || null);
                    return;
                }

                if (item.status === ITEM_STATUS.SOLD) {
                    const all = await getReservations({ item_id: item.id });
                    const completed = all.find(r => r.status === RESERVATION_STATUS.COMPLETED);
                    setReservation(completed || null);
                    return;
                }

                setReservation(null);
            } catch (e) {
                console.error(e);
            }
        };

        syncReservation();
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
    const getLeaseAmount = () => {
        if (!item?.allow_lease || !item?.lease_price_per_month) return null;
        return Number(item.lease_price_per_month);
    };

    const selectedPrice = (() => {
        const leaseAmount = getLeaseAmount();
        const wantsLease = transactionType === 'lease';
        if (wantsLease && leaseAmount != null) {
            return { label: 'Lease', amount: leaseAmount, suffix: '/month', key: 'lease' };
        }
        return { label: 'Buy', amount: item.sell_price, suffix: '', key: 'purchase' };
    })();



    const handleReserve = async () => {
        if (!currentUser) return;
        setActionLoading(true);
        setActionError(null);
        try {
            const paymentConfig = await getPaymentConfig();
            const razorpayKeyId = paymentConfig?.razorpay_key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
            if (!razorpayKeyId) {
                throw new Error('Payment is not configured. Razorpay key is missing.');
            }

            // 1. Create order
            const orderRes = await createReservation(item.id, transactionType);
            
            // 2. Open Razorpay Checkout
            const options = {
                key: razorpayKeyId,
                amount: orderRes.amount,
                currency: orderRes.currency,
                name: 'Campus MarketPlace',
                description: `Payment for ${item.title}`,
                order_id: orderRes.razorpay_order_id,
                handler: async function (response) {
                    try {
                        setActionLoading(true);
                        // 3. Verify payment 
                        await verifyPayment(orderRes.reservation_id, {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        navigate('/my-reservations');
                    } catch (verifyErr) {
                        setActionError(verifyErr.message || 'Payment verification failed');
                        refetch();
                    } finally {
                        setActionLoading(false);
                    }
                },
                prefill: {
                    name: currentUser.name,
                    email: currentUser.email,
                    contact: currentUser.mobile_number || ''
                },
                theme: {
                    color: '#4f46e5'
                }
            };
            
            const rzp = new window.Razorpay(options);
            
            rzp.on('payment.failed', function (response){
                setActionError(`Payment failed: ${response.error.description}`);
                setActionLoading(false);
            });
            
            rzp.open();
        } catch (err) {
            setActionError(err.message);
            setActionLoading(false);
            refetch();
        }
    };

    const handleConfirmTransaction = async () => {
        if (!currentUser || !reservation) return;
        setActionLoading(true);
        setActionError(null);
        try {
            await confirmReservation(reservation.id);
            setReservation(null);
            refetch();
        } catch (err) {
            setActionError(err.message || 'Failed to mark item as sold');
            refetch(); // Refetch to update UI state (the reservation might have expired/cancelled)
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!currentUser || !reservation) return;
        setActionLoading(true);
        setActionError(null);
        try {
            await cancelReservation(reservation.id);
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
            return { canAct: false, reason: 'Login to buy item', isLoginRequired: true };
        }

        if (item.status === ITEM_STATUS.AVAILABLE) {
            if (isOwner) {
                return { canAct: false, reason: 'You own this item. Wait for a buyer to reserve it.' };
            }
            if (transactionType === 'purchase' && !item.allow_purchase) {
                return { canAct: false, reason: 'This listing is lease-only.' };
            }
            if (transactionType === 'lease' && !item.allow_lease) {
                return { canAct: false, reason: 'This listing is buy-only.' };
            }
            return { canAct: true, action: 'reserve' };
        }

        if (item.status === ITEM_STATUS.RESERVED) {
            if (isOwner) {
                if (reservation?.status === RESERVATION_STATUS.ACTIVE) {
                    return { canAct: true, action: 'confirm-sale' };
                }
                if (reservation?.status === RESERVATION_STATUS.PENDING_PAYMENT) {
                    return { canAct: false, reason: 'Waiting for buyer to verify payment.' };
                }
                return { canAct: false, reason: 'Reservation details are not available yet.' };
            }
            if (isBuyer) {
                if ([RESERVATION_STATUS.ACTIVE, RESERVATION_STATUS.PENDING_PAYMENT].includes(reservation?.status)) {
                    return { canAct: true, action: 'cancel' };
                }
                return { canAct: false, reason: 'Your reservation cannot be cancelled right now.' };
            }
            return { canAct: false, reason: 'This item is reserved by another user.' };
        }

        return { canAct: false, reason: '' };
    };

    const actionState = getActionState();

    return (
        <div className="item-detail-page">
            <Link to="/my-items" className="back-link">← Back to items</Link>

            <div className="item-detail-card">
                <div className="item-detail-header">
                    <StatusBadge status={item.status} type="item" />
                    {isOwner && <span className="owner-label">Your listing</span>}
                </div>

                <h1 className="item-detail-title">{item.title}</h1>

                <div className="item-detail-price">
                    {selectedPrice.label}: {formatPrice(selectedPrice.amount)}
                    {selectedPrice.suffix}
                </div>
                {item.allow_lease && item.lease_price_per_month && transactionType !== 'lease' && (
                    <p className="lease-price-note">
                        Or lease for {formatPrice(getLeaseAmount())}/month
                    </p>
                )}
                {item.status === ITEM_STATUS.SOLD && item.deal_amount && (
                    <p className="deal-amount-note">
                        Final {item.transaction_type === 'lease' ? 'lease' : 'sale'} amount: {formatPrice(item.deal_amount)}
                    </p>
                )}

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
                        <ReservationTimer expiresAt={reservation.expires_at} onExpired={refetch} />
                        {isBuyer && (
                            <div className="buyer-reservation-message">
                                <div className="message-icon">⏳</div>
                                <div className="message-content">
                                    <strong>
                                        {reservation.status === RESERVATION_STATUS.PENDING_PAYMENT
                                            ? 'Payment pending'
                                            : 'Reserved by you'}
                                    </strong>
                                    <p>
                                        {reservation.status === RESERVATION_STATUS.PENDING_PAYMENT
                                            ? 'Complete payment verification to notify the seller. You can cancel anytime.'
                                            : 'Waiting for seller confirmation. You can cancel if needed.'}
                                    </p>
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
                        {item.status === ITEM_STATUS.AVAILABLE && !isOwner && (
                        <div className="transaction-toggle" role="group" aria-label="Choose buy or lease">
                            <button
                                type="button"
                                className={`toggle-btn ${transactionType === 'purchase' ? 'active' : ''} toggle-btn--buy`}
                                disabled={!item.allow_purchase}
                                onClick={() => setTransactionType('purchase')}
                            >
                                <span className="toggle-main">Buy</span>
                                <span className="toggle-sub">Pay once</span>
                            </button>
                            <button
                                type="button"
                                className={`toggle-btn ${transactionType === 'lease' ? 'active' : ''} toggle-btn--lease`}
                                disabled={!item.allow_lease}
                                onClick={() => setTransactionType('lease')}
                            >
                                <span className="toggle-main">Lease</span>
                                <span className="toggle-sub">
                                    {getLeaseAmount() != null ? `₹${Number(getLeaseAmount()).toFixed(2)}/month` : 'Set price'}
                                </span>
                            </button>
                        </div>
                    )}
                    {actionState.canAct ? (
                        <>
                            {actionState.action === 'reserve' && (
                                <Button variant="primary" size="large" onClick={handleReserve} loading={actionLoading}>
                                    {transactionType === 'lease' ? 'Reserve for Lease' : 'Reserve to Buy'}
                                </Button>
                            )}
                            {actionState.action === 'confirm-sale' && (
                                <div className="action-group">
                                    <Button
                                        variant="success"
                                        size="large"
                                        onClick={handleConfirmTransaction}
                                        loading={actionLoading}
                                    >
                                        {reservation?.transaction_type === 'lease' ? 'Confirm Lease' : 'Confirm Sale'}
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
                            {actionState.isLoginRequired ? (
                                <Link to="/login" className="login-link">
                                    {actionState.reason}
                                </Link>
                            ) : (
                                actionState.reason
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}

export default ItemDetailPage;