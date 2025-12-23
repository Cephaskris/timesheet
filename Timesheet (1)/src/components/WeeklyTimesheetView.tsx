import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar as CalendarIcon, Trash2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

interface WeeklyTimesheetViewProps {
  user: any;
  session: any;
  onBack: () => void;
  onLogout: () => void;
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
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

interface WeekDay {
  name: string;
  shortName: string;
  date: Date;
  dayOfWeek: number;
}

export function WeeklyTimesheetView({ user, session, onBack, onLogout }: WeeklyTimesheetViewProps) {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [filterProjectId, setFilterProjectId] = useState('all');
  const [viewPeriod, setViewPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday as first day
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  function getWeekDays(weekStart: Date): WeekDay[] {
    const days: WeekDay[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push({
        name: dayNames[i],
        shortName: shortNames[i],
        date: date,
        dayOfWeek: i,
      });
    }
    return days;
  }

  // Generate time slots (e.g., 00:00, 01:00, ..., 23:00)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  useEffect(() => {
    fetchProjects();
    fetchWeekTimesheets();

    // Set up real-time subscription for timesheets
    const timesheetSubscription = supabase
      .channel('timesheet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kv_store_3af6643f',
          filter: `key=like.timesheet:%`
        },
        (payload) => {
          console.log('Real-time timesheet update:', payload);
          // Refetch timesheets when any change occurs
          fetchWeekTimesheets();
        }
      )
      .subscribe();

    // Set up real-time subscription for projects
    const projectSubscription = supabase
      .channel('project-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kv_store_3af6643f',
          filter: `key=like.project:%`
        },
        (payload) => {
          console.log('Real-time project update:', payload);
          // Refetch projects when any change occurs
          fetchProjects();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      timesheetSubscription.unsubscribe();
      projectSubscription.unsubscribe();
    };
  }, [currentWeekStart, filterProjectId]);

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

  const fetchWeekTimesheets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('startDate', currentWeekStart.toISOString());
      
      if (filterProjectId !== 'all') {
        params.append('projectId', filterProjectId);
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/timesheets?${params}`,
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

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getProjectColor = (projectId: string) => {
    const colors = [
      'bg-yellow-100 border-yellow-300',
      'bg-blue-100 border-blue-300',
      'bg-pink-100 border-pink-300',
      'bg-purple-100 border-purple-300',
      'bg-green-100 border-green-300',
      'bg-orange-100 border-orange-300',
    ];
    const index = projects.findIndex(p => p.id === projectId);
    return colors[index % colors.length] || 'bg-gray-100 border-gray-300';
  };

  const getEntriesForDate = (date: Date) => {
    return timesheets.filter(entry => {
      const entryDate = new Date(entry.startTime);
      return entryDate.toDateString() === date.toDateString();
    });
  };

  const getTotalHoursForDate = (date: Date) => {
    const entries = getEntriesForDate(date);
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);
    return (totalMinutes / 60).toFixed(1);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/timesheets/${entryId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      
      if (response.ok) {
        fetchWeekTimesheets();
      }
    } catch (error) {
      console.error('Error deleting timesheet:', error);
    }
  };

  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    if (viewPeriod === 'daily') {
      newWeekStart.setDate(newWeekStart.getDate() - 1);
    } else if (viewPeriod === 'weekly') {
      newWeekStart.setDate(newWeekStart.getDate() - 7);
    } else if (viewPeriod === 'monthly') {
      newWeekStart.setMonth(newWeekStart.getMonth() - 1);
      newWeekStart.setDate(1);
    } else if (viewPeriod === 'yearly') {
      newWeekStart.setFullYear(newWeekStart.getFullYear() - 1);
      newWeekStart.setMonth(0);
      newWeekStart.setDate(1);
    }
    setCurrentWeekStart(newWeekStart);
  };

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    if (viewPeriod === 'daily') {
      newWeekStart.setDate(newWeekStart.getDate() + 1);
    } else if (viewPeriod === 'weekly') {
      newWeekStart.setDate(newWeekStart.getDate() + 7);
    } else if (viewPeriod === 'monthly') {
      newWeekStart.setMonth(newWeekStart.getMonth() + 1);
      newWeekStart.setDate(1);
    } else if (viewPeriod === 'yearly') {
      newWeekStart.setFullYear(newWeekStart.getFullYear() + 1);
      newWeekStart.setMonth(0);
      newWeekStart.setDate(1);
    }
    setCurrentWeekStart(newWeekStart);
  };

  const goToCurrentWeek = () => {
    if (viewPeriod === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setCurrentWeekStart(today);
    } else if (viewPeriod === 'weekly') {
      setCurrentWeekStart(getWeekStart(new Date()));
    } else if (viewPeriod === 'monthly') {
      const today = new Date();
      today.setDate(1);
      today.setHours(0, 0, 0, 0);
      setCurrentWeekStart(today);
    } else if (viewPeriod === 'yearly') {
      const today = new Date();
      today.setMonth(0);
      today.setDate(1);
      today.setHours(0, 0, 0, 0);
      setCurrentWeekStart(today);
    }
  };

  const isCurrentWeek = () => {
    const today = new Date();
    if (viewPeriod === 'daily') {
      return currentWeekStart.toDateString() === today.toDateString();
    } else if (viewPeriod === 'weekly') {
      const todayWeekStart = getWeekStart(today);
      return currentWeekStart.toDateString() === todayWeekStart.toDateString();
    } else if (viewPeriod === 'monthly') {
      return currentWeekStart.getMonth() === today.getMonth() && 
             currentWeekStart.getFullYear() === today.getFullYear();
    } else if (viewPeriod === 'yearly') {
      return currentWeekStart.getFullYear() === today.getFullYear();
    }
    return false;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const weekDays = getWeekDays(currentWeekStart);
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 6);

  const totalWeekHours = weekDays.reduce((sum, day) => {
    return sum + parseFloat(getTotalHoursForDate(day.date));
  }, 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-strong border-b border-white/10 sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <Button variant="ghost" onClick={onBack} className="text-xs sm:text-sm">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={onLogout} className="text-xs sm:text-sm">
              Logout
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Stay up to date, {user.name}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {currentWeekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-1 glass rounded-lg p-1 w-full sm:w-auto">
                <Button 
                  variant={viewPeriod === 'daily' ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => {
                    setViewPeriod('daily');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    setCurrentWeekStart(today);
                  }}
                  className={`text-xs flex-1 sm:flex-none ${viewPeriod === 'daily' ? 'gradient-purple shadow-glow-purple' : ''}`}
                >
                  Daily
                </Button>
                <Button 
                  variant={viewPeriod === 'weekly' ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => {
                    setViewPeriod('weekly');
                    setCurrentWeekStart(getWeekStart(new Date()));
                  }}
                  className={`text-xs flex-1 sm:flex-none ${viewPeriod === 'weekly' ? 'gradient-purple shadow-glow-purple' : ''}`}
                >
                  Weekly
                </Button>
                <Button 
                  variant={viewPeriod === 'monthly' ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => {
                    setViewPeriod('monthly');
                    const today = new Date();
                    today.setDate(1);
                    today.setHours(0, 0, 0, 0);
                    setCurrentWeekStart(today);
                  }}
                  className={`text-xs flex-1 sm:flex-none ${viewPeriod === 'monthly' ? 'gradient-purple shadow-glow-purple' : ''}`}
                >
                  Monthly
                </Button>
                <Button 
                  variant={viewPeriod === 'yearly' ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => {
                    setViewPeriod('yearly');
                    const today = new Date();
                    today.setMonth(0);
                    today.setDate(1);
                    today.setHours(0, 0, 0, 0);
                    setCurrentWeekStart(today);
                  }}
                  className={`text-xs flex-1 sm:flex-none ${viewPeriod === 'yearly' ? 'gradient-purple shadow-glow-purple' : ''}`}
                >
                  Yearly
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 max-w-xs w-full sm:w-auto">
              <Select value={filterProjectId} onValueChange={setFilterProjectId}>
                <SelectTrigger>
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
            <div className="text-sm">
              Total: <span className="text-primary font-medium">{totalWeekHours.toFixed(1)}h</span> this week
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading timesheets...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="glass rounded-lg border border-white/10 overflow-hidden shadow-xl">
            {/* Week Header - Days */}
            <div className="grid grid-cols-8 border-b border-white/10 glass-strong">
              <div className="p-3 border-r border-white/10">
                <div className="text-xs text-muted-foreground">Time</div>
              </div>
              {weekDays.map((day) => {
                const dayTotal = getTotalHoursForDate(day.date);
                const isDayToday = isToday(day.date);
                
                return (
                  <div
                    key={day.dayOfWeek}
                    className={`p-3 text-center border-r border-white/10 last:border-r-0 transition-all ${
                      isDayToday ? 'gradient-purple text-white shadow-glow-purple' : ''
                    }`}
                  >
                    <div className="text-xs mb-1">{day.shortName}</div>
                    <div className={`text-lg ${isDayToday ? 'text-white' : ''}`}>
                      {day.date.getDate()}
                    </div>
                    {dayTotal !== '0.0' && (
                      <div className={`text-xs mt-1 ${isDayToday ? 'text-white/80' : 'text-muted-foreground'}`}>
                        {dayTotal}h
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Calendar Grid */}
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <div className="grid grid-cols-8 min-h-full">
                {/* Time column */}
                <div className="border-r border-white/10 glass-strong">
                  {timeSlots.map((time) => (
                    <div key={time} className="h-20 border-b border-white/10 p-2 text-xs text-muted-foreground">
                      {time}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day) => {
                  const entries = getEntriesForDate(day.date);
                  
                  return (
                    <div
                      key={day.dayOfWeek}
                      className={`border-r border-white/10 last:border-r-0 relative ${
                        isToday(day.date) ? 'bg-primary/5' : ''
                      }`}
                    >
                      {timeSlots.map((time, index) => (
                        <div
                          key={time}
                          className="h-20 border-b border-white/10 p-1 relative"
                        >
                          {/* Render entries that fall in this time slot */}
                          {entries.map((entry) => {
                            const startTime = new Date(entry.startTime);
                            const endTime = new Date(entry.endTime);
                            const startHour = startTime.getHours();
                            const endHour = endTime.getHours();
                            const startMinute = startTime.getMinutes();
                            const endMinute = endTime.getMinutes();
                            
                            // Check if this entry should be displayed in this time slot
                            if (startHour === index) {
                              const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                              const height = Math.max(durationHours * 80, 60); // 80px per hour, minimum 60px
                              const topOffset = (startMinute / 60) * 80;

                              return (
                                <div
                                  key={entry.id}
                                  className="absolute left-0 right-0 mx-1 rounded-md border-l-4 border-primary p-2 glass hover:bg-white/20 transition-all cursor-pointer shadow-md hover:shadow-lg"
                                  style={{
                                    top: `${topOffset}px`,
                                    height: `${height}px`,
                                    zIndex: 1,
                                  }}
                                  onClick={() => {
                                    if (confirm('Delete this entry?')) {
                                      handleDeleteEntry(entry.id);
                                    }
                                  }}
                                >
                                  <div className="text-xs font-medium line-clamp-1">
                                    {entry.taskName}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - {endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {getProjectName(entry.projectId)}
                                  </div>
                                  {entry.notes && (
                                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                                      {entry.notes}
                                    </div>
                                  )}
                                  {(entry.beforePhotoUrl || entry.afterPhotoUrl) && (
                                    <div className="flex gap-1 mt-1">
                                      {entry.beforePhotoUrl && (
                                        <div className="w-4 h-4 bg-primary rounded-full text-white text-xs flex items-center justify-center">📷</div>
                                      )}
                                      {entry.afterPhotoUrl && (
                                        <div className="w-4 h-4 bg-accent rounded-full text-white text-xs flex items-center justify-center">📷</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}