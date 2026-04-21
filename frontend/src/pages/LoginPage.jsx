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
                    <h1 className="auth-title">Welcome</h1>
                    <p className="auth-subtitle">
                        Sign in to buy, sell, lease and connect with students.
                    </p>
                </div>

                <div className="auth-oauth-stack auth-oauth-stack--solo">
                    <button type="button" className="auth-google-button" onClick={handleGoogleLogin}>
                        <span className="auth-google-icon"></span>
                        Sign in with Google
                    </button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <div className="auth-hint">
                    <strong>New here?</strong> We'll securely use your Google account, then ask a few quick questions to set up your student profile.
                </div>
            </div>
        </div>
    );
}

export default LoginPage;