/**
 * Family Page
 * Manage family members and invites
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  Shield,
  Eye,
  User,
  MoreVertical,
  X,
  Send,
  Loader2,
  AlertCircle,
  Clock,
  UserMinus,
  ArrowRightLeft,
} from 'lucide-react';
import { Page, Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFamilyStore } from '@/stores/familyStore';
import { useAuthStore } from '@/stores/authStore';

const roleIcons = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
  VIEWER: Eye,
};

const roleColors = {
  OWNER: 'text-amber-600 bg-amber-100',
  ADMIN: 'text-purple-600 bg-purple-100',
  MEMBER: 'text-blue-600 bg-blue-100',
  VIEWER: 'text-gray-600 bg-gray-100',
};

const roleLabels = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

export default function FamilyPage() {
  const { user } = useAuthStore();
  const {
    family,
    members,
    pendingInvites,
    isLoading,
    error,
    fetchFamily,
    sendInvite,
    cancelInvite,
    updateMemberRole,
    removeMember,
    clearError,
  } = useFamilyStore();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviteError, setInviteError] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      setInviteError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteError('Please enter a valid email');
      return;
    }

    try {
      await sendInvite(inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('MEMBER');
      setInviteError('');
      setIsInviteOpen(false);
    } catch {
      setInviteError('Failed to send invite');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      try {
        await removeMember(memberId);
        setSelectedMember(null);
      } catch {
        // Error handled by store
      }
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelInvite(inviteId);
    } catch {
      // Error handled by store
    }
  };

  const isOwner = family?.ownerId === user?.id;

  return (
    <Page>
      <Header
        title="Family"
        showBack
        rightActions={
          isOwner && (
            <Sheet open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <SheetTrigger asChild>
                <button className="p-2 -mr-2">
                  <UserPlus className="w-6 h-6 text-emerald-600" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>Invite Family Member</SheetTitle>
                </SheetHeader>
                <div className="py-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(e.target.value);
                          setInviteError('');
                        }}
                        className="pl-11 h-12 rounded-xl"
                      />
                    </div>
                    {inviteError && (
                      <p className="text-sm text-red-500">{inviteError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-purple-600" />
                            Admin - Can manage members and data
                          </div>
                        </SelectItem>
                        <SelectItem value="MEMBER">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            Member - Can add and edit data
                          </div>
                        </SelectItem>
                        <SelectItem value="VIEWER">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-gray-600" />
                            Viewer - Can only view data
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleSendInvite}
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Send Invite
                      </>
                    )}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )
        }
      />

      <div className="px-4 py-4 space-y-6">
        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={clearError}
                className="text-sm text-red-500 underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && !family && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        )}

        {/* Family Header */}
        {family && (
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{family.name}</h2>
                <p className="text-emerald-100">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Members List */}
        {members.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Members</h3>
            <div className="space-y-2">
              {members.map((member) => {
                const RoleIcon = roleIcons[member.role];
                const isCurrentUser = member.id === user?.id;

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border border-gray-100"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-semibold text-lg">
                      {member.firstName.charAt(0)}
                      {member.lastName.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {member.firstName} {member.lastName}
                          {isCurrentUser && (
                            <span className="text-gray-500 font-normal"> (You)</span>
                          )}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{member.email}</p>
                    </div>

                    {/* Role Badge */}
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${roleColors[member.role]}`}
                    >
                      <RoleIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{roleLabels[member.role]}</span>
                    </div>

                    {/* Actions */}
                    {isOwner && !isCurrentUser && member.role !== 'OWNER' && (
                      <button
                        onClick={() =>
                          setSelectedMember(selectedMember === member.id ? null : member.id)
                        }
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    )}

                    {/* Action Menu */}
                    <AnimatePresence>
                      {selectedMember === member.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-4 mt-32 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10"
                        >
                          <button
                            onClick={() => {
                              updateMemberRole(
                                member.id,
                                member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
                              );
                              setSelectedMember(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                            Change to {member.role === 'ADMIN' ? 'Member' : 'Admin'}
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <UserMinus className="w-4 h-4" />
                            Remove Member
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Pending Invites</h3>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <motion.div
                  key={invite.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{invite.email}</p>
                    <p className="text-sm text-gray-500">
                      Invited as {roleLabels[invite.role as keyof typeof roleLabels] || invite.role}
                    </p>
                  </div>

                  {isOwner && (
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !family && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Family Yet</h3>
            <p className="text-gray-500 mb-6">
              Create a family to share your finances with loved ones.
            </p>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
              Create Family
            </Button>
          </div>
        )}
      </div>
    </Page>
  );
}
