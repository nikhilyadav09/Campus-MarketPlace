// Main App component

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getUsers } from './api/users';
import { getCategories } from './api/categories';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import HomePage from './pages/HomePage';
import ItemListPage from './pages/ItemListPage';
import ItemDetailPage from './pages/ItemDetailPage';
import CreateItemPage from './pages/CreateItemPage';
import MyItemsPage from './pages/MyItemsPage';
import MyReservationsPage from './pages/MyReservationsPage';
import './App.css';

function App() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    // Fetch users
    getUsers()
      .then(data => {
        const userList = Array.isArray(data) ? data : [];
        setUsers(userList);

        // Auto-login Ajay
        const ajay = userList.find(u => u.name === 'Ajay');
        if (ajay) {
          setCurrentUser(ajay);
        } else if (userList.length > 0) {
          setCurrentUser(userList[0]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch users:', err);
        setUsers([]);
      });

    // Fetch categories once at app level
    getCategories()
      .then(data => setCategories(data))
      .catch(err => console.error('Failed to fetch categories:', err));
  }, []);

  return (
    <BrowserRouter>
      <div className="app">
        <Header currentUser={currentUser} users={users} onUserChange={setCurrentUser} />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage categories={categories} />} />
            <Route path="/items" element={<ItemListPage currentUser={currentUser} categories={categories} />} />
            <Route path="/items/new" element={<CreateItemPage currentUser={currentUser} categories={categories} />} />
            <Route path="/items/:id" element={<ItemDetailPage currentUser={currentUser} />} />
            <Route path="/my-items" element={<MyItemsPage currentUser={currentUser} />} />
            <Route path="/my-reservations" element={<MyReservationsPage currentUser={currentUser} />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
