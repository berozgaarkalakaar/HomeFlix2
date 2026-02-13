import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, token } = useAuth();
    const location = useLocation();

    // If we have a token but no user yet, we might be loading (AuthContext handles logic, but simple check here)
    // Actually AuthContext initializes synchronously from localStorage for token, 
    // but user fetch is async. We might want a loading state in AuthContext.
    // For MVP, if we have a token but no user, we can wait or assume fetching.
    // However, AuthContext as implemented doesn't expose 'loading'.
    // Let's rely on token for immediate check, and user for verified check?
    // Or just simple:

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Optional: If you want to wait for user profile to load
    // if (token && !user) return <LoadingSpinner />

    return <>{children}</>;
}
