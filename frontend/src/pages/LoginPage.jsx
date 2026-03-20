import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { getGoogleLoginUrl } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

function LoginPage() {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { isAuthenticated, user } = useAuth();
    const [error, setError] = useState('');

    const redirectTo = useMemo(() => location.state?.from?.pathname || '/', [location.state]);

    useEffect(() => {
        const googleError = searchParams.get('error');
        if (googleError) {
            setError(googleError);
        }
    }, [searchParams]);

    if (isAuthenticated) {
        return <Navigate to={user?.profile_complete ? redirectTo : '/complete-profile'} replace />;
    }

    const handleGoogleLogin = () => {
        window.location.href = getGoogleLoginUrl(redirectTo);
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-kicker">Google sign-in only</div>
                    <h1 className="auth-title">Continue with Google</h1>
                    <p className="auth-subtitle">
                        Email/password login has been removed. Sign in with Google, then complete your student profile once.
                    </p>
                </div>

                <div className="auth-oauth-stack auth-oauth-stack--solo">
                    <button type="button" className="auth-google-button" onClick={handleGoogleLogin}>
                        <span className="auth-google-icon">G</span>
                        Continue with Google
                    </button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <div className="auth-hint">
                    <strong>First sign-in:</strong> we will save your Google name/email, then ask for year, mobile number, hostel, and room details.
                </div>
            </div>
        </div>
    );
}

export default LoginPage;