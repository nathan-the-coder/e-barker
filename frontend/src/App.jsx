import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DriverPage from './pages/DriverPage';
import DispatcherDashboard from './pages/DispatcherDashboard';
import AdminPage from './pages/AdminPage';
import ReportsPage from './pages/ReportsPage';
import MapsPage from './pages/MapsPage';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          user ? (
            <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'dispatcher' ? '/dashboard' : '/driver'} replace />
          ) : (
            <LandingPage />
          )
        } 
      />
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" replace /> : <LoginPage />} 
      />
      <Route 
        path="/driver" 
        element={user ? <DriverPage /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/dashboard" 
        element={user?.role === 'dispatcher' || user?.role === 'admin' ? <DispatcherDashboard /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/admin" 
        element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/reports" 
        element={(user?.role === 'dispatcher' || user?.role === 'admin') ? <ReportsPage /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/maps" 
        element={user ? <MapsPage /> : <Navigate to="/login" replace />} 
      />
    </Routes>
  );
}

export default App;
