// UserMenu - Dropdown menu for user profile and actions

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserMenu.css';

function UserMenu({ currentUser, users = [], onUserChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Get user initials for avatar
    const getInitials = (name) => {
        if (!name) return '?';
        return String(name).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Generate consistent color from name
    const getAvatarColor = (name) => {
        if (!name) return 'var(--accent, #3b82f6)';
        const colors = [
            '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
            '#f59e0b', '#10b981', '#06b6d4', '#6366f1'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    // Close menu when clicking outside
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

    // Handle menu item click
    const handleMenuItemClick = (path) => {
        setIsOpen(false);
        navigate(path);
    };

    // Handle demo user selection
    const handleUserSelect = (user, e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        onUserChange(user);
        setIsOpen(false);
        navigate('/');
    };

    return (
        <div className="user-menu" ref={menuRef}>
            <button
                className={`user-menu-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
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
                        <div className="user-menu-avatar-main guest">
                            👤
                        </div>
                        <span className="user-menu-name-main">Log In</span>
                    </>
                )}
                <span className="user-menu-chevron">▼</span>
            </button>

            {/* Backdrop for mobile or just to ensure clean closing */}
            {isOpen && <div className="user-menu-backdrop" onClick={() => setIsOpen(false)} />}

            <div className={`user-menu-dropdown ${isOpen ? 'open' : ''}`}>

                {/* Header Section inside dropdown (Mobile friendly) */}
                {currentUser && (
                    <div className="user-menu-header-mobile">
                        <div
                            className="user-menu-avatar-large"
                            style={{ background: getAvatarColor(currentUser.name) }}
                        >
                            {getInitials(currentUser.name)}
                        </div>
                        <div className="user-menu-info">
                            <div className="user-menu-name-large">{currentUser.name}</div>
                            <div className="user-menu-email">{currentUser.email || 'marketplace@campus.edu'}</div>
                        </div>
                    </div>
                )}

                {/* Navigation Section - Only if logged in */}
                {currentUser && (
                    <div className="user-menu-section">
                        <button
                            className="user-menu-item"
                            onClick={() => handleMenuItemClick('/my-items')}
                        >
                            <span className="user-menu-item-icon">📦</span>
                            <span className="user-menu-item-label">My Items</span>
                        </button>
                        <button
                            className="user-menu-item"
                            onClick={() => handleMenuItemClick('/my-reservations')}
                        >
                            <span className="user-menu-item-icon">🔖</span>
                            <span className="user-menu-item-label">My Reservations</span>
                        </button>
                    </div>
                )}

                {/* Demo Users Section */}
                {users && users.length > 0 && (
                    <div className="user-menu-section">
                        <div className="demo-users-header">
                            {currentUser ? 'Switch Profile' : 'Select User'}
                        </div>
                        <div className="demo-users-list">
                            {users.map(user => (
                                <button
                                    key={user.id}
                                    className={`demo-user-item ${currentUser?.id === user.id ? 'active' : ''}`}
                                    onClick={(e) => handleUserSelect(user, e)}
                                >
                                    <div
                                        className="demo-user-avatar"
                                        style={{
                                            background: currentUser?.id === user.id ? 'var(--accent)' : 'transparent',
                                            borderColor: currentUser?.id === user.id ? 'var(--accent)' : getAvatarColor(user.name),
                                            color: currentUser?.id === user.id ? 'white' : getAvatarColor(user.name)
                                        }}
                                    >
                                        {currentUser?.id === user.id ? '✓' : getInitials(user.name)}
                                    </div>
                                    <div className="demo-user-info">
                                        <div className="demo-user-name">{user.name}</div>
                                        <div className="demo-user-email">{user.email}</div>
                                    </div>
                                    {currentUser?.id === user.id && (
                                        <div className="active-indicator"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserMenu;
