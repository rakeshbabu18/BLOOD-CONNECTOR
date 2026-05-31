import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import DonorDashboard from './components/DonorDashboard';
import HospitalDashboard from './components/HospitalDashboard';

function RootLayout() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { fontFamily: 'var(--font-body)', fontSize: '14px' } }} />
      <Navbar />
      <main><Outlet /></main>
    </>
  );
}

function DashboardRouter() {
  const role = localStorage.getItem('userRole');
  if (!role) return <Navigate to="/login" replace />;
  return <Navigate to={role === 'hospital' ? '/hospital' : '/donor'} replace />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <div style={{ padding: 48, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 24 }}>Page not found</div>,
    children: [
      { path: '/', element: <Home /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/dashboard', element: <DashboardRouter /> },
      { path: '/donor', element: <DonorDashboard /> },
      { path: '/hospital', element: <HospitalDashboard /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
