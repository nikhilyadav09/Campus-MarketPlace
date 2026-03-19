import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { getCategories } from './api/categories';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import { useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import ItemDetailPage from './pages/ItemDetailPage';
import ItemListPage from './pages/ItemListPage';
import CreateItemPage from './pages/CreateItemPage';
import LoginPage from './pages/LoginPage';
import MyItemsPage from './pages/MyItemsPage';
import MyReservationsPage from './pages/MyReservationsPage';
import RegisterPage from './pages/RegisterPage';
import './App.css';

function App() {
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to fetch categories:', err))
      .finally(() => setCategoriesLoading(false));
  }, []);

  return (
    <BrowserRouter>
      <div className="app">
        <Header currentUser={user} />

        <main className="main-content">
          {authLoading ? (
            <div className="page-message">Restoring your session...</div>
          ) : (
            <Routes>
              <Route path="/" element={<HomePage categories={categories} />} />
              <Route path="/items" element={<ItemListPage currentUser={user} categories={categories} categoriesLoading={categoriesLoading} />} />
              <Route path="/items/:id" element={<ItemDetailPage currentUser={user} />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/items/new"
                element={(
                  <ProtectedRoute>
                    <CreateItemPage currentUser={user} />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/my-items"
                element={(
                  <ProtectedRoute>
                    <MyItemsPage currentUser={user} />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/my-reservations"
                element={(
                  <ProtectedRoute>
                    <MyReservationsPage currentUser={user} />
                  </ProtectedRoute>
                )}
              />
            </Routes>
          )}
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;