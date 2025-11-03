import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import './i18n';
import './App.css';

// Lazy load components for better performance
const EmergencyBloodRequest = React.lazy(() => import('./pages/EmergencyBloodRequest'));
const DonorRegistration = React.lazy(() => import('./pages/DonorRegistration'));
const HospitalDashboard = React.lazy(() => import('./pages/HospitalDashboard'));
const DonorDashboard = React.lazy(() => import('./pages/DonorDashboard'));

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Suspense fallback={<LoadingSpinner size="large" text="Loading..." />}>
            <Routes>
              <Route path="/" element={<EmergencyBloodRequest />} />
              <Route path="/emergency" element={<EmergencyBloodRequest />} />
              <Route path="/donor-register" element={<DonorRegistration />} />
              <Route path="/hospital-dashboard" element={<HospitalDashboard />} />
              <Route path="/donor-dashboard" element={<DonorDashboard />} />
              <Route path="*" element={<EmergencyBloodRequest />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
