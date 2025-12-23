import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

interface ProjectManagementProps {
  user: any;
  session: any;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  assignedUsers: string[];
  createdAt: string;
}

interface TeamUser {
  id: string;
  name: string;
  email: string;
}

export function ProjectManagement({ user, session }: ProjectManagementProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assignedUsers: [] as string[],
  });

  useEffect(() => {
    fetchProjects();
    fetchUsers();

    // Set up real-time subscription for projects
    const projectSubscription = supabase
      .channel('project-changes-mgmt')
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

    // Set up real-time subscription for users
    const userSubscription = supabase
      .channel('user-changes-mgmt')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kv_store_3af6643f',
          filter: `key=like.user:%`
        },
        (payload) => {
          console.log('Real-time user update:', payload);
          fetchUsers();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      projectSubscription.unsubscribe();
      userSubscription.unsubscribe();
    };
  }, []);

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
    } finally {
      setLoading(false);
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

  const handleCreateProject = async () => {
    if (!formData.name) {
      alert('Please enter a project name');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/projects`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(formData),
        }
      );
      
      if (response.ok) {
        setShowCreateDialog(false);
        setFormData({ name: '', description: '', assignedUsers: [] });
        setUserSearchTerm(''); // Clear search when closing dialog
        fetchProjects();
      }
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      assignedUsers: project.assignedUsers,
    });
    setUserSearchTerm(''); // Clear search when opening dialog
    setShowEditDialog(true);
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !formData.name) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/projects/${selectedProject.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(formData),
        }
      );
      
      if (response.ok) {
        setShowEditDialog(false);
        setSelectedProject(null);
        setFormData({ name: '', description: '', assignedUsers: [] });
        fetchProjects();
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/projects/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      
      if (response.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const toggleUserAssignment = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(userId)
        ? prev.assignedUsers.filter(id => id !== userId)
        : [...prev.assignedUsers, userId],
    }));
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading projects...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl">Projects</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Create and manage projects for your team</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto text-sm">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {projects.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-500 mb-4 text-sm sm:text-base">No projects yet</p>
              <Button onClick={() => setShowCreateDialog(true)} className="text-sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="border border-white/10 rounded-lg p-3 sm:p-4 hover:glass-strong hover:border-primary/30 transition-all"
                >
                  <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-medium mb-1 truncate">{project.name}</h3>
                      {project.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditProject(project)}
                        className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProject(project.id)}
                        className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{project.assignedUsers.length} assigned</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setUserSearchTerm(''); // Clear search when dialog closes
        }
      }}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Create New Project</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Add a new project and assign team members</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs sm:text-sm">Project Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter project name"
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm">Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter project description"
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm">Assign Users</Label>
              <div className="relative mt-2 mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border rounded-lg p-2 sm:p-3">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs sm:text-sm text-gray-500 text-center py-4">
                    No users found matching "{userSearchTerm}"
                  </p>
                ) : (
                  filteredUsers.map((teamUser) => (
                    <div key={teamUser.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${teamUser.id}`}
                        checked={formData.assignedUsers.includes(teamUser.id)}
                        onCheckedChange={() => toggleUserAssignment(teamUser.id)}
                      />
                      <label
                        htmlFor={`user-${teamUser.id}`}
                        className="text-xs sm:text-sm cursor-pointer flex-1 truncate"
                      >
                        {teamUser.name} ({teamUser.email})
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button onClick={handleCreateProject} className="w-full sm:w-auto text-sm">Create Project</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setFormData({ name: '', description: '', assignedUsers: [] });
                  setUserSearchTerm(''); // Clear search when closing dialog
                }}
                className="w-full sm:w-auto text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setUserSearchTerm(''); // Clear search when dialog closes
        }
      }}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Project</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Update project details and assignments</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs sm:text-sm">Project Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter project name"
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm">Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter project description"
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm">Assign Users</Label>
              <div className="relative mt-2 mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border rounded-lg p-2 sm:p-3">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs sm:text-sm text-gray-500 text-center py-4">
                    No users found matching "{userSearchTerm}"
                  </p>
                ) : (
                  filteredUsers.map((teamUser) => (
                    <div key={teamUser.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-user-${teamUser.id}`}
                        checked={formData.assignedUsers.includes(teamUser.id)}
                        onCheckedChange={() => toggleUserAssignment(teamUser.id)}
                      />
                      <label
                        htmlFor={`edit-user-${teamUser.id}`}
                        className="text-xs sm:text-sm cursor-pointer flex-1 truncate"
                      >
                        {teamUser.name} ({teamUser.email})
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button onClick={handleUpdateProject} className="w-full sm:w-auto text-sm">Save Changes</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedProject(null);
                  setFormData({ name: '', description: '', assignedUsers: [] });
                }}
                className="w-full sm:w-auto text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}