import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Library from './pages/Library';
import PlaybackDiagnostics from './pages/PlaybackDiagnostics';
import Login from './pages/Login';
import Register from './pages/Register';
import './index.css';

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: JSX.Element }) {
    const { token } = useAuth();
    // If we have no token in local storage (checked in context), redirect.
    // Note: Context might be loading initially. For MVP we check token/user presence.
    if (!token && !localStorage.getItem('token')) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function NavBar() {
    const { user, logout } = useAuth();
    if (!user) return null;

    return (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <h1 style={{ margin: 0 }}>HomeFlix</h1>
                <nav>
                    <Link to="/" style={{ color: 'white', marginRight: '15px' }}>Library</Link>
                    <Link to="/diagnostics" style={{ color: '#aaa' }}>Diagnostics</Link>
                </nav>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span>👤 {user.username}</span>
                <button onClick={logout} style={{ padding: '5px 10px', background: '#d9534f', border: 'none', color: 'white', cursor: 'pointer' }}>Logout</button>
            </div>
        </header>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="container">
                    <NavBar /> {/* Only shows when logged in */}
                    <main>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />

                            <Route path="/" element={<ProtectedRoute><Library /></ProtectedRoute>} />
                            <Route path="/diagnostics" element={<ProtectedRoute><PlaybackDiagnostics /></ProtectedRoute>} />
                        </Routes>
                    </main>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
