import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

function LandingPage() {
  const { user } = useAuth();

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand" to="/">E-Barker</Link>
          <div className="collapse navbar-collapse">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item"><a className="nav-link" href="#features">Features</a></li>
              <li className="nav-item"><a className="nav-link" href="#about">About</a></li>
              <li className="nav-item">
                {user ? (
                  <Link className="btn btn-light" to={user.role === 'admin' ? '/admin' : user.role === 'dispatcher' ? '/dashboard' : '/driver'}>
                    Dashboard
                  </Link>
                ) : (
                  <Link className="btn btn-light" to="/login">Login</Link>
                )}
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <section className="hero bg-primary text-white py-5">
        <div className="container text-center">
          <h1 className="display-4 fw-bold">E-Barker</h1>
          <p className="lead">PUV Van Dispatch System for Baggao, Cagayan</p>
          <Link to="/login" className="btn btn-light btn-lg mt-3">Get Started</Link>
        </div>
      </section>

      <section id="features" className="py-5">
        <div className="container">
          <h2 className="text-center mb-5">Features</h2>
          <div className="row g-4">
            {[
              { title: 'Queue Management', desc: 'Efficiently manage PUV Van queues in Baggao, Cagayan with real-time updates.' },
              { title: 'Fee Collection', desc: 'Track and monitor fee collection statistics effortlessly.' },
              { title: 'Trip Registration', desc: 'Register and manage trips with comprehensive trip data.' }
            ].map((feature, idx) => (
              <div className="col-md-4" key={idx}>
                <div className="card h-100">
                  <div className="card-body text-center">
                    <h5 className="card-title">{feature.title}</h5>
                    <p className="card-text">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-5 bg-light">
        <div className="container">
          <h2 className="text-center mb-4">About E-Barker</h2>
          <p className="text-center col-md-8 mx-auto">
             E-Barker is a comprehensive terminal management system designed for PUV Vans operating in Baggao, Cagayan.
            Streamline operations, improve efficiency, and enhance passenger experience for trips to Tuguegarao City and other Cagayan destinations.
          </p>
        </div>
      </section>

      <footer className="bg-dark text-white py-4">
        <div className="container text-center">
          <p>&copy; 2026 E-Barker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
