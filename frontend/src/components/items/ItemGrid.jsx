// ItemGrid component - Grid display with loading/error states
// Supports clickable status badges for filtering

import ItemCard from './ItemCard';
import './ItemGrid.css';

function ItemGrid({ items, loading, error, emptyMessage = 'No items found', currentUser, onStatusClick, onDelete }) {
    if (loading) {
        return (
            <div className="item-grid-message">
                Loading items...
            </div>
        );
    }

    if (error) {
        return (
            <div className="item-grid-message item-grid-error">
                Error: {error}
            </div>
        );
    }

    if (!items || items.length === 0) {
        return (
            <div className="item-grid-message">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="item-grid">
            {items.map(item => (
                <ItemCard
                    key={item.id}
                    item={item}
                    currentUser={currentUser}
                    onStatusClick={onStatusClick}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}

export default ItemGrid;
