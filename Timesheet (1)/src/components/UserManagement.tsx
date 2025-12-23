import { useState, useEffect } from 'react';
import { UserPlus, Edit, Mail, Search, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { projectId } from '../utils/supabase/info';

interface UserManagementProps {
  user: any;
  session: any;
}

interface TeamUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export function UserManagement({ user, session }: UserManagementProps) {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
  const [editRole, setEditRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (targetUser: TeamUser) => {
    setSelectedUser(targetUser);
    setEditRole(targetUser.role);
    setShowEditDialog(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/users/${selectedUser.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            role: editRole,
          }),
        }
      );
      
      if (response.ok) {
        setShowEditDialog(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedUser.name}? This will permanently remove their account from the organization and Supabase.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/users/${selectedUser.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      
      if (response.ok) {
        setShowEditDialog(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (!selectedUserIds.length) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedUserIds.length} user(s)? This will permanently remove their accounts from the organization and Supabase.`)) {
      return;
    }
    
    setBulkDeleting(true);
    let successCount = 0;
    let failCount = 0;
    
    try {
      // Delete users one by one
      for (const userId of selectedUserIds) {
        try {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/users/${userId}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            }
          );
          
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }
      
      // Clear selection and refresh the list
      setSelectedUserIds([]);
      
      // Small delay to ensure database updates propagate
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchUsers();
      
      if (failCount > 0) {
        alert(`Deleted ${successCount} user(s). Failed to delete ${failCount} user(s).`);
      } else {
        alert(`Successfully deleted ${successCount} user(s).`);
      }
    } catch (error) {
      console.error('Error deleting users:', error);
      alert('Failed to delete users');
      setSelectedUserIds([]);
      await fetchUsers();
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    const filteredUsers = users.filter((teamUser) =>
      teamUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teamUser.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const selectableUsers = filteredUsers.filter(u => u.id !== user.id);
    
    if (selectedUserIds.length === selectableUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(selectableUsers.map(u => u.id));
    }
  };

  const filteredUsers = users.filter((teamUser) =>
    teamUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teamUser.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-lg sm:text-xl">Team Members</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Manage user roles and permissions</CardDescription>
            </div>
            <div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm sm:text-base">No users found</p>
          ) : (
            <>
              {/* Bulk actions bar */}
              {filteredUsers.filter(u => u.id !== user.id).length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 p-3 glass rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedUserIds.length === filteredUsers.filter(u => u.id !== user.id).length && selectedUserIds.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-xs sm:text-sm">
                      {selectedUserIds.length > 0 ? `${selectedUserIds.length} selected` : 'Select all'}
                    </span>
                  </div>
                  {selectedUserIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDeleteUsers}
                      disabled={bulkDeleting}
                      className="text-xs sm:text-sm w-full sm:w-auto"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedUserIds.length})`}
                    </Button>
                  )}
                </div>
              )}
              
              <div className="space-y-3 sm:space-y-4">
                {filteredUsers.map((teamUser) => (
                  <div
                    key={teamUser.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-white/10 rounded-lg hover:glass-strong hover:border-primary/30 transition-all gap-3 sm:gap-0"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {teamUser.id !== user.id && (
                        <Checkbox
                          checked={selectedUserIds.includes(teamUser.id)}
                          onCheckedChange={() => toggleSelectUser(teamUser.id)}
                          className="flex-shrink-0"
                        />
                      )}
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm sm:text-base text-primary font-medium">
                          {teamUser.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-base font-medium truncate">{teamUser.name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{teamUser.email}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start">
                      <Badge variant={teamUser.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {teamUser.role}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(teamUser)}
                        className="text-xs sm:text-sm"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit User</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Update user role and permissions</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs sm:text-sm">Name</Label>
                <Input value={selectedUser.name} disabled className="text-sm" />
              </div>

              <div>
                <Label className="text-xs sm:text-sm">Email</Label>
                <Input value={selectedUser.email} disabled className="text-sm" />
              </div>

              <div>
                <Label className="text-xs sm:text-sm">Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button onClick={handleSaveUser} className="w-full sm:w-auto text-sm">Save Changes</Button>
                <Button variant="outline" onClick={() => setShowEditDialog(false)} className="w-full sm:w-auto text-sm">
                  Cancel
                </Button>
              </div>
              
              {selectedUser.id !== user.id && (
                <div className="pt-4 border-t">
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">Danger Zone</p>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteUser} 
                    disabled={deleting}
                    className="w-full text-sm"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    {deleting ? 'Deleting...' : 'Delete User Account'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Users Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Bulk Delete Users</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Permanently remove selected user accounts from the organization and Supabase</DialogDescription>
          </DialogHeader>

          {selectedUserIds.length > 0 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs sm:text-sm">Selected Users</Label>
                <div className="space-y-2">
                  {selectedUserIds.map(userId => {
                    const user = users.find(u => u.id === userId);
                    return (
                      <div key={userId} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedUserIds.includes(userId)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUserIds([...selectedUserIds, userId]);
                            } else {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
                            }
                          }}
                        />
                        <span className="text-sm">{user?.name || 'Unknown User'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button onClick={handleBulkDeleteUsers} className="w-full sm:w-auto text-sm">Delete Selected Users</Button>
                <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)} className="w-full sm:w-auto text-sm">
                  Cancel
                </Button>
              </div>
              
              {bulkDeleting && (
                <div className="pt-4 border-t">
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">Deleting...</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}