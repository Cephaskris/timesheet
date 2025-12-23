import { useState, useEffect } from 'react';
import { Clock, Plus, Calendar, User, LogOut, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { PhotoUpload } from './PhotoUpload';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import logo from 'figma:asset/86e8fe2bc6b7330695cd8c803b167af958085624.png';

interface StaffDashboardProps {
  user: any;
  session: any;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  assignedUsers: string[];
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

interface WeekDay {
  name: string;
  shortName: string;
  date: Date;
  dayOfWeek: number;
}

export function StaffDashboard({ user, session, onNavigate, onLogout }: StaffDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [todayEntries, setTodayEntries] = useState<TimesheetEntry[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newEntry, setNewEntry] = useState({
    projectId: '',
    taskName: '',
    startHour: '',
    startMinute: '',
    startPeriod: '',
    endHour: '',
    endMinute: '',
    endPeriod: '',
    notes: '',
    beforePhotoUrl: null as string | null,
    afterPhotoUrl: null as string | null,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    const shortNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

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

  useEffect(() => {
    fetchProjects();
    fetchTodayEntries();

    // Set up real-time subscription for timesheets
    const timesheetSubscription = supabase
      .channel('timesheet-changes-staff')
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
          fetchTodayEntries();
        }
      )
      .subscribe();

    // Set up real-time subscription for projects
    const projectSubscription = supabase
      .channel('project-changes-staff')
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
          fetchProjects();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      timesheetSubscription.unsubscribe();
      projectSubscription.unsubscribe();
    };
  }, [selectedDate]);

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

  const fetchTodayEntries = async () => {
    try {
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/timesheets?startDate=${dayStart.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Filter to only show entries for the selected date
        const filtered = data.filter((entry: TimesheetEntry) => {
          const entryDate = new Date(entry.startTime);
          return entryDate.toDateString() === selectedDate.toDateString();
        });
        setTodayEntries(filtered);
      }
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    }
  };

  const handlePhotoUpload = async (file: File, type: 'before' | 'after') => {
    setUploading(true);
    setUploadError(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/upload-photo`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              photoData: base64Data,
              fileName: file.name,
            }),
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setNewEntry(prev => ({
            ...prev,
            [`${type}PhotoUrl`]: data.url,
          }));
        } else {
          const errorData = await response.json();
          setUploadError(errorData.message || 'Failed to upload photo');
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setUploadError('An error occurred while uploading the photo');
      setUploading(false);
    }
  };

  const handleSubmitEntry = async () => {
    if (!newEntry.projectId || !newEntry.taskName || !newEntry.startHour || !newEntry.startMinute || !newEntry.startPeriod || !newEntry.endHour || !newEntry.endMinute || !newEntry.endPeriod) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Combine selected date with time inputs
    const start = new Date(selectedDate);
    start.setHours(parseInt(newEntry.startHour), parseInt(newEntry.startMinute), 0, 0);
    if (newEntry.startPeriod === 'PM' && start.getHours() < 12) {
      start.setHours(start.getHours() + 12);
    }
    
    const end = new Date(selectedDate);
    end.setHours(parseInt(newEntry.endHour), parseInt(newEntry.endMinute), 0, 0);
    if (newEntry.endPeriod === 'PM' && end.getHours() < 12) {
      end.setHours(end.getHours() + 12);
    }
    
    const duration = Math.floor((end.getTime() - start.getTime()) / 60000);
    
    if (duration <= 0) {
      alert('End time must be after start time');
      return;
    }
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/timesheets`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            projectId: newEntry.projectId,
            taskName: newEntry.taskName,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            duration,
            notes: newEntry.notes,
            beforePhotoUrl: newEntry.beforePhotoUrl,
            afterPhotoUrl: newEntry.afterPhotoUrl,
          }),
        }
      );
      
      if (response.ok) {
        setNewEntry({
          projectId: '',
          taskName: '',
          startHour: '',
          startMinute: '',
          startPeriod: '',
          endHour: '',
          endMinute: '',
          endPeriod: '',
          notes: '',
          beforePhotoUrl: null,
          afterPhotoUrl: null,
        });
        fetchTodayEntries();
      }
    } catch (error) {
      console.error('Error saving entry:', error);
    }
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
        fetchTodayEntries();
      }
    } catch (error) {
      console.error('Error deleting timesheet:', error);
    }
  };

  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelectedDate = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getTotalHoursForDay = () => {
    const totalMinutes = todayEntries.reduce((sum, entry) => sum + entry.duration, 0);
    return (totalMinutes / 60).toFixed(1);
  };

  const weekDays = getWeekDays(currentWeekStart);
  const currentMonth = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-strong border-b border-white/10 sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="GrangerPR Logo" className="h-8 w-8 sm:h-10 sm:w-10" />
              <span className="text-lg sm:text-xl font-medium">GrangerPR Timesheet</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button variant="ghost" onClick={() => onNavigate('timesheets')} className="text-xs sm:text-sm">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">View All Timesheets</span>
                <span className="sm:hidden">Timesheets</span>
              </Button>
              <Button variant="ghost" onClick={() => onNavigate('profile')} className="text-xs sm:text-sm">
                <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Profile
              </Button>
              <Button variant="outline" onClick={onLogout} className="text-xs sm:text-sm">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome, {user.name}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Track your time and manage your tasks</p>
        </div>

        {/* Week Calendar Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{currentMonth}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDays.map((day) => {
                const isDayToday = isToday(day.date);
                const isSelected = isSelectedDate(day.date);
                
                return (
                  <button
                    key={day.dayOfWeek}
                    onClick={() => setSelectedDate(day.date)}
                    className={`p-2 sm:p-4 rounded-xl text-center transition-all ${
                      isSelected
                        ? 'gradient-purple text-white shadow-glow-purple scale-105'
                        : isDayToday
                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                        : 'glass hover:bg-white/20 border border-white/10'
                    }`}
                  >
                    <div className="text-[10px] sm:text-xs uppercase mb-1">{day.shortName}</div>
                    <div className="text-lg sm:text-2xl font-medium">{day.date.getDate()}</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* New Time Entry Section */}
        <Card className="mb-6">
          <CardHeader className="p-[24px]">
            <CardTitle>New Time Entry</CardTitle>
            <CardDescription>
              Add a new task for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {/* Row 1: Project and Task Name */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>Project *</Label>
                  <Select
                    value={newEntry.projectId}
                    onValueChange={(value) => setNewEntry(prev => ({ ...prev, projectId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Task Name *</Label>
                  <Input
                    value={newEntry.taskName}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, taskName: e.target.value }))}
                    placeholder="What did you work on?"
                  />
                </div>
              </div>

              {/* Row 2: Start and End Time */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>Start Time *</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={newEntry.startHour}
                      onValueChange={(value) => setNewEntry(prev => ({ ...prev, startHour: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => {
                          const hour = (i + 1).toString().padStart(2, '0');
                          return (
                            <SelectItem key={hour} value={hour}>
                              {hour}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newEntry.startMinute}
                      onValueChange={(value) => setNewEntry(prev => ({ ...prev, startMinute: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 60 }, (_, i) => {
                          const minute = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={minute} value={minute}>
                              {minute}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newEntry.startPeriod}
                      onValueChange={(value) => setNewEntry(prev => ({ ...prev, startPeriod: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="AM/PM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>End Time *</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={newEntry.endHour}
                      onValueChange={(value) => setNewEntry(prev => ({ ...prev, endHour: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => {
                          const hour = (i + 1).toString().padStart(2, '0');
                          return (
                            <SelectItem key={hour} value={hour}>
                              {hour}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newEntry.endMinute}
                      onValueChange={(value) => setNewEntry(prev => ({ ...prev, endMinute: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 60 }, (_, i) => {
                          const minute = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={minute} value={minute}>
                              {minute}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newEntry.endPeriod}
                      onValueChange={(value) => setNewEntry(prev => ({ ...prev, endPeriod: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="AM/PM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Row 3: Notes */}
              <div className="space-y-3">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes about this task..."
                  rows={3}
                />
              </div>

              {/* Row 4: Photos */}
              <div className="grid md:grid-cols-2 gap-4">
                <PhotoUpload
                  label="Before Work Photo (Optional)"
                  photoUrl={newEntry.beforePhotoUrl}
                  onUpload={(file) => handlePhotoUpload(file, 'before')}
                  onRemove={() => setNewEntry(prev => ({ ...prev, beforePhotoUrl: null }))}
                  uploading={uploading}
                />

                <PhotoUpload
                  label="After Work Photo (Optional)"
                  photoUrl={newEntry.afterPhotoUrl}
                  onUpload={(file) => handlePhotoUpload(file, 'after')}
                  onRemove={() => setNewEntry(prev => ({ ...prev, afterPhotoUrl: null }))}
                  uploading={uploading}
                />
              </div>

              {/* Submit Button */}
              <div>
                <Button onClick={handleSubmitEntry} disabled={uploading} className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Save Entry
                </Button>
                {uploadError && (
                  <p className="text-sm text-red-500 mt-2">{uploadError}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Entries List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Entries for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </CardTitle>
                <CardDescription>
                  Total: {getTotalHoursForDay()}h
                </CardDescription>
              </div>
              {isToday(selectedDate) && (
                <Badge className="text-xs">Today</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {todayEntries.length === 0 ? (
              <div className="text-center py-12 glass rounded-xl border border-white/10">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No entries for this date yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Add your first task above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEntries.map((entry) => (
                  <div key={entry.id} className="border-l-4 border-primary pl-4 py-3 glass rounded-r-xl hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{entry.taskName}</h4>
                        <p className="text-sm text-muted-foreground">{getProjectName(entry.projectId)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg text-primary font-medium">{(entry.duration / 60).toFixed(2)}h</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {new Date(entry.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} 
                      {' - '}
                      {new Date(entry.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic glass p-2 rounded">{entry.notes}</p>
                    )}
                    {(entry.beforePhotoUrl || entry.afterPhotoUrl) && (
                      <div className="flex gap-3 mt-3">
                        {entry.beforePhotoUrl && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Before:</p>
                            <img 
                              src={entry.beforePhotoUrl} 
                              alt="Before" 
                              className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-75 transition-opacity border border-white/20" 
                              onClick={() => window.open(entry.beforePhotoUrl, '_blank')} 
                            />
                          </div>
                        )}
                        {entry.afterPhotoUrl && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">After:</p>
                            <img 
                              src={entry.afterPhotoUrl} 
                              alt="After" 
                              className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-75 transition-opacity border border-white/20" 
                              onClick={() => window.open(entry.afterPhotoUrl, '_blank')} 
                            />
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
    </div>
  );
}