// UserMenu - Dropdown menu for authenticated user actions

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGoogleLoginUrl } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import './UserMenu.css';

function UserMenu({ currentUser }) {
    const [isOpen, setIsOpen] = useState(false);
    const [actionError, setActionError] = useState('');
    const menuRef = useRef(null);
    const navigate = useNavigate();
    const { logout } = useAuth();

    const getInitials = (name) => {
        if (!name) return '?';
        return String(name).split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getAvatarColor = (name) => {
        if (!name) return 'var(--accent, #3b82f6)';
        const colors = [
            '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
            '#f59e0b', '#10b981', '#06b6d4', '#6366f1',
        ];
        let hash = 0;
        for (let index = 0; index < name.length; index += 1) {
            hash = name.charCodeAt(index) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isOpen]);

    const handleMenuItemClick = (path) => {
        setActionError('');
        setIsOpen(false);
        navigate(path);
    };

    const handleGoogleLogin = () => {
        window.location.href = getGoogleLoginUrl('/');
    };

    const handleLogout = async () => {
        setActionError('');
        try {
            await logout();
            setIsOpen(false);
            navigate('/');
        } catch (error) {
            setActionError(error.message);
        }
    };

    return (
        <div className="user-menu" ref={menuRef}>
            <button
                className={`user-menu-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen((previous) => !previous)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {currentUser ? (
                    <>
                        <div
                            className="user-menu-avatar-main"
                            style={{ background: getAvatarColor(currentUser.name) }}
                        >
                            {getInitials(currentUser.name)}
                        </div>
                        <span className="user-menu-name-main">{currentUser.name}</span>
                    </>
                ) : (
                    <>
                        <div className="user-menu-avatar-main guest">👤</div>
                        <span className="user-menu-name-main">Account</span>
                    </>
                )}
                <span className="user-menu-chevron">▼</span>
            </button>

            {isOpen && <div className="user-menu-backdrop" onClick={() => setIsOpen(false)} />}

            <div className={`user-menu-dropdown ${isOpen ? 'open' : ''}`}>
                {currentUser ? (
                    <>
                        <div className="user-menu-header-mobile">
                            <div
                                className="user-menu-avatar-large"
                                style={{ background: getAvatarColor(currentUser.name) }}
                            >
                                {getInitials(currentUser.name)}
                            </div>
                            <div className="user-menu-info">
                                <div className="user-menu-name-large">{currentUser.name}</div>
                                <div className="user-menu-email">{currentUser.email}</div>
                            </div>
                        </div>

                        <div className="user-menu-section">
                            <button className="user-menu-item" onClick={() => handleMenuItemClick('/my-items')}>
                                <span className="user-menu-item-icon">📦</span>
                                <span className="user-menu-item-label">My Items</span>
                            </button>
                            <button className="user-menu-item" onClick={() => handleMenuItemClick('/my-reservations')}>
                                <span className="user-menu-item-icon">🔖</span>
                                <span className="user-menu-item-label">My Reservations</span>
                            </button>
                            <button className="user-menu-item" onClick={() => handleMenuItemClick('/items/new')}>
                                <span className="user-menu-item-icon">➕</span>
                                <span className="user-menu-item-label">List an Item</span>
                            </button>
                            {!currentUser.profile_complete && (
                                <button className="user-menu-item" onClick={() => handleMenuItemClick('/complete-profile')}>
                                    <span className="user-menu-item-icon">📝</span>
                                    <span className="user-menu-item-label">Complete Profile</span>
                                </button>
                            )}
                        </div>

                        {(currentUser.year || currentUser.hostel_name || currentUser.room_number) && (
                            <div className="user-menu-section user-menu-profile-meta">
                                <div className="demo-users-header">Student profile</div>
                                {currentUser.year && <div className="user-menu-meta-row"><span>Year</span><strong>{currentUser.year}</strong></div>}
                                {currentUser.hostel_name && <div className="user-menu-meta-row"><span>Hostel</span><strong>{currentUser.hostel_name}</strong></div>}
                                {currentUser.room_number && <div className="user-menu-meta-row"><span>Room</span><strong>{currentUser.room_number}</strong></div>}
                            </div>
                        )}

                        <div className="user-menu-section">
                            {actionError && <div className="user-menu-error">{actionError}</div>}
                            <button className="user-menu-item user-menu-item-danger" onClick={handleLogout}>
                                <span className="user-menu-item-icon">↩</span>
                                <span className="user-menu-item-label">Log Out</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="user-menu-guest-card">
                        <div className="demo-users-header">Authentication required</div>
                        <h3>Sign in with Google</h3>
                        <p>Guests can browse all listings. Use Google sign-in to post items, reserve products, and manage your account.</p>
                        <div className="user-menu-auth-actions user-menu-auth-actions--stacked">
                            <button type="button" className="user-menu-auth-link google" onClick={handleGoogleLogin}>
                                Continue with Google
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserMenu;