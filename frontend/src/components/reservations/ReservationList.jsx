// ReservationList component

import ReservationCard from './ReservationCard';
import './ReservationList.css';

function ReservationList({
    reservations,
    loading,
    error,
    onConfirm,
    onCancel,
    actionId,
    actionType,
    emptyMessage = 'No reservations'
}) {
    if (loading) {
        return <div className="reservation-list-message">Loading reservations...</div>;
    }

    if (error) {
        return <div className="reservation-list-message reservation-list-error">Error: {error}</div>;
    }

    if (!reservations || reservations.length === 0) {
        return <div className="reservation-list-message">{emptyMessage}</div>;
    }

    return (
        <div className="reservation-list">
            {reservations.map(reservation => (
                <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                    confirming={actionId === reservation.id && actionType === 'confirm'}
                    cancelling={actionId === reservation.id && actionType === 'cancel'}
                />
            ))}
        </div>
    );
}

export default ReservationList;
