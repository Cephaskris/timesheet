import { useState, useEffect } from 'react';
import { Download, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { projectId } from '../utils/supabase/info';

interface ReportsViewProps {
  user: any;
  session: any;
}

interface Project {
  id: string;
  name: string;
}

interface TeamUser {
  id: string;
  name: string;
  email: string;
}

interface TimesheetEntry {
  id: string;
  userId: string;
  projectId: string;
  taskName: string;
  startTime: string;
  endTime: string;
  duration: number;
  notes?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
}

export function ReportsView({ user, session }: ReportsViewProps) {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    userId: 'all',
    projectId: 'all',
  });

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchTimesheets();
  }, [filters]);

  const fetchProjects = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/projects`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/organizations/${user.orgId}/users`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', new Date(filters.startDate).toISOString());
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        params.append('endDate', endDate.toISOString());
      }
      if (filters.userId && filters.userId !== 'all') params.append('userId', filters.userId);
      if (filters.projectId && filters.projectId !== 'all') params.append('projectId', filters.projectId);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/organizations/${user.orgId}/timesheets?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setTimesheets(data);
      }
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser?.name || 'Unknown';
  };

  const getProjectName = (projectId: string) => {
    const foundProject = projects.find(p => p.id === projectId);
    return foundProject?.name || 'Unknown';
  };

  const getTotalHours = () => {
    const totalMinutes = timesheets.reduce((sum, entry) => sum + entry.duration, 0);
    return (totalMinutes / 60).toFixed(2);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Project', 'Task', 'Start Time', 'End Time', 'Duration (hours)', 'Notes'];
    const rows = timesheets.map(entry => [
      new Date(entry.startTime).toLocaleDateString(),
      getUserName(entry.userId),
      getProjectName(entry.projectId),
      entry.taskName,
      new Date(entry.startTime).toLocaleTimeString(),
      new Date(entry.endTime).toLocaleTimeString(),
      (entry.duration / 60).toFixed(2),
      entry.notes || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getUserStats = () => {
    const stats = new Map<string, number>();
    timesheets.forEach(entry => {
      const current = stats.get(entry.userId) || 0;
      stats.set(entry.userId, current + entry.duration);
    });
    
    return Array.from(stats.entries()).map(([userId, minutes]) => ({
      userId,
      name: getUserName(userId),
      hours: (minutes / 60).toFixed(2),
    })).sort((a, b) => parseFloat(b.hours) - parseFloat(a.hours));
  };

  const getProjectStats = () => {
    const stats = new Map<string, number>();
    timesheets.forEach(entry => {
      const current = stats.get(entry.projectId) || 0;
      stats.set(entry.projectId, current + entry.duration);
    });
    
    return Array.from(stats.entries()).map(([projectId, minutes]) => ({
      projectId,
      name: getProjectName(projectId),
      hours: (minutes / 60).toFixed(2),
    })).sort((a, b) => parseFloat(b.hours) - parseFloat(a.hours));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl">Report Filters</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Filter timesheets by date range, user, or project</CardDescription>
            </div>
            <Button onClick={exportToCSV} disabled={timesheets.length === 0} className="w-full sm:w-auto text-sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <Label className="text-xs sm:text-sm">Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm">End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm">User</Label>
              <Select
                value={filters.userId}
                onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((teamUser) => (
                    <SelectItem key={teamUser.id} value={teamUser.id}>
                      {teamUser.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs sm:text-sm">Project</Label>
              <Select
                value={filters.projectId}
                onValueChange={(value) => setFilters(prev => ({ ...prev, projectId: value }))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Total Hours</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-2xl sm:text-3xl text-blue-600">{getTotalHours()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Total Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-2xl sm:text-3xl text-green-600">{timesheets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Average Per Entry</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-2xl sm:text-3xl text-purple-600">
              {timesheets.length > 0 ? (parseFloat(getTotalHours()) / timesheets.length).toFixed(2) : '0.00'}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats by User and Project */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Hours by User</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {getUserStats().length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">No data available</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {getUserStats().map((stat) => (
                  <div key={stat.userId} className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-gray-900 truncate mr-2">{stat.name}</span>
                    <span className="text-sm sm:text-base text-blue-600 flex-shrink-0">{stat.hours}h</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Hours by Project</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {getProjectStats().length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">No data available</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {getProjectStats().map((stat) => (
                  <div key={stat.projectId} className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-gray-900 truncate mr-2">{stat.name}</span>
                    <span className="text-sm sm:text-base text-green-600 flex-shrink-0">{stat.hours}h</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Entries */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Timesheet Entries</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Detailed view of all time entries</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground text-sm">Loading entries...</p>
            </div>
          ) : timesheets.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">No entries found for the selected filters</p>
          ) : (
            <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
              {timesheets.map((entry) => (
                <div key={entry.id} className="border-l-4 border-blue-500 pl-3 sm:pl-4 py-2 sm:py-3 bg-gray-50 rounded-r-lg">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-1 sm:gap-0">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base text-gray-900 truncate">{entry.taskName}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        {getUserName(entry.userId)} • {getProjectName(entry.projectId)}
                      </p>
                    </div>
                    <div className="text-sm sm:text-base text-blue-600 flex-shrink-0">{(entry.duration / 60).toFixed(2)}h</div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {new Date(entry.startTime).toLocaleDateString()} • {new Date(entry.startTime).toLocaleTimeString()} - {new Date(entry.endTime).toLocaleTimeString()}
                  </p>
                  {entry.notes && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 italic line-clamp-2">{entry.notes}</p>
                  )}
                  {(entry.beforePhotoUrl || entry.afterPhotoUrl) && (
                    <div className="flex gap-2 mt-2">
                      {entry.beforePhotoUrl && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Before:</p>
                          <img src={entry.beforePhotoUrl} alt="Before" className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded" />
                        </div>
                      )}
                      {entry.afterPhotoUrl && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">After:</p>
                          <img src={entry.afterPhotoUrl} alt="After" className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}