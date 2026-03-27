import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../components/common/Button';
import StatusBadge from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { createFinalPaymentOrder, getReservation, verifyFinalPayment } from '../api/reservations';
import { getPaymentConfig } from '../api/payments';
import { RESERVATION_STATUS } from '../constants/status';
import './ReservationDetailPage.css';

function ReservationDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [reservation, setReservation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getReservation(id);
                setReservation(data);
            } catch (e) {
                setError(e.message || 'Failed to load reservation');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id]);

    const reloadReservation = async () => {
        const data = await getReservation(id);
        setReservation(data);
    };

    const openCheckout = async (orderRes, description, onSuccess) => {
        const paymentConfig = await getPaymentConfig();
        const razorpayKeyId = paymentConfig?.razorpay_key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKeyId) {
            throw new Error('Payment is not configured. Razorpay key is missing.');
        }
        const options = {
            key: razorpayKeyId,
            amount: orderRes.amount,
            currency: orderRes.currency,
            name: 'Campus MarketPlace',
            description,
            order_id: orderRes.razorpay_order_id,
            handler: onSuccess,
            prefill: {
                name: user?.name || '',
                email: user?.email || '',
                contact: user?.mobile_number || ''
            },
            theme: { color: '#4f46e5' }
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
            setActionError(`Payment failed: ${response.error.description}`);
            setActionLoading(false);
        });
        rzp.open();
    };

    const handlePayRemaining = async () => {
        if (!reservation) return;
        setActionError(null);
        setActionLoading(true);
        try {
            const finalOrder = await createFinalPaymentOrder(reservation.id);
            await openCheckout(finalOrder, `Final payment for ${reservation.item_title}`, async (response) => {
                try {
                    await verifyFinalPayment(reservation.id, {
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature
                    });
                    await reloadReservation();
                } catch (verifyErr) {
                    setActionError(verifyErr.message || 'Final payment verification failed');
                } finally {
                    setActionLoading(false);
                }
            });
        } catch (payErr) {
            setActionError(payErr.message || 'Failed to start final payment');
            setActionLoading(false);
        }
    };

    if (loading) return <div className="page-message">Loading order...</div>;
    if (error)
        return (
            <div className="page-message page-error">
                <p>Error: {error}</p>
                <Link to="/my-reservations">Back to reservations</Link>
            </div>
        );

    if (!reservation)
        return (
            <div className="page-message">
                <p>Order not found</p>
                <Link to="/my-reservations">Back to reservations</Link>
            </div>
        );

    const formatPrice = (price) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(price);

    const payableAmount = reservation.transaction_type === 'lease' ? reservation.lease_amount : reservation.item_price;
    const canPayFinal =
        reservation.status === RESERVATION_STATUS.AWAITING_FINAL_PAYMENT &&
        Number(reservation.final_amount_due || 0) > 0 &&
        user &&
        String(reservation.buyer_id) === String(user.id);

    return (
        <div className="reservation-detail-page">
            <Link to={`/items/${reservation.item_id}`} className="back-link">
                ← Back to item
            </Link>

            <div className="reservation-detail-card">
                <div className="reservation-detail-header">
                    <StatusBadge status={reservation.status} type="reservation" />
                </div>

                <h1 className="reservation-detail-title">{reservation.item_title}</h1>

                <div className="reservation-detail-amount">
                    {reservation.transaction_type === 'lease' ? 'Lease' : 'Buy'}:{' '}
                    {payableAmount != null ? formatPrice(payableAmount) : '-'}
                    {reservation.transaction_type === 'lease' ? ` (${reservation.lease_days || 1} day${Number(reservation.lease_days || 1) > 1 ? 's' : ''})` : ''}
                </div>
                <div className="reservation-detail-amount">
                    Initial paid: {formatPrice(Number(reservation.initial_amount || 0))}
                </div>
                <div className="reservation-detail-amount">
                    Remaining due: {formatPrice(Number(reservation.final_amount_due || 0))}
                </div>
                {canPayFinal && (
                    <div className="reservation-detail-amount">
                        <Button variant="primary" size="large" onClick={handlePayRemaining} loading={actionLoading}>
                            Pay Remaining Amount
                        </Button>
                    </div>
                )}
                {actionError && <div className="page-error">{actionError}</div>}

                <div className="reservation-detail-meta">
                    <div className="meta-item">
                        <span className="meta-label">Buyer:</span>
                        <span className="meta-value">{reservation.buyer_name}</span>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Seller:</span>
                        <span className="meta-value">{reservation.seller_name}</span>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Reserved:</span>
                        <span className="meta-value">
                            {reservation.created_at ? new Date(reservation.created_at).toLocaleString() : '-'}
                        </span>
                    </div>
                    {reservation.expires_at && (
                        <div className="meta-item">
                            <span className="meta-label">Expires:</span>
                            <span className="meta-value">{new Date(reservation.expires_at).toLocaleString()}</span>
                        </div>
                    )}
                </div>

                <div className="reservation-detail-footnote">
                    {reservation.transaction_type === 'lease'
                        ? 'Lease flow: 1 day upfront, remaining days after seller confirmation.'
                        : 'Purchase flow: 2% upfront, 98% after seller confirmation.'}
                </div>
            </div>
        </div>
    );
}

export default ReservationDetailPage;

