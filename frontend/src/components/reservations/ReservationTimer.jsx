// ReservationTimer component - Clear countdown display

import { useState, useEffect, useRef } from 'react';
import './ReservationTimer.css';

function ReservationTimer({ expiresAt, onExpired }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);
    const hasFiredRef = useRef(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const expiry = new Date(expiresAt).getTime();
            const difference = expiry - now;

            if (difference <= 0) {
                setIsExpired(true);
                setTimeLeft('Expired');
                if (!hasFiredRef.current) {
                    hasFiredRef.current = true;
                    if (onExpired) onExpired();
                }
                return;
            }

            const hours = Math.floor(difference / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m remaining`);
            } else if (minutes > 0) {
                setTimeLeft(`${minutes}m ${seconds}s remaining`);
            } else {
                setTimeLeft(`${seconds}s remaining`);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [expiresAt]);

    return (
        <div className={`reservation-timer ${isExpired ? 'expired' : ''}`}>
            <span className="timer-label">Reservation:</span>
            <span className="timer-value">{timeLeft}</span>
        </div>
    );
}

export default ReservationTimer;
