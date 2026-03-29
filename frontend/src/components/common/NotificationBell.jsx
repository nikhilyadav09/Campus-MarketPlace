import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, getUnreadNotificationCount, markNotificationRead } from '../../api/notifications';
import './NotificationBell.css';

function NotificationBell({ currentUser }) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);

    const load = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const [countRes, listRes] = await Promise.all([
                getUnreadNotificationCount(),
                getNotifications({ limit: 8 }),
            ]);
            setUnreadCount(Number(countRes?.unread_count || 0));
            setNotifications(Array.isArray(listRes) ? listRes : []);
        } catch (e) {
            // Avoid breaking the header if notifications fail.
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]);

    // Close dropdown when clicking outside the component
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClickNotification = async (n) => {
        try {
            await markNotificationRead(n.id);
        } catch (e) {
            console.error(e);
        }

        const targetReservationId = n.reservation_id;
        setIsOpen(false);

        if (targetReservationId) navigate(`/reservations/${targetReservationId}`);
        else navigate(`/items/${n.item_id}`);
    };

    if (!currentUser) return null;

    return (
        <div className="notif-bell-wrap" ref={wrapperRef}>
            <button
                type="button"
                className={`notif-bell ${isOpen ? 'open' : ''}`}
                aria-label="Notifications"
                onClick={() => setIsOpen((v) => !v)}
            >
                <span className="notif-bell-icon">🔔</span>
                {unreadCount > 0 && <span className="notif-bell-dot" aria-hidden="true" />}
            </button>

            {isOpen && (
                <div className="notif-dropdown" role="dialog" aria-label="Notification list">
                    <div className="notif-dropdown-header">
                        <div className="notif-title">
                            Notifications
                            {unreadCount > 0 && <span className="notif-unread">({unreadCount} unread)</span>}
                        </div>
                        <button type="button" className="notif-close" onClick={() => setIsOpen(false)} aria-label="Close">
                            ✕
                        </button>
                    </div>

                    <div className="notif-dropdown-body">
                        {loading ? (
                            <div className="notif-empty">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="notif-empty">No notifications</div>
                        ) : (
                            notifications.map((n) => (
                                <button
                                    key={n.id}
                                    type="button"
                                    className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                                    onClick={() => handleClickNotification(n)}
                                >
                                    <div className="notif-item-message">{n.message}</div>
                                    <div className="notif-item-meta">
                                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;

