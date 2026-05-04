import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { authAPI } from "../utils/api";
import Swal from "sweetalert2";

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    name: "",
    role: "driver",
  });
  const [loading, setLoading] = useState(false);
  const [googleData, setGoogleData] = useState(null);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = isLogin
        ? await authAPI.login({ email: formData.email, password: formData.password })
        : await authAPI.register({ ...formData });

      login(data.user, data.token);
    } catch (err) {
      const title = isLogin ? "Login Failed" : "Registration Failed";
      const text =
        err.message ||
        (isLogin ? "Invalid email or password" : "Registration failed. Please try again.");
      Swal.fire({ title, text, icon: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!window.google) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.onload = initializeGoogleSignIn;
      document.body.appendChild(script);
    } else {
      initializeGoogleSignIn();
    }
  };

  const initializeGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID",
        callback: handleGoogleSignIn,
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
          googleId: data.googleId,
        });
        setShowRoleSelection(true);
        return;
      }

      login(data.user, data.token);
    } catch (error) {
      Swal.fire({
        title: "Google Login Failed",
        text: error.message || "Google login failed",
        icon: "error",
      });
    }
  };

  const handleGoogleRoleSelect = async (role) => {
    try {
      setLoading(true);
      const data = await authAPI.googleLogin({
        credential: googleData.credential,
        role,
      });
      setShowRoleSelection(false);
      setGoogleData(null);
      login(data.user, data.token);
    } catch (error) {
      Swal.fire({
        title: "Registration Failed",
        text: error.message || "Google registration failed",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showRoleSelection) {
    return (
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <Link to="/" className="text-xl font-bold flex items-center gap-2">
              <i className="fa-solid fa-bus text-orange-400"></i>
              E-Barker
            </Link>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">Select Your Role</h3>
              <p className="text-center text-gray-500 mb-6">
                Welcome {googleData?.name || googleData?.email}! Please select your role to
                continue.
              </p>

              <div className="space-y-3">
                <button
                  className="w-full border-2 border-indigo-900 text-indigo-900 hover:bg-indigo-50 px-4 py-3 rounded-lg font-medium transition flex items-center gap-3"
                  onClick={() => handleGoogleRoleSelect("driver")}
                  disabled={loading}
                >
                  <i className="fa-solid fa-car text-xl"></i>
                  <div className="text-left">
                    <div className="font-semibold">Driver</div>
                    <div className="text-sm text-gray-500">Join the queue and accept passenger requests</div>
                  </div>
                </button>

                <button
                  className="w-full border-2 border-indigo-900 text-indigo-900 hover:bg-indigo-50 px-4 py-3 rounded-lg font-medium transition flex items-center gap-3"
                  onClick={() => handleGoogleRoleSelect("dispatcher")}
                  disabled={loading}
                >
                  <i className="fa-solid fa-walkie-talkie text-xl"></i>
                  <div className="text-left">
                    <div className="font-semibold">Dispatcher</div>
                    <div className="text-sm text-gray-500">Manage queue and dispatch drivers</div>
                  </div>
                </button>
              </div>

              <button
                className="w-full text-center mt-4 text-indigo-900 hover:underline"
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-xl font-bold flex items-center gap-2">
            <i className="fa-solid fa-bus text-orange-400"></i>
            E-Barker
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                {isLogin ? "Login to E-Barker" : "Register"}
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="driver">Driver</option>
                      <option value="dispatcher">Dispatcher</option>
                    </select>
                  </div>
                </>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <button type="submit" className="w-full bg-indigo-900 hover:bg-indigo-800 text-white py-2 rounded-lg font-medium transition disabled:opacity-50" disabled={loading}>
                {loading ? "Processing..." : isLogin ? "Login" : "Register"}
              </button>
            </form>

            <div className="text-center my-4">
              <span className="text-gray-500">OR</span>
            </div>

            <button
              type="button"
              className="w-full border-2 border-gray-800 text-gray-800 hover:bg-gray-100 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
              onClick={handleGoogleLogin}
            >
              <img
                src="https://www.svgrepo.com/download/303108/google-icon-logo.svg"
                alt="G"
                width="20"
              />
              Login with Google
            </button>

            <div className="text-center mt-4">
              <p className="text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <a
                  href="#"
                  className="text-indigo-900 font-medium hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsLogin(!isLogin);
                  }}
                >
                  {isLogin ? "Register here" : "Login here"}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;