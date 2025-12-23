import { Clock, Users, BarChart3, Camera, Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import logo from 'figma:asset/86e8fe2bc6b7330695cd8c803b167af958085624.png';
import { useState } from 'react';

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function LandingPage({ onLogin, onSignup }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-strong border-b border-white/10 sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="GrangerPR Logo" className="h-8 w-8 sm:h-10 sm:w-10" />
              <span className="text-lg sm:text-2xl font-medium">GrangerPR Timesheet</span>
            </div>
            {/* Hamburger Menu Button - Mobile Only */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
          
          {/* Desktop Buttons */}
          <div className="hidden sm:flex gap-2 sm:gap-3">
            <Button variant="outline" onClick={onLogin} className="flex-1 sm:flex-none">
              Login
            </Button>
            <Button onClick={onSignup} className="flex-1 sm:flex-none">
              Sign Up
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/10 glass-strong backdrop-blur-xl">
            <div className="px-4 py-4 flex flex-col gap-3">
              <Button variant="outline" onClick={() => { onLogin(); setMobileMenuOpen(false); }} className="w-full">
                Login
              </Button>
              <Button onClick={() => { onSignup(); setMobileMenuOpen(false); }} className="w-full">
                Sign Up
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-4 sm:mb-6">
            Professional Time Tracking Made Simple
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Track hours, document work progress with photos, and generate comprehensive reports for your team.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Button size="lg" onClick={onSignup} className="w-full sm:w-auto shadow-glow-purple">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={onLogin} className="w-full sm:w-auto">
              Sign In
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 sm:mt-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="glass p-6 rounded-xl hover:shadow-glow-purple transition-all border border-white/10">
            <div className="h-12 w-12 gradient-purple rounded-xl flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-medium mb-2">Time Tracking</h3>
            <p className="text-muted-foreground text-sm">
              Track time with built-in timers or manual entry. Never miss billable hours again.
            </p>
          </div>

          <div className="glass p-6 rounded-xl hover:shadow-glow-purple transition-all border border-white/10">
            <div className="h-12 w-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
              <Camera className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">Photo Documentation</h3>
            <p className="text-muted-foreground text-sm">
              Capture before and after photos to document work progress and quality.
            </p>
          </div>

          <div className="glass p-6 rounded-xl hover:shadow-glow-purple transition-all border border-white/10">
            <div className="h-12 w-12 bg-purple-400/20 rounded-xl flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Team Management</h3>
            <p className="text-muted-foreground text-sm">
              Manage your team, assign projects, and monitor productivity in real-time.
            </p>
          </div>

          <div className="glass p-6 rounded-xl hover:shadow-glow-orange transition-all border border-white/10">
            <div className="h-12 w-12 bg-secondary/20 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Reports & Analytics</h3>
            <p className="text-muted-foreground text-sm">
              Generate detailed reports and export to PDF, Excel, or CSV for easy sharing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}