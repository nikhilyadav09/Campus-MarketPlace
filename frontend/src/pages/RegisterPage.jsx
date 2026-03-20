import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { getGoogleLoginUrl } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

function RegisterPage() {
    const [searchParams] = useSearchParams();
    const { isAuthenticated, user } = useAuth();
    const [error, setError] = useState('');

    useEffect(() => {
        const googleError = searchParams.get('error');
        if (googleError) {
            setError(googleError);
        }
    }, [searchParams]);

    if (isAuthenticated) {
        return <Navigate to={user?.profile_complete ? '/' : '/complete-profile'} replace />;
    }

    const handleGoogleSignup = () => {
        window.location.href = getGoogleLoginUrl('/complete-profile');
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-kicker">Create your account</div>
                    <h1 className="auth-title">Join with Google</h1>
                    <p className="auth-subtitle">
                        New users sign in with Google first. After that, you only fill in your campus profile once and we reuse it on later logins.
                    </p>
                </div>

                <div className="auth-oauth-stack auth-oauth-stack--solo">
                    <button type="button" className="auth-google-button" onClick={handleGoogleSignup}>
                        <span className="auth-google-icon">G</span>
                        Continue with Google
                    </button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <div className="auth-hint">
                    <strong>What gets saved:</strong> Google name and email, plus your year, mobile number, hostel, and room number after first sign-in.
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;