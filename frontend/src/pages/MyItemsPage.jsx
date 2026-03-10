// MyItemsPage - Seller view with filter tabs and two-column layout
import { useState } from 'react';
import { useItems } from '../hooks/useItems';
import ItemGrid from '../components/items/ItemGrid';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { ITEM_STATUS } from '../constants/status';
import './MyItemsPage.css';

function MyItemsPage({ currentUser }) {
    const [activeFilter, setActiveFilter] = useState('all');
    const { items, loading, error } = useItems(
        currentUser ? { seller_id: currentUser.id } : {}
    );

    if (!currentUser) {
        return (
            <div className="my-items-page">
                <div className="page-message">
                    Select a user to view their items.
                </div>
            </div>
        );
    }

    // Count items by status
    const availableItems = items.filter(i => i.status === ITEM_STATUS.AVAILABLE);
    const reservedItems = items.filter(i => i.status === ITEM_STATUS.RESERVED);
    const soldItems = items.filter(i => i.status === ITEM_STATUS.SOLD);

    // Filter items based on active filter
    const getFilteredItems = () => {
        switch (activeFilter) {
            case 'available':
                return availableItems;
            case 'reserved':
                return reservedItems;
            case 'sold':
                return soldItems;
            default:
                return items;
        }
    };

    const filteredItems = getFilteredItems();

    return (
        <div className="my-items-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">My Items</h1>
                    <p className="page-subtitle">{items.length} listings</p>
                </div>
                <Link to="/items/new">
                    <Button variant="primary">List New Item</Button>
                </Link>
            </header>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                >
                    All ({items.length})
                </button>
                <button
                    className={`filter-tab filter-tab-available ${activeFilter === 'available' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('available')}
                >
                    <span className="tab-dot available"></span>
                    Available ({availableItems.length})
                </button>
                <button
                    className={`filter-tab filter-tab-reserved ${activeFilter === 'reserved' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('reserved')}
                >
                    <span className="tab-dot reserved"></span>
                    Reserved ({reservedItems.length})
                </button>
                <button
                    className={`filter-tab filter-tab-sold ${activeFilter === 'sold' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('sold')}
                >
                    <span className="tab-dot sold"></span>
                    Sold ({soldItems.length})
                </button>
            </div>

            {loading ? (
                <div className="page-message">Loading your items...</div>
            ) : error ? (
                <div className="page-message page-error">Error: {error}</div>
            ) : items.length === 0 ? (
                <div className="page-message">
                    You haven't listed any items yet.
                    <Link to="/items/new" className="page-message-link">Create your first listing</Link>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="page-message">
                    No {activeFilter} items found.
                </div>
            ) : (
                <div className="items-grid-container">
                    <ItemGrid items={filteredItems} currentUser={currentUser} />
                </div>
            )}
        </div>
    );
}

export default MyItemsPage;
