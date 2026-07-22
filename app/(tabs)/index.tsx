import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { AuthService } from '../../lib/auth';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import AdminDashboard from '../../components/AdminDashboard';

export default function HomeScreen() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      setLoading(true);
      setError(null);
      const role = await AuthService.getUserRole();
      setUserRole(role);
      
      // Redirect cashier to their own layout
      if (role === 'cashier') {
        router.replace('/(cashier)');
        return;
      }
    } catch (error: any) {
      setError('Failed to load user information');
      console.error('Error loading user role:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadUserRole} />;
  }

  // Only show admin dashboard here
  return <AdminDashboard />;
}