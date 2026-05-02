import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../utils/api';

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    name: '',
    role: 'driver'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleData, setGoogleData] = useState(null);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = isLogin 
        ? await authAPI.login({ email: formData.email, password: formData.password })
        : await authAPI.register({ ...formData });

      // The login function in useAuth will handle redirection
      login(data.user, data.token);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Load Google Identity Services if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = initializeGoogleSignIn;
      document.body.appendChild(script);
    } else {
      initializeGoogleSignIn();
    }
  };

  const initializeGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        callback: handleGoogleSignIn
      });
      window.google.accounts.id.prompt();
    }
  };

  const handleGoogleSignIn = async (response) => {
    try {
      const data = await authAPI.googleLogin({ credential: response.credential });

      if (data.needsRoleSelection) {
        setGoogleData({
          credential: response.credential,
          email: data.email,
          name: data.name,
          googleId: data.googleId
        });
        setShowRoleSelection(true);
        return;
      }

      login(data.user, data.token);
    } catch (error) {
      setError(error.message || 'Google login failed');
    }
  };

  const handleGoogleRoleSelect = async (role) => {
    try {
      setLoading(true);
      const data = await authAPI.googleLogin({
        credential: googleData.credential,
        role
      });
      setShowRoleSelection(false);
      setGoogleData(null);
      login(data.user, data.token);
    } catch (error) {
      setError(error.message || 'Google registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (showRoleSelection) {
    return (
      <div>
        <nav className="navbar navbar-dark bg-primary">
          <div className="container">
            <Link className="navbar-brand" to="/">E-Barker</Link>
          </div>
        </nav>

        <div className="container mt-5">
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-body p-4">
                  <h3 className="text-center mb-4">Select Your Role</h3>
                  <p className="text-center text-muted mb-4">
                    Welcome {googleData?.name || googleData?.email}! Please select your role to continue.
                  </p>

                  {error && (
                    <div className="alert alert-danger">{error}</div>
                  )}

                  <div className="d-grid gap-3">
                    <button
                      className="btn btn-outline-primary btn-lg"
                      onClick={() => handleGoogleRoleSelect('driver')}
                      disabled={loading}
                    >
                      <div className="text-start">
                        <strong>Driver</strong>
                        <div className="small text-muted">Join the queue and accept passenger requests</div>
                      </div>
                    </button>

                    <button
                      className="btn btn-outline-primary btn-lg"
                      onClick={() => handleGoogleRoleSelect('dispatcher')}
                      disabled={loading}
                    >
                      <div className="text-start">
                        <strong>Dispatcher</strong>
                        <div className="small text-muted">Manage queue and dispatch drivers</div>
                      </div>
                    </button>
                  </div>

                  <button
                    className="btn btn-link mt-3"
                    onClick={() => {
                      setShowRoleSelection(false);
                      setGoogleData(null);
                    }}
                  >
                    Back to login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="navbar navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand" to="/">E-Barker</Link>
        </div>
      </nav>

      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <h3 className="card-title text-center mb-4">
                    {isLogin ? 'Login to E-Barker' : 'Register'}
                  </h3>
                </div>

                {error && (
                  <div className="alert alert-danger">{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                  {!isLogin && (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Username</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={formData.username}
                          onChange={(e) => setFormData({...formData, username: e.target.value})}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Name</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Role</label>
                        <select
                          className="form-control"
                          value={formData.role}
                          onChange={(e) => setFormData({...formData, role: e.target.value})}
                        >
                          <option value="driver">Driver</option>
                          <option value="dispatcher">Dispatcher</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-100 mb-3" disabled={loading}>
                    {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
                  </button>
                </form>

                <div className="text-center mb-3">
                  <span className="text-muted">OR</span>
                </div>

                <button
                  type="button"
                  className="btn btn-outline-dark w-100 mb-3"
                  onClick={handleGoogleLogin}
                >
                  <img src="https://developers.google.com/identity/images/g-logo.png" alt="G" width="20" className="me-2" />
                  Login with Google
                </button>

                <div className="text-center">
                  <p className="mb-0">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}>
                      {isLogin ? 'Register here' : 'Login here'}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
