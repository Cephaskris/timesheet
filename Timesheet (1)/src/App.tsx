import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { supabase } from './utils/supabase/client';
import { LandingPage } from './components/LandingPage';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { AdminDashboard } from './components/AdminDashboard';
import { StaffDashboard } from './components/StaffDashboard';
import { WeeklyTimesheetView } from './components/WeeklyTimesheetView';
import { ProfileSettings } from './components/ProfileSettings';
import { Toaster } from './components/ui/sonner';

type Page = 'landing' | 'login' | 'signup' | 'dashboard' | 'timesheets' | 'profile';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (currentSession) {
        setSession(currentSession);
        await fetchUserProfile(currentSession.access_token);
        setCurrentPage('dashboard');
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (accessToken: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/users/me`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response from server:', response.status, errorData);
        
        // If user profile doesn't exist (404), they might have been created outside our signup flow
        if (response.status === 404) {
          console.error('User profile not found in database. User may need to sign up properly.');
        }
        return;
      }
      
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Show a more helpful error message
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error: Unable to connect to the server. Please check your connection and ensure the Supabase edge function is deployed.');
      }
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      setSession(data.session);
      await fetchUserProfile(data.session.access_token);
      setCurrentPage('dashboard');
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const handleSignup = async (email: string, password: string, name: string, organizationName: string, inviteCode?: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password, name, organizationName, inviteCode }),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      
      // Auto login after signup
      return await handleLogin(email, password);
    } catch (error: any) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setCurrentPage('landing');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {currentPage === 'landing' && (
        <LandingPage 
          onLogin={() => setCurrentPage('login')}
          onSignup={() => setCurrentPage('signup')}
        />
      )}
      
      {currentPage === 'login' && (
        <LoginForm 
          onLogin={handleLogin}
          onBack={() => setCurrentPage('landing')}
          onSignup={() => setCurrentPage('signup')}
        />
      )}
      
      {currentPage === 'signup' && (
        <SignupForm 
          onSignup={handleSignup}
          onBack={() => setCurrentPage('landing')}
          onLogin={() => setCurrentPage('login')}
        />
      )}
      
      {currentPage === 'dashboard' && session && user && (
        user.role === 'admin' ? (
          <AdminDashboard 
            user={user}
            session={session}
            onNavigate={(page) => setCurrentPage(page as Page)}
            onLogout={handleLogout}
          />
        ) : (
          <StaffDashboard 
            user={user}
            session={session}
            onNavigate={(page) => setCurrentPage(page as Page)}
            onLogout={handleLogout}
          />
        )
      )}
      
      {currentPage === 'timesheets' && session && user && (
        <WeeklyTimesheetView 
          user={user}
          session={session}
          onBack={() => setCurrentPage('dashboard')}
          onLogout={handleLogout}
        />
      )}
      
      {currentPage === 'profile' && session && user && (
        <ProfileSettings 
          user={user}
          session={session}
          onBack={() => setCurrentPage('dashboard')}
          onLogout={handleLogout}
          onUpdateUser={setUser}
        />
      )}
      <Toaster />
    </div>
  );
}