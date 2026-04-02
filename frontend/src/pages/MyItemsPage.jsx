// MyItemsPage - SCREEN: Manage user's own listings

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useItems } from '../hooks/useItems';
import { deleteItem } from '../api/items';
import ItemGrid from '../components/items/ItemGrid';
import CategoryFilter from '../components/categories/CategoryFilter';
import { ITEM_STATUS } from '../constants/status';
import './ItemListPage.css';

const STATUS_OPTIONS = [
    { label: 'All', value: 'all', dotClass: 'filter-dot-all' },
    { label: 'Available', value: ITEM_STATUS.AVAILABLE, dotClass: 'filter-dot-available' },
    { label: 'Reserved', value: ITEM_STATUS.RESERVED, dotClass: 'filter-dot-reserved' },
    { label: 'Sold', value: ITEM_STATUS.SOLD, dotClass: 'filter-dot-sold' }
];

const SORT_OPTIONS = [
    { label: 'Newest first', value: 'newest' },
    { label: 'Price: low to high', value: 'price_asc' },
    { label: 'Price: high to low', value: 'price_desc' },
    { label: 'Title: A-Z', value: 'title_asc' }
];

const VALID_STATUSES = new Set(STATUS_OPTIONS.map(option => option.value));
const VALID_SORTS = new Set(SORT_OPTIONS.map(option => option.value));

function MyItemsPage({ currentUser, categories = [], categoriesLoading = false }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedCategory = searchParams.get('category') || null;
    const statusFilter = VALID_STATUSES.has(searchParams.get('status'))
        ? searchParams.get('status')
        : 'all';
    const searchQuery = searchParams.get('q') || '';
    const sortBy = VALID_SORTS.has(searchParams.get('sort')) ? searchParams.get('sort') : 'newest';

    const filters = {
        ...(selectedCategory && { category_id: selectedCategory }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(currentUser && { seller_id: currentUser.id })
    };

    const { items, loading, error, setItems } = useItems(filters);

    const handleDelete = async (itemId) => {
        const prev = items;
        // Optimistic removal
        setItems(current => current.filter(i => i.id !== itemId));
        try {
            await deleteItem(itemId);
        } catch (err) {
            console.error('Delete failed:', err);
            setItems(prev); // rollback on error
            alert('Failed to delete the item. Please try again.');
        }
    };

    const updateParams = (updates) => {
        const next = new URLSearchParams(searchParams);

        if (updates.category !== undefined) {
            if (updates.category) next.set('category', updates.category);
            else next.delete('category');
        }

        if (updates.status !== undefined) {
            if (updates.status && updates.status !== ITEM_STATUS.AVAILABLE) next.set('status', updates.status);
            else next.delete('status');
        }

        if (updates.q !== undefined) {
            if (updates.q && updates.q.trim().length > 0) next.set('q', updates.q.trim());
            else next.delete('q');
        }

        if (updates.sort !== undefined) {
            if (updates.sort && updates.sort !== 'newest') next.set('sort', updates.sort);
            else next.delete('sort');
        }

        setSearchParams(next);
    };

    const handleCategoryChange = (categoryId) => {
        updateParams({ category: categoryId });
    };

    // Handle status badge click from cards
    const handleStatusClick = (status) => {
        updateParams({ status });
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const queryValue = formData.get('q');
        updateParams({ q: typeof queryValue === 'string' ? queryValue : '' });
    };

    const handleSortChange = (event) => {
        const selectedSort = event.target.value;
        updateParams({ sort: selectedSort });
    };

    const resetFilters = () => {
        setSearchParams({});
    };

    const visibleItems = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        const searchedItems = normalizedQuery
            ? items.filter(item => {
                const searchable = [item.title, item.category_name, item.seller_name]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return searchable.includes(normalizedQuery);
            })
            : items;

        const sortedItems = [...searchedItems];

        sortedItems.sort((a, b) => {
            if (sortBy === 'price_asc') return Number(a.sell_price) - Number(b.sell_price);
            if (sortBy === 'price_desc') return Number(b.sell_price) - Number(a.sell_price);
            if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '');

            const aDate = new Date(a.created_at || 0).getTime();
            const bDate = new Date(b.created_at || 0).getTime();
            if (aDate !== bDate) return bDate - aDate;

            return Number(b.id || 0) - Number(a.id || 0);
        });

        return sortedItems;
    }, [items, searchQuery, sortBy]);

    return (
        <div className="item-list-page">
            <div className="filters-bar">
                <form className="search-form" onSubmit={handleSearchSubmit}>
                    <input
                        key={searchQuery}
                        name="q"
                        className="search-input"
                        type="search"
                        placeholder="Search by title, seller, category"
                        defaultValue={searchQuery}
                        aria-label="Search items"
                    />
                    <button type="submit" className="search-btn">Search</button>
                </form>

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
                        {STATUS_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                className={`filter-btn filter-btn-${option.value} ${statusFilter === option.value ? 'active' : ''}`}
                                onClick={() => updateParams({ status: option.value })}
                            >
                                <span className={`filter-dot ${option.dotClass}`}></span>
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="filter-group sort-group">
                    <label className="filter-label" htmlFor="sortBy">Sort:</label>
                    <select id="sortBy" className="sort-select" value={sortBy} onChange={handleSortChange}>
                        {SORT_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>

                <button type="button" className="reset-btn" onClick={resetFilters}>
                    Reset filters
                </button>
            </div>

            <div className="result-summary">
                Showing <strong>{visibleItems.length}</strong> of <strong>{items.length}</strong> items
                {searchQuery.trim() && <span className="result-query"> for "{searchQuery.trim()}"</span>}
            </div>

            <ItemGrid
                items={visibleItems}
                loading={loading}
                error={error}
                emptyMessage={statusFilter === 'all' ? "You haven't listed any items yet." : "No items match your current filters"}
                currentUser={currentUser}
                onStatusClick={handleStatusClick}
                onDelete={handleDelete}
            />
        </div>
    );
}

export default MyItemsPage;