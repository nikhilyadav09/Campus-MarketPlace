// CreateItemPage - Simple form to list an item

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { createItem } from '../api/items';
import ItemForm from '../components/items/ItemForm';
import './CreateItemPage.css';

function CreateItemPage({ currentUser }) {
    const navigate = useNavigate();
    const { categories, loading: categoriesLoading } = useCategories();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (formData) => {
        if (!currentUser) {
            setError('Please select a user first');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const newItem = await createItem(formData);
            navigate(`/items/${newItem.id}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) {
        return (
            <div className="create-item-page">
                <div className="page-message">
                    Select a user to create a listing.
                </div>
            </div>
        );
    }

    return (
        <div className="create-item-page">
            {error && <div className="error-banner">{error}</div>}

            <div className="form-container">
                <ItemForm
                    categories={categories}
                    onSubmit={handleSubmit}
                    loading={loading || categoriesLoading}
                />
            </div>
        </div>
    );
}

export default CreateItemPage;