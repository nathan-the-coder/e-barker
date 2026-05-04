import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold flex items-center gap-2">
              <i className="fa-solid fa-bus text-orange-400"></i>
              E-Barker
            </Link>
            <div className="flex items-center gap-6">
              <a href="#features" className="hover:text-orange-400 transition">Features</a>
              <a href="#about" className="hover:text-orange-400 transition">About</a>
              {user ? (
                <Link 
                  to={user.role === 'admin' ? '/admin' : user.role === 'dispatcher' ? '/dashboard' : '/driver'}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  Dashboard
                </Link>
              ) : (
                <Link 
                  to="/login"
                  className="bg-white text-indigo-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">E-Barker</h1>
          <p className="text-xl opacity-90 mb-8">PUV Van Dispatch System for Baggao, Cagayan</p>
          <Link 
            to="/login" 
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-3 rounded-lg font-semibold transition"
          >
            Get Started
          </Link>
        </div>
      </section>

      <section id="features" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: 'fa-layer-group', title: 'Queue Management', desc: 'Efficiently manage PUV Van queues in Baggao, Cagayan with real-time updates.' },
              { icon: 'fa-money-bill-wave', title: 'Fee Collection', desc: 'Track and monitor fee collection statistics effortlessly.' },
              { icon: 'fa-clipboard-list', title: 'Trip Registration', desc: 'Register and manage trips with comprehensive trip data.' }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                <div className="text-center">
                  <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className={`fa-solid ${feature.icon} text-indigo-900 text-2xl`}></i>
                  </div>
                  <h5 className="text-xl font-semibold mb-3 text-gray-800">{feature.title}</h5>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">About E-Barker</h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
             E-Barker is a comprehensive terminal management system designed for PUV Vans operating in Baggao, Cagayan.
            Streamline operations, improve efficiency, and enhance passenger experience for trips to Tuguegarao City and other Cagayan destinations.
          </p>
        </div>
      </section>

      <footer className="bg-indigo-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2026 E-Barker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;