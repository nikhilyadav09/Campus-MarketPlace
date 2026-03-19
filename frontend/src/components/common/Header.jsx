// Header component - Enhanced with campus branding

import { Link, useLocation } from 'react-router-dom';
import UserMenu from './UserMenu';
import './Header.css';

function Header({ currentUser }) {
    const location = useLocation();

    return (
        <header className="header">
            <div className="header-container">
                <Link to="/" className="logo">
                    <span className="logo-icon">🎓</span>
                    <span className="logo-text">Campus Marketplace</span>
                </Link>

                <nav className="nav">
                    <Link
                        to="/"
                        className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                    >
                        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Home
                    </Link>
                    <Link
                        to="/items"
                        className={`nav-link ${location.pathname === '/items' ? 'active' : ''}`}
                    >
                        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        Browse
                    </Link>
                    <Link
                        to="/items/new"
                        className={`nav-link ${location.pathname === '/items/new' ? 'active' : ''}`}
                    >
                        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v8M8 12h8" />
                        </svg>
                        List Item
                    </Link>
                    <Link
                        to="/my-items"
                        className={`nav-link ${location.pathname === '/my-items' ? 'active' : ''}`}
                    >
                        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 7h-3a2 2 0 01-2-2V2" />
                            <path d="M9 18a2 2 0 01-2-2V4a2 2 0 012-2h7l4 4v10a2 2 0 01-2 2H9z" />
                            <path d="M3 7.6v12.8A1.6 1.6 0 004.6 22h9.8" />
                        </svg>
                        My Items
                    </Link>
                    <Link
                        to="/my-reservations"
                        className={`nav-link ${location.pathname === '/my-reservations' ? 'active' : ''}`}
                    >
                        <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Reservations
                    </Link>
                </nav>

                <UserMenu currentUser={currentUser} />
            </div>
        </header>
    );
}

export default Header;