// ItemListPage - PRIMARY SCREEN: Browse Items
// Items visible immediately above the fold
// Status badges on cards are clickable to filter

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useItems } from '../hooks/useItems';
import ItemGrid from '../components/items/ItemGrid';
import CategoryFilter from '../components/categories/CategoryFilter';
import { ITEM_STATUS } from '../constants/status';
import './ItemListPage.css';

function ItemListPage({ currentUser, categories = [] }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedCategory, setSelectedCategory] = useState(
        searchParams.get('category') || null
    );
    const [statusFilter, setStatusFilter] = useState('available'); // Default to available

    // Only fetch when currentUser is available (prevents initial call without exclude_seller_id)
    const shouldFetch = currentUser !== null;

    // Build filters - exclude current user's items via backend
    const filters = shouldFetch ? {
        ...(selectedCategory && { category_id: selectedCategory }),
        ...(statusFilter && { status: statusFilter }),
        exclude_seller_id: currentUser.id
    } : null;

    const { items, loading, error, refetch } = useItems(filters);
    const categoriesLoading = categories.length === 0;

    const handleCategoryChange = (categoryId) => {
        setSelectedCategory(categoryId);
        if (categoryId) {
            setSearchParams({ category: categoryId });
        } else {
            setSearchParams({});
        }
    };

    // Handle status badge click from cards
    const handleStatusClick = (status) => {
        setStatusFilter(status);
    };

    return (
        <div className="item-list-page">
            <div className="filters-bar">
                <div className="filter-group">
                    <span className="filter-label">Category:</span>
                    <CategoryFilter
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onCategoryChange={handleCategoryChange}
                        loading={categoriesLoading}
                    />
                </div>

                <div className="filter-group">
                    <span className="filter-label">Status:</span>
                    <div className="status-filters">
                        <button
                            className={`filter-btn ${statusFilter === ITEM_STATUS.AVAILABLE ? 'active' : ''}`}
                            onClick={() => setStatusFilter(ITEM_STATUS.AVAILABLE)}
                        >
                            <span className="filter-dot filter-dot-available"></span>
                            Available
                        </button>
                        <button
                            className={`filter-btn filter-btn-reserved ${statusFilter === ITEM_STATUS.RESERVED ? 'active' : ''}`}
                            onClick={() => setStatusFilter(ITEM_STATUS.RESERVED)}
                        >
                            <span className="filter-dot filter-dot-reserved"></span>
                            Reserved
                        </button>

                    </div>
                </div>
            </div>

            <ItemGrid
                items={items}
                loading={loading}
                error={error}
                emptyMessage="No items found"
                currentUser={currentUser}
                onStatusClick={handleStatusClick}
            />
        </div>
    );
}

export default ItemListPage;
