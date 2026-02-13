import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Library from './pages/Library';
import PlaybackDiagnostics from './pages/PlaybackDiagnostics';
import Login from './pages/Login';
import Register from './pages/Register';
import './index.css';

import { AppShell } from './components/layout/AppShell';
import Home from './pages/Home'; // Import Home
import ItemDetail from './pages/ItemDetail';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// ... imports

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    <Route path="/*" element={
                        <ProtectedRoute>
                            <AppShell>
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/library/:type" element={<Library />} />
                                    <Route path="/item/:id" element={<ItemDetail />} />
                                    <Route path="/diagnostics" element={<PlaybackDiagnostics />} />
                                    <Route path="/settings" element={<div>Settings Page</div>} />
                                </Routes>
                            </AppShell>
                        </ProtectedRoute>
                    } />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
