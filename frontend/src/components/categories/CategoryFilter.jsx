// CategoryFilter component

import './CategoryFilter.css';

function CategoryFilter({ categories, selectedCategory, onCategoryChange, loading }) {
    if (loading) {
        return <div className="category-filter-loading">Loading categories...</div>;
    }

    return (
        <div className="category-filter">
            <button
                type="button"
                className={`category-btn ${!selectedCategory ? 'active' : ''}`}
                onClick={() => onCategoryChange(null)}
            >
                All
            </button>
            {categories.map(category => (
                <button
                    key={category.id}
                    type="button"
                    className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                    onClick={() => onCategoryChange(category.id)}
                >
                    {category.name}
                </button>
            ))}
        </div>
    );
}

export default CategoryFilter;
