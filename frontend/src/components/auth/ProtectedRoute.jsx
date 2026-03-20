import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function ProtectedRoute({ children }) {
    const location = useLocation();
    const { loading, isAuthenticated, user } = useAuth();

    if (loading) {
        return <div className="page-message">Loading your account...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (!user?.profile_complete) {
        const nextPath = `${location.pathname}${location.search}${location.hash}` || '/';
        return <Navigate to={`/complete-profile?next=${encodeURIComponent(nextPath)}`} replace />;
    }

    return children;
}

export default ProtectedRoute;