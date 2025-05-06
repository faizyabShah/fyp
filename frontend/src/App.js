import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Homepage from './pages/Homepage';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import { AuthProvider } from './contexts/Authcontext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/css/bootstrap.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import SuperAdmin from './pages/SuperAdmin';
import Requests from './pages/Requests';
import RequestDetail from './pages/RequestDetail';
import Footer from './components/Footer';

function App() {

  

  return (
    <>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/superadmin" element={<SuperAdmin />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/requests/:id" element={<RequestDetail />} />
          <Route path="*" element={<h1>404 Not Found</h1>} />
        </Routes>
        <Footer/>
      </Router>
    </AuthProvider>
    </>

  );
}

export default App;
