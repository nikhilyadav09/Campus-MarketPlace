import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

function CompleteProfilePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, loading, isAuthenticated, updateProfile } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        year: '',
        mobile_number: '',
        hostel_name: '',
        room_number: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const redirectTo = useMemo(() => searchParams.get('next') || '/', [searchParams]);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                year: user.year || '',
                mobile_number: user.mobile_number || '',
                hostel_name: user.hostel_name || '',
                room_number: user.room_number || '',
            });
        }
    }, [user]);

    if (!loading && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.profile_complete) {
        return <Navigate to={redirectTo} replace />;
    }

    const handleChange = ({ target: { name, value } }) => {
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await updateProfile({
                name: formData.name.trim(),
                year: formData.year.trim(),
                mobile_number: formData.mobile_number.trim(),
                hostel_name: formData.hostel_name.trim(),
                room_number: formData.room_number.trim(),
            });
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-kicker">One-time setup</div>
                    <h1 className="auth-title">Complete your student profile</h1>
                    <p className="auth-subtitle">
                        We already received your Google account. Add your campus details once so sellers and buyers can contact you.
                    </p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div className="auth-error">{error}</div>}

                    <div className="auth-form-group">
                        <label htmlFor="name">Full name</label>
                        <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required />
                    </div>

                    <div className="auth-form-group">
                        <label htmlFor="email">Google email</label>
                        <input id="email" name="email" type="email" value={user?.email || ''} disabled readOnly />
                        <small>Your email comes from Google and is reused every time you sign in.</small>
                    </div>

                    <div className="auth-grid">
                        <div className="auth-form-group">
                            <label htmlFor="year">Year</label>
                            <input id="year" name="year" type="text" value={formData.year} onChange={handleChange} placeholder="3rd Year" required />
                        </div>

                        <div className="auth-form-group">
                            <label htmlFor="mobile_number">Mobile number</label>
                            <input id="mobile_number" name="mobile_number" type="tel" value={formData.mobile_number} onChange={handleChange} placeholder="9876543210" required />
                        </div>
                    </div>

                    <div className="auth-grid">
                        <div className="auth-form-group">
                            <label htmlFor="hostel_name">Hostel</label>
                            <input id="hostel_name" name="hostel_name" type="text" value={formData.hostel_name} onChange={handleChange} placeholder="CV Raman" required />
                        </div>

                        <div className="auth-form-group">
                            <label htmlFor="room_number">Room number</label>
                            <input id="room_number" name="room_number" type="text" value={formData.room_number} onChange={handleChange} placeholder="229" required />
                        </div>
                    </div>

                    <button type="submit" className="auth-submit" disabled={submitting}>
                        {submitting ? 'Saving your profile...' : 'Save and continue'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default CompleteProfilePage;