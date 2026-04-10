// Footer component - Enhanced with campus branding

import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-content">
                    <div className="footer-brand">
                        <span className="footer-logo">🎓 A2N Campus Marketplace</span>
                        <p className="footer-tagline">
                            The trusted campus marketplace for students. Buy, sell, or lease items securely with Razorpay-powered payments and real-time notifications.
                        </p>
                    </div>

                    <div className="footer-links">
                        <div className="footer-link-group">
                            <h4>Marketplace</h4>
                            <Link to="/items">Browse Items</Link>
                            <Link to="/items/new">List an Item</Link>
                            <Link to="/my-reservations">My Reservations</Link>
                        </div>
                        <div className="footer-link-group">
                            <h4>My Account</h4>
                            <Link to="/my-items">My Listings</Link>
                            <Link to="/">Home</Link>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="footer-copyright">
                        © {new Date().getFullYear()} A2N Campus Marketplace.<br />
                        Built with ❤️ for students, by students.
                    </p>
                    <div className="footer-badges">
                        <span className="footer-badge">🔒 Secure Payments</span>
                        <span className="footer-badge">🤝 Verified Students</span>
                        <span className="footer-badge">🏫 Campus Only</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
