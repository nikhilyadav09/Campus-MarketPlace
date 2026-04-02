import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } from '../../api/notifications';
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
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [currentUser?.id]);

    // Handle auto-read when opening dropdown
    useEffect(() => {
        if (isOpen && unreadCount > 0) {
            const clearNotifications = async () => {
                try {
                    // Mark all as read on backend
                    await markAllNotificationsRead();
                    // Update local state immediately
                    setUnreadCount(0);
                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                } catch (e) {
                    console.error('Failed to mark all as read:', e);
                }
            };
            clearNotifications();
        }
    }, [isOpen]);

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
        if (!n.is_read) {
            try {
                // Should already be handled by isOpen effect, but for safety:
                await markNotificationRead(n.id);
            } catch (e) {
                console.error(e);
            }
        }

        const targetReservationId = n.reservation_id;
        setIsOpen(false);

        if (targetReservationId) navigate(`/reservations/${targetReservationId}`);
        else if (n.item_id) navigate(`/items/${n.item_id}`);
    };

    const handleMarkAllRead = async (e) => {
        e.stopPropagation();
        try {
            await markAllNotificationsRead();
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (e) {
            console.error(e);
        }
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
                <div className="notif-bell-icon-container">
                    <span className="notif-bell-icon">🔔</span>
                    {unreadCount > 0 && <span className="notif-bell-dot" />}
                </div>
            </button>

            {isOpen && (
                <div className="notif-dropdown" role="dialog" aria-label="Notification list">
                    <div className="notif-dropdown-header">
                        <div className="notif-title-group">
                            <span className="notif-title">Notifications</span>
                            {unreadCount > 0 && <span className="notif-unread-count">{unreadCount}</span>}
                        </div>
                        <div className="notif-header-actions">
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    className="mark-all-read-btn"
                                    onClick={handleMarkAllRead}
                                >
                                    Mark all as read
                                </button>
                            )}
                            <button type="button" className="notif-close" onClick={() => setIsOpen(false)} aria-label="Close">
                                ✕
                            </button>
                        </div>
                    </div>

                    <div className="notif-dropdown-body">
                        {loading && notifications.length === 0 ? (
                            <div className="notif-empty">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="notif-empty">No notifications yet</div>
                        ) : (
                            <div className="notif-list">
                                {notifications.map((n) => (
                                    <button
                                        key={n.id}
                                        type="button"
                                        className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                                        onClick={() => handleClickNotification(n)}
                                    >
                                        <div className="notif-item-content">
                                            <div className="notif-item-message">{n.message}</div>
                                            <div className="notif-item-meta">
                                                {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                                            </div>
                                        </div>
                                        {!n.is_read && <div className="unread-indicator" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;

