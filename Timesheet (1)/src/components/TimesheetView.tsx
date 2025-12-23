import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar as CalendarIcon, Trash2, Edit, Camera } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { projectId } from '../utils/supabase/info';

interface TimesheetViewProps {
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

export function TimesheetView({ user, session, onBack, onLogout }: TimesheetViewProps) {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);
  const [editForm, setEditForm] = useState({
    taskName: '',
    startTime: '',
    endTime: '',
    notes: '',
  });
  const [filterProjectId, setFilterProjectId] = useState('all');

  useEffect(() => {
    fetchProjects();
    fetchTimesheets();
  }, [selectedDate, filterProjectId]);

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

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
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

  const getEntriesForDate = (date: Date) => {
    return timesheets.filter(entry => {
      const entryDate = new Date(entry.startTime);
      return entryDate.toDateString() === date.toDateString();
    });
  };

  const getTotalHoursForDate = (date: Date) => {
    const entries = getEntriesForDate(date);
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);
    return (totalMinutes / 60).toFixed(2);
  };

  const handleEditEntry = (entry: TimesheetEntry) => {
    setSelectedEntry(entry);
    setEditForm({
      taskName: entry.taskName,
      startTime: new Date(entry.startTime).toISOString().slice(0, 16),
      endTime: new Date(entry.endTime).toISOString().slice(0, 16),
      notes: entry.notes || '',
    });
    setShowEditDialog(true);
  };

  const handleUpdateEntry = async () => {
    if (!selectedEntry) return;

    const start = new Date(editForm.startTime);
    const end = new Date(editForm.endTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 60000);

    if (duration <= 0) {
      alert('End time must be after start time');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/timesheets/${selectedEntry.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            taskName: editForm.taskName,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            duration,
            notes: editForm.notes,
          }),
        }
      );
      
      if (response.ok) {
        setShowEditDialog(false);
        setSelectedEntry(null);
        fetchTimesheets();
      }
    } catch (error) {
      console.error('Error updating timesheet:', error);
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
        fetchTimesheets();
      }
    } catch (error) {
      console.error('Error deleting timesheet:', error);
    }
  };

  const groupEntriesByDate = () => {
    const grouped = new Map<string, TimesheetEntry[]>();
    timesheets.forEach(entry => {
      const date = new Date(entry.startTime).toDateString();
      const existing = grouped.get(date) || [];
      grouped.set(date, [...existing, entry]);
    });
    return Array.from(grouped.entries()).sort((a, b) => 
      new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button variant="ghost" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl text-gray-900">My Timesheets</h1>
          <p className="text-gray-600">View and manage your time entries</p>
        </div>

        {/* Filters and View Toggle */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label>Filter by Project</Label>
                <Select
                  value={filterProjectId}
                  onValueChange={setFilterProjectId}
                >
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

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                >
                  List View
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'outline'}
                  onClick={() => setViewMode('calendar')}
                >
                  Calendar View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading timesheets...</p>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'calendar' ? (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Entries for {selectedDate.toLocaleDateString()}
                </CardTitle>
                <CardDescription>
                  Total: {getTotalHoursForDate(selectedDate)} hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getEntriesForDate(selectedDate).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No entries for this date</p>
                ) : (
                  <div className="space-y-3">
                    {getEntriesForDate(selectedDate).map((entry) => (
                      <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h4 className="text-gray-900">{entry.taskName}</h4>
                            <p className="text-sm text-gray-600">{getProjectName(entry.projectId)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600">{(entry.duration / 60).toFixed(2)}h</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditEntry(entry)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(entry.startTime).toLocaleTimeString()} - {new Date(entry.endTime).toLocaleTimeString()}
                        </p>
                        {entry.notes && (
                          <p className="text-sm text-gray-600 mt-1 italic">{entry.notes}</p>
                        )}
                        {(entry.beforePhotoUrl || entry.afterPhotoUrl) && (
                          <div className="flex gap-2 mt-2">
                            {entry.beforePhotoUrl && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Before:</p>
                                <img src={entry.beforePhotoUrl} alt="Before" className="w-16 h-16 object-cover rounded cursor-pointer hover:scale-150 transition-transform" />
                              </div>
                            )}
                            {entry.afterPhotoUrl && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">After:</p>
                                <img src={entry.afterPhotoUrl} alt="After" className="w-16 h-16 object-cover rounded cursor-pointer hover:scale-150 transition-transform" />
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Time Entries</CardTitle>
              <CardDescription>Grouped by date</CardDescription>
            </CardHeader>
            <CardContent>
              {timesheets.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No time entries found</p>
              ) : (
                <div className="space-y-6">
                  {groupEntriesByDate().map(([date, entries]) => {
                    const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);
                    return (
                      <div key={date}>
                        <div className="flex justify-between items-center mb-3 pb-2 border-b">
                          <h3 className="text-gray-900">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                          <span className="text-blue-600">{(totalMinutes / 60).toFixed(2)}h</span>
                        </div>
                        <div className="space-y-3">
                          {entries.map((entry) => (
                            <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r-lg">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <h4 className="text-gray-900">{entry.taskName}</h4>
                                  <p className="text-sm text-gray-600">{getProjectName(entry.projectId)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-600">{(entry.duration / 60).toFixed(2)}h</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditEntry(entry)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-500">
                                {new Date(entry.startTime).toLocaleTimeString()} - {new Date(entry.endTime).toLocaleTimeString()}
                              </p>
                              {entry.notes && (
                                <p className="text-sm text-gray-600 mt-1 italic">{entry.notes}</p>
                              )}
                              {(entry.beforePhotoUrl || entry.afterPhotoUrl) && (
                                <div className="flex gap-2 mt-2">
                                  {entry.beforePhotoUrl && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Before:</p>
                                      <img src={entry.beforePhotoUrl} alt="Before" className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity" onClick={() => window.open(entry.beforePhotoUrl, '_blank')} />
                                    </div>
                                  )}
                                  {entry.afterPhotoUrl && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">After:</p>
                                      <img src={entry.afterPhotoUrl} alt="After" className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity" onClick={() => window.open(entry.afterPhotoUrl, '_blank')} />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Entry Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>Update your timesheet entry details</DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              <div>
                <Label>Task Name</Label>
                <Input
                  value={editForm.taskName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, taskName: e.target.value }))}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes..."
                />
              </div>

              {(selectedEntry.beforePhotoUrl || selectedEntry.afterPhotoUrl) && (
                <div>
                  <Label>Photos (cannot be edited)</Label>
                  <div className="flex gap-2 mt-2">
                    {selectedEntry.beforePhotoUrl && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Before:</p>
                        <img src={selectedEntry.beforePhotoUrl} alt="Before" className="w-24 h-24 object-cover rounded" />
                      </div>
                    )}
                    {selectedEntry.afterPhotoUrl && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">After:</p>
                        <img src={selectedEntry.afterPhotoUrl} alt="After" className="w-24 h-24 object-cover rounded" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleUpdateEntry}>Save Changes</Button>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}