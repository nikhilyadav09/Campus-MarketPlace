import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatusBadge from '../components/common/StatusBadge';
import { getReservation } from '../api/reservations';
import './ReservationDetailPage.css';

function ReservationDetailPage() {
    const { id } = useParams();
    const [reservation, setReservation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    const payableAmount =
        reservation.transaction_type === 'lease' ? reservation.lease_amount : reservation.item_price;

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
                    {reservation.transaction_type === 'lease' ? '/month' : ''}
                </div>

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
                        ? 'Lease confirmations are simplified in this demo flow.'
                        : 'Sale confirmations finalize the order status.'}
                </div>
            </div>
        </div>
    );
}

export default ReservationDetailPage;

