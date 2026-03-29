import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import './Header.css';

function Header({ currentUser }) {
    const location = useLocation();
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    useEffect(() => {
        setIsMobileNavOpen(false);
    }, [location.pathname]);

    return (
        <header className="header">
            <div className="header-container">
                <Link to="/" className="logo" aria-label="Campus Marketplace home">
                    <div className="logo-text-wrapper">
                        <div className="logo-circle">
                        {/* Base layer */}
                        <svg width="52" height="52" viewBox="0 0 52 52" style={{position:'absolute'}}>
                            <defs>
                            <linearGradient id="a2n-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0d0a2a"/>
                                <stop offset="100%" stopColor="#1a0533"/>
                            </linearGradient>
                            <linearGradient id="a2n-orbit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0"/>
                                <stop offset="50%" stopColor="#a78bfa"/>
                                <stop offset="100%" stopColor="#f472b6" stopOpacity="0"/>
                            </linearGradient>
                            </defs>
                            <circle cx="26" cy="26" r="24" fill="url(#a2n-bg)" stroke="rgba(139,92,246,0.3)" strokeWidth="0.5"/>
                            <circle cx="26" cy="26" r="18" fill="none" stroke="rgba(167,139,250,0.1)" strokeWidth="0.5"/>
                            {/* A - Georgia italic, blue */}
                            <text x="9" y="32" fontFamily="Georgia,serif" fontSize="15" fontWeight="700" fontStyle="italic" fill="#38bdf8">A</text>
                            {/* 2 - Courier mono, white */}
                            <text x="21.5" y="32" fontFamily="Courier New,monospace" fontSize="15" fontWeight="700" fill="#e2e8f0">2</text>
                            {/* N - Impact, pink */}
                            <text x="33" y="32" fontFamily="Impact,sans-serif" fontSize="15" fontWeight="900" fill="#f472b6">N</text>
                            <line x1="21" y1="16" x2="21" y2="36" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
                            <line x1="33" y1="16" x2="33" y2="36" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
                        </svg>

                        {/* Clockwise orbit + blue dot */}
                        <svg width="52" height="52" viewBox="0 0 52 52" style={{position:'absolute'}} className="logo-ring1">
                            <circle cx="26" cy="26" r="24" fill="none" stroke="url(#a2n-orbit-grad)" strokeWidth="1.8" strokeDasharray="38 112"/>
                            <circle cx="26" cy="2" r="3.5" fill="#60a5fa" className="logo-glow-dot"/>
                            <circle cx="26" cy="2" r="1.5" fill="white"/>
                        </svg>

                        {/* Counter-clockwise dashed + pink dot */}
                        <svg width="52" height="52" viewBox="0 0 52 52" style={{position:'absolute'}} className="logo-ring2">
                            <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(236,72,153,0.2)" strokeWidth="0.8" strokeDasharray="4 8"/>
                            <circle cx="26" cy="6" r="2.2" fill="#ec4899" opacity="0.8"/>
                        </svg>
                        </div>
                        <div className="logo-text-block">
                            <span className="logo-campus">CAMPUS</span>
                            <span className="logo-marketplace">MARKETPLACE</span>
                        </div>
                    </div>
                </Link>

                <nav className={`nav ${isMobileNavOpen ? 'open' : ''}`}>
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

                <div className="header-right">
                    <button
                        type="button"
                        className={`nav-toggle ${isMobileNavOpen ? 'active' : ''}`}
                        aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-expanded={isMobileNavOpen}
                        onClick={() => setIsMobileNavOpen((prev) => !prev)}
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    <NotificationBell currentUser={currentUser} />
                    <UserMenu currentUser={currentUser} />
                </div>
            </div>

            {isMobileNavOpen && (
                <button
                    type="button"
                    className="mobile-nav-backdrop"
                    aria-label="Close navigation"
                    onClick={() => setIsMobileNavOpen(false)}
                />
            )}
        </header>
    );
}

export default Header;