import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const redirectTo = useMemo(() => location.state?.from?.pathname || '/', [location.state]);

    if (isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login({
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
            });
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-kicker">Welcome back</div>
                    <h1 className="auth-title">Log in to continue</h1>
                    <p className="auth-subtitle">
                        Browse freely, then sign in to list items, reserve products, and manage your marketplace activity.
                    </p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div className="auth-error">{error}</div>}

                    <div className="auth-form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@campus.edu"
                            required
                        />
                    </div>

                    <div className="auth-form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button type="submit" className="auth-submit" disabled={loading}>
                        {loading ? 'Signing you in...' : 'Log In'}
                    </button>
                </form>

                <div className="auth-footer">
                    New here? <Link to="/register">Create an account</Link>
                </div>

                <div className="auth-hint">
                    <strong>Seeded demo users:</strong> use <code>ajay@campus.edu</code>, <code>ritik@campus.edu</code>, or <code>manu@campus.edu</code>
                    with password <code>campus123</code> after reseeding the database.
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
