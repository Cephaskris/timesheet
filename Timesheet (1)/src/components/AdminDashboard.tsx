import { useState, useEffect } from 'react';
import { Clock, Users, FolderKanban, BarChart3, User, LogOut, Calendar, Ticket } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { UserManagement } from './UserManagement';
import { ProjectManagement } from './ProjectManagement';
import { ReportsView } from './ReportsView';
import { InviteCodeManagement } from './InviteCodeManagement';
import { projectId } from '../utils/supabase/info';
import logo from 'figma:asset/86e8fe2bc6b7330695cd8c803b167af958085624.png';

interface AdminDashboardProps {
  user: any;
  session: any;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function AdminDashboard({ user, session, onNavigate, onLogout }: AdminDashboardProps) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    periodHours: 0,
    monthHours: 0,
  });
  
  // Get current month as default (0 = January, 11 = December)
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth().toString());
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'biweek'>('today');

  useEffect(() => {
    fetchStats();
  }, [selectedMonth, selectedPeriod]); // Re-fetch when month or period changes

  const fetchStats = async () => {
    try {
      // Fetch users
      const usersResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/organizations/${user.orgId}/users`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      
      // Fetch projects
      const projectsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/projects`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      // Calculate period start and end dates based on selected period
      let periodStart = new Date();
      let periodEnd = new Date();
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setHours(23, 59, 59, 999);
      
      if (selectedPeriod === 'today') {
        // Already set to today
      } else if (selectedPeriod === 'week') {
        // Start of current week (Sunday)
        periodStart.setDate(periodStart.getDate() - periodStart.getDay());
      } else if (selectedPeriod === 'biweek') {
        // Last 14 days
        periodStart.setDate(periodStart.getDate() - 13);
      }
      
      const periodTimesheetsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/organizations/${user.orgId}/timesheets?startDate=${periodStart.toISOString()}&endDate=${periodEnd.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      // Fetch this month's timesheets
      const currentYear = new Date().getFullYear();
      const monthStart = new Date(currentYear, parseInt(selectedMonth), 1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(currentYear, parseInt(selectedMonth) + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const monthTimesheetsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/organizations/${user.orgId}/timesheets?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (usersResponse.ok && projectsResponse.ok && periodTimesheetsResponse.ok && monthTimesheetsResponse.ok) {
        const users = await usersResponse.json();
        const projects = await projectsResponse.json();
        const periodTimesheets = await periodTimesheetsResponse.json();
        const monthTimesheets = await monthTimesheetsResponse.json();

        const periodMinutes = periodTimesheets.reduce((sum: number, entry: any) => sum + entry.duration, 0);
        const monthMinutes = monthTimesheets.reduce((sum: number, entry: any) => sum + entry.duration, 0);

        setStats({
          totalUsers: users.length,
          totalProjects: projects.length,
          periodHours: periodMinutes / 60,
          monthHours: monthMinutes / 60,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Helper to get period title
  const getPeriodTitle = () => {
    switch (selectedPeriod) {
      case 'today': return "Today's Hours";
      case 'week': return "Week's Hours";
      case 'biweek': return "Bi-Week Hours";
      default: return "Period Hours";
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-strong border-b border-white/10 sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="GrangerPR Logo" className="h-8 w-8 sm:h-10 sm:w-10" />
              <span className="text-base sm:text-xl font-medium">GrangerPR Timesheet - Admin</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button variant="ghost" onClick={() => onNavigate('timesheets')} className="text-xs sm:text-sm">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-2">My Report</span>
                <span className="sm:hidden ml-1">Report</span>
              </Button>
              <Button variant="ghost" onClick={() => onNavigate('profile')} className="text-xs sm:text-sm">
                <User className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="ml-1 sm:ml-2">Profile</span>
              </Button>
              <Button variant="outline" onClick={onLogout} className="text-xs sm:text-sm">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="ml-1 sm:ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Manage your organization, projects, and team
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <Card className="hover:shadow-glow-purple transition-all">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm md:text-base">Total Users</CardTitle>
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-glow-purple transition-all">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm md:text-base">Projects</CardTitle>
                <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-500">{stats.totalProjects}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-glow-purple transition-all">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm md:text-base">{getPeriodTitle()}</CardTitle>
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 flex-shrink-0" />
                </div>
                <Select value={selectedPeriod} onValueChange={(value: 'today' | 'week' | 'biweek') => setSelectedPeriod(value)}>
                  <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="biweek">Bi-Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-400">{stats.periodHours.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-glow-orange transition-all">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm md:text-base">Month's Hours</CardTitle>
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-secondary flex-shrink-0" />
                </div>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">January</SelectItem>
                    <SelectItem value="1">February</SelectItem>
                    <SelectItem value="2">March</SelectItem>
                    <SelectItem value="3">April</SelectItem>
                    <SelectItem value="4">May</SelectItem>
                    <SelectItem value="5">June</SelectItem>
                    <SelectItem value="6">July</SelectItem>
                    <SelectItem value="7">August</SelectItem>
                    <SelectItem value="8">September</SelectItem>
                    <SelectItem value="9">October</SelectItem>
                    <SelectItem value="10">November</SelectItem>
                    <SelectItem value="11">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-secondary">{stats.monthHours.toFixed(1)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 glass-strong">
            <TabsTrigger 
              value="users" 
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-3 px-2 sm:px-3 data-[state=active]:gradient-purple data-[state=active]:text-white"
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">User Management</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger 
              value="projects" 
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-3 px-2 sm:px-3 data-[state=active]:gradient-purple data-[state=active]:text-white"
            >
              <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Project Management</span>
              <span className="sm:hidden">Projects</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-3 px-2 sm:px-3 data-[state=active]:gradient-purple data-[state=active]:text-white"
            >
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Reports</span>
            </TabsTrigger>
            <TabsTrigger 
              value="inviteCodes" 
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-3 px-2 sm:px-3 data-[state=active]:gradient-purple data-[state=active]:text-white"
            >
              <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Invite Codes</span>
              <span className="sm:hidden">Invites</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement user={user} session={session} />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectManagement user={user} session={session} />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsView user={user} session={session} />
          </TabsContent>

          <TabsContent value="inviteCodes">
            <InviteCodeManagement user={user} session={session} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}