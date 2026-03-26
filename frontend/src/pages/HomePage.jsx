// HomePage - Campus Marketplace Landing Page
// Professional hero section with campus branding and quick actions

import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getRecentlyListed } from '../api/items';
import { getCategories } from '../api/categories';
import ItemGrid from '../components/items/ItemGrid';
import './HomePage.css';

function HomePage({ categories: propCategories }) {
    const [featuredItems, setFeaturedItems] = useState([]);
    const [categories, setCategories] = useState(propCategories || []);
    const [loading, setLoading] = useState(true);
    const [marketStats, setMarketStats] = useState({ buyOnly: 0, leaseOnly: 0, hybrid: 0 });
    useEffect(() => {
        // Use passed categories if available, otherwise fetch
        const categoriesPromise = propCategories ? Promise.resolve(propCategories) : getCategories();

        Promise.all([
            getRecentlyListed(),
            categoriesPromise
        ]).then(([items, cats]) => {
            setFeaturedItems(items);
            setCategories(cats.filter(c => c.name !== 'Other').slice(0, 6));
            const stats = items.reduce((acc, item) => {
                if (item.allow_purchase && item.allow_lease) acc.hybrid += 1;
                else if (item.allow_purchase) acc.buyOnly += 1;
                else if (item.allow_lease) acc.leaseOnly += 1;
                return acc;
            }, { buyOnly: 0, leaseOnly: 0, hybrid: 0 });
            setMarketStats(stats);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [propCategories]);

    const categoryIcons = {
        'Electronics': '💻',
        'Books': '📚',
        'Accessories': '🎒',
        'Furniture': '🪑',
        'Sports': '⚽',
        'Clothing': '👕',
        'Other': '📦'
    };

    const getHeroCategoryLink = (categoryName) => {
        const matchedCategory = categories.find((category) => category.name === categoryName);
        return matchedCategory ? `/items?category=${matchedCategory.id}` : '/items';
    };

    if (loading) {
        return (
            <div className="home-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '60vh',
                    fontSize: '1.2rem',
                    color: '#666'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                        <div>Loading Campus Marketplace...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-bg-pattern"></div>
                <div className="hero-shapes">
                    <div className="shape shape-1"></div>
                    <div className="shape shape-2"></div>
                    <div className="shape shape-3"></div>
                </div>
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <h1 className="hero-title">
                        Buy, Sell & Lease Within<br />
                        <span className="gradient-text">Your Campus</span>
                    </h1>
                    <p className="hero-subtitle">
                        The trusted marketplace for students. Buy, sell, or lease items like laptops,
                        books, furniture and more from fellow students at campus-friendly prices.
                    </p>
                    <div className="hero-actions">
                        <Link to="/items" className="btn-primary">
                            <span>Browse Items</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <Link to="/items/new" className="btn-secondary">
                            <span>Start Selling</span>
                        </Link>
                    </div>
                    <div className="hero-stats">
                        <div className="stat">
                            <span className="stat-number">500+</span>
                            <span className="stat-label">Products Added</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat">
                            <span className="stat-number">800+</span>
                            <span className="stat-label">Students Connected</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat">
                            <span className="stat-number">100+</span>
                            <span className="stat-label">Successful Trades</span>
                        </div>
                    </div>
                </div>
                <div className="hero-visual">
                    <Link
                        to={getHeroCategoryLink('Books')}
                        className="hero-card hero-card-1"
                        aria-label="Browse textbooks"
                    >
                        <span className="hero-card-emoji">📚</span>
                        <span>Textbooks</span>
                    </Link>
                    <Link
                        to={getHeroCategoryLink('Electronics')}
                        className="hero-card hero-card-2"
                        aria-label="Browse electronics"
                    >
                        <span className="hero-card-emoji">💻</span>
                        <span>Electronics</span>
                    </Link>
                    <Link
                        to={getHeroCategoryLink('Accessories')}
                        className="hero-card hero-card-3"
                        aria-label="Browse accessories"
                    >
                        <span className="hero-card-emoji">🎒</span>
                        <span>Accessories</span>
                    </Link>
                </div>
            </section>

            {/* Features Section */}
            <section className="features">
                <div className="section-header">
                    <p className="section-subtitle">Simple, safe, and designed for campus life</p>
                </div>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#gradient1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <defs>
                                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                </defs>
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                        </div>
                        <h3>Browse & Discover</h3>
                        <p>Explore items listed by students in your campus. Filter by category to find exactly what you need.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#gradient2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <defs>
                                    <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                </defs>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                        <h3>Reserve Securely</h3>
                        <p>Reserve items for 30 minutes to arrange meetup. No one else can buy it while you decide.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#gradient3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <defs>
                                    <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                </defs>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h3>Meet & Trade</h3>
                        <p>Meet on campus to complete the transaction. Safe, local, and convenient.</p>
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            <section className="categories-section">
                <div className="section-header">
                    <h2 className="section-title">Popular Categories</h2>
                </div>
                <div className="categories-grid">
                    {categories.map((category, index) => (
                        <Link
                            key={category.id}
                            to={`/items?category=${category.id}`}
                            className="category-card"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <span className="category-icon">
                                {categoryIcons[category.name] || '📦'}
                            </span>
                            <span className="category-name">{category.name}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Featured Items Section */}
            {featuredItems.length > 0 && (
                <section className="featured-section">
                    <div className="section-header">
                        <h2 className="section-title">Recently Listed</h2>
                        <Link to="/items" className="section-link">See All Items →</Link>
                    </div>
                    <div className="featured-items-container">
                        <ItemGrid items={featuredItems} />
                    </div>
                </section>
            )}

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2>Ready to declutter?</h2>
                    <p>Turn your unused items into cash. List them in seconds.</p>
                    <Link to="/items/new" className="btn-primary">
                        <span>List Your Item</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                    </Link>
                </div>
            </section>
        </div>
    );
}

export default HomePage;
