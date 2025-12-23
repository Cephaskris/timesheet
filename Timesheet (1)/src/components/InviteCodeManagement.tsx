import { useState, useEffect } from 'react';
import { Ticket, Copy, Trash2, Plus, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';

interface InviteCodeManagementProps {
  user: any;
  session: any;
}

export function InviteCodeManagement({ user, session }: InviteCodeManagementProps) {
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchInviteCodes();
  }, []);

  const fetchInviteCodes = async () => {
    try {
      console.log('Fetching invite codes for orgId:', user.orgId);
      console.log('Using access token:', session.access_token ? 'Present' : 'Missing');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/invite-codes/${user.orgId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      console.log('Response status:', response.status);

      if (response.ok) {
        const codes = await response.json();
        console.log('Fetched codes:', codes);
        setInviteCodes(codes);
      } else {
        const error = await response.json();
        console.error('Error fetching invite codes:', error);
        toast.error('Failed to fetch invite codes');
      }
    } catch (error) {
      console.error('Error fetching invite codes:', error);
      toast.error('Unable to connect to server. Please check your connection.');
    }
  };

  const createInviteCode = async () => {
    setLoading(true);
    try {
      console.log('=== FRONTEND: Creating invite code ===');
      console.log('Request body:', {
        expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
      });
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/invite-codes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
            maxUses: maxUses ? parseInt(maxUses) : null,
          }),
        }
      );

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('SUCCESS! Server returned:', result);
        console.log('Created code:', result.inviteCode?.code);
        toast.success('Invite code created successfully');
        setInviteCodes([result.inviteCode, ...inviteCodes]);
        setCreateDialogOpen(false);
        setExpiresInDays('');
        setMaxUses('');
      } else {
        const error = await response.json();
        console.error('ERROR response from server:', error);
        toast.error(error.error || 'Failed to create invite code');
      }
    } catch (error) {
      console.error('Error creating invite code:', error);
      toast.error('Failed to create invite code');
    } finally {
      setLoading(false);
    }
  };

  const toggleInviteCode = async (codeId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/invite-codes/${codeId}/toggle`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(result.inviteCode.isActive ? 'Invite code activated' : 'Invite code deactivated');
        setInviteCodes(inviteCodes.map(c => c.id === codeId ? result.inviteCode : c));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to toggle invite code');
      }
    } catch (error) {
      console.error('Error toggling invite code:', error);
      toast.error('Failed to toggle invite code');
    }
  };

  const deleteInviteCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this invite code?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/invite-codes/${codeId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Invite code deleted');
        setInviteCodes(inviteCodes.filter(c => c.id !== codeId));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete invite code');
      }
    } catch (error) {
      console.error('Error deleting invite code:', error);
      toast.error('Failed to delete invite code');
    }
  };

  const copyToClipboard = async (code: string) => {
    // Try modern Clipboard API first
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success('Code copied to clipboard');
        setTimeout(() => setCopiedCode(null), 2000);
        return;
      }
    } catch (clipboardError) {
      console.log('Clipboard API failed, trying fallback method:', clipboardError);
    }
    
    // Fallback method using execCommand
    try {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopiedCode(code);
        toast.success('Code copied to clipboard');
        setTimeout(() => setCopiedCode(null), 2000);
        return;
      }
    } catch (execError) {
      console.error('ExecCommand copy failed:', execError);
    }
    
    // Last resort: show the code in the toast
    toast.error('Unable to copy automatically. Code: ' + code);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isMaxUsesReached = (code: any) => {
    if (!code.maxUses) return false;
    return code.currentUses >= code.maxUses;
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Ticket className="h-4 w-4 sm:h-5 sm:w-5" />
              Invite Codes
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Generate invite codes for staff to self-register and join your organization
            </CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto text-sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Code
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Create Invite Code</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Generate a new invite code for staff members to join your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="expiresInDays" className="text-xs sm:text-sm">Expires in (days)</Label>
                  <Input
                    id="expiresInDays"
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="Leave empty for no expiration"
                    min="1"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="maxUses" className="text-xs sm:text-sm">Maximum uses</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Leave empty for unlimited"
                    min="1"
                    className="text-sm"
                  />
                </div>
                <Button onClick={createInviteCode} disabled={loading} className="w-full text-sm">
                  {loading ? 'Creating...' : 'Create Invite Code'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {inviteCodes.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-500">
            <Ticket className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm sm:text-base">No invite codes yet</p>
            <p className="text-xs sm:text-sm">Create one to allow staff to self-register</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inviteCodes.map((code) => {
              const expired = isExpired(code.expiresAt);
              const maxed = isMaxUsesReached(code);
              const inactive = !code.isActive || expired || maxed;

              return (
                <div
                  key={code.id}
                  className={`border rounded-lg p-3 sm:p-4 ${inactive ? 'bg-gray-50 opacity-75' : 'bg-white'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <code className="text-sm sm:text-lg px-2 py-1 sm:px-3 sm:py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 break-all">
                          {code.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(code.code)}
                          className="h-8 w-8 p-0 flex-shrink-0"
                        >
                          {copiedCode === code.code ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        {code.isActive && !expired && !maxed && (
                          <Badge variant="default" className="bg-green-600 text-xs">Active</Badge>
                        )}
                        {!code.isActive && (
                          <Badge variant="secondary" className="text-xs">Disabled</Badge>
                        )}
                        {expired && (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        )}
                        {maxed && (
                          <Badge variant="secondary" className="text-xs">Max Uses Reached</Badge>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                        <div>
                          Created: {new Date(code.createdAt).toLocaleDateString()}
                        </div>
                        {code.expiresAt && (
                          <div>
                            Expires: {new Date(code.expiresAt).toLocaleDateString()}
                          </div>
                        )}
                        <div>
                          Uses: {code.currentUses} {code.maxUses ? `/ ${code.maxUses}` : '(unlimited)'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end sm:justify-start flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleInviteCode(code.id)}
                        disabled={expired || maxed}
                        title={code.isActive ? 'Deactivate' : 'Activate'}
                        className="h-9 w-9 p-0"
                      >
                        {code.isActive ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteInviteCode(code.id)}
                        className="h-9 w-9 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}