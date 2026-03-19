import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const initialState = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    year: '',
    hostel_name: '',
    room_number: '',
    mobile_number: '',
};

function RegisterPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { register, isAuthenticated } = useAuth();
    const [formData, setFormData] = useState(initialState);
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
        setError('');

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Password and confirm password must match.');
            return;
        }

        setLoading(true);
        try {
            await register({
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                year: formData.year.trim(),
                hostel_name: formData.hostel_name.trim(),
                room_number: formData.room_number.trim(),
                mobile_number: formData.mobile_number.trim(),
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
                    <div className="auth-kicker">Join the marketplace</div>
                    <h1 className="auth-title">Create your student account</h1>
                    <p className="auth-subtitle">
                        Sign up with your campus email so you can list items, reserve products, and manage your own activity.
                    </p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div className="auth-error">{error}</div>}

                    <div className="auth-form-group">
                        <label htmlFor="name">Full name</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            autoComplete="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Nikhil Yadav"
                            required
                        />
                    </div>

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

                    <div className="auth-grid">
                        <div className="auth-form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Minimum 6 characters"
                                required
                            />
                        </div>

                        <div className="auth-form-group">
                            <label htmlFor="confirmPassword">Confirm password</label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Repeat password"
                                required
                            />
                        </div>
                    </div>

                    <div className="auth-grid">
                        <div className="auth-form-group">
                            <label htmlFor="year">Year</label>
                            <input
                                id="year"
                                name="year"
                                type="text"
                                value={formData.year}
                                onChange={handleChange}
                                placeholder="3rd Year"
                            />
                        </div>

                        <div className="auth-form-group">
                            <label htmlFor="mobile_number">Mobile number</label>
                            <input
                                id="mobile_number"
                                name="mobile_number"
                                type="tel"
                                value={formData.mobile_number}
                                onChange={handleChange}
                                placeholder="9876543210"
                            />
                        </div>
                    </div>

                    <div className="auth-grid">
                        <div className="auth-form-group">
                            <label htmlFor="hostel_name">Hostel</label>
                            <input
                                id="hostel_name"
                                name="hostel_name"
                                type="text"
                                value={formData.hostel_name}
                                onChange={handleChange}
                                placeholder="CV Raman"
                            />
                        </div>

                        <div className="auth-form-group">
                            <label htmlFor="room_number">Room number</label>
                            <input
                                id="room_number"
                                name="room_number"
                                type="text"
                                value={formData.room_number}
                                onChange={handleChange}
                                placeholder="229"
                            />
                        </div>
                    </div>

                    <button type="submit" className="auth-submit" disabled={loading}>
                        {loading ? 'Creating your account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Log in</Link>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;
