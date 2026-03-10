// Footer component - Enhanced with campus branding

import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-content">
                    <div className="footer-brand">
                        <span className="footer-logo">🎓 Campus Marketplace</span>
                        <p className="footer-tagline">
                            The trusted marketplace for students. Buy, sell, and trade safely within your campus community.
                        </p>
                    </div>

                    <div className="footer-links">
                        <div className="footer-link-group">
                            <h4>Quick Links</h4>
                            <Link to="/items">Browse Items</Link>
                            <Link to="/items/new">List an Item</Link>
                            <Link to="/my-reservations">My Reservations</Link>
                        </div>
                        <div className="footer-link-group">
                            <h4>Support</h4>
                            <Link to="/">Home</Link>
                            <Link to="/my-items">My Items</Link>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="footer-copyright">
                        © 2026 Campus Marketplace. Built for students, by students.
                    </p>
                    <div className="footer-badges">
                        <span className="footer-badge">🔒 Secure</span>
                        <span className="footer-badge">🤝 Trusted</span>
                        <span className="footer-badge">🏫 Campus Only</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
