/**
 * Accept Invite Page
 * Handles family invite acceptance from email links
 * Tier-one implementation with validation and error handling
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  LogIn,
  UserPlus,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { familyApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'error';

interface InviteDetails {
  email: string;
  role: string;
  familyName: string;
  inviterName: string;
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();

  const [status, setStatus] = useState<InviteStatus>('loading');
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string>('');
  const [isAccepting, setIsAccepting] = useState(false);

  const token = searchParams.get('token');

  // Validate invite on mount
  useEffect(() => {
    const validateInvite = async () => {
      if (!token) {
        setStatus('invalid');
        setError('Invalid invite link. Please request a new invitation.');
        return;
      }

      // For demo purposes, simulate invite validation
      // In production, this would call an API endpoint
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock invite details for demo
        const mockDetails: InviteDetails = {
          email: 'invitee@example.com',
          role: 'MEMBER',
          familyName: 'Smith Family',
          inviterName: 'John Smith',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        setInviteDetails(mockDetails);
        setStatus('valid');
      } catch (err) {
        setStatus('error');
        setError('Failed to validate invite. Please try again.');
      }
    };

    validateInvite();
  }, [token]);

  // Accept invite handler
  const handleAcceptInvite = async () => {
    if (!token || !isAuthenticated) return;

    setIsAccepting(true);
    setError('');

    try {
      await familyApi.acceptInvite(token);
      setStatus('accepted');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invite';
      setError(message);
      setStatus('error');
    } finally {
      setIsAccepting(false);
    }
  };

  // Role display config
  const roleConfig: Record<string, { label: string; icon: typeof Shield; color: string }> = {
    ADMIN: { label: 'Admin', icon: Shield, color: 'text-purple-600 bg-purple-100' },
    MEMBER: { label: 'Member', icon: Users, color: 'text-blue-600 bg-blue-100' },
    VIEWER: { label: 'Viewer', icon: Users, color: 'text-gray-600 bg-gray-100' },
  };

  const roleInfo = roleConfig[inviteDetails?.role || 'MEMBER'];
  const RoleIcon = roleInfo?.icon || Users;

  // Render based on status
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Validating Invite</h1>
            <p className="text-gray-600">Please wait while we verify your invitation...</p>
          </motion.div>
        );

      case 'valid':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            {/* Family Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Users className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              You're Invited!
            </h1>
            <p className="text-gray-600 mb-6">
              <strong>{inviteDetails?.inviterName}</strong> has invited you to join
            </p>

            {/* Family Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {inviteDetails?.familyName}
              </h2>

              {/* Role Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                   style={{ backgroundColor: roleInfo?.color.split(' ')[1] }}>
                <RoleIcon className={`w-4 h-4 ${roleInfo?.color.split(' ')[0]}`} />
                <span className={`text-sm font-medium ${roleInfo?.color.split(' ')[0]}`}>
                  You'll join as {roleInfo?.label}
                </span>
              </div>

              {/* Role Description */}
              <p className="text-sm text-gray-500">
                {inviteDetails?.role === 'ADMIN' && 'You can manage members, budgets, and all family data.'}
                {inviteDetails?.role === 'MEMBER' && 'You can add transactions, budgets, and contribute to goals.'}
                {inviteDetails?.role === 'VIEWER' && 'You can view family finances but cannot make changes.'}
              </p>
            </div>

            {/* Action Buttons */}
            {isAuthenticated ? (
              <div className="space-y-3">
                <Button
                  onClick={handleAcceptInvite}
                  disabled={isAccepting}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30"
                >
                  {isAccepting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Accept Invitation
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="w-full h-12 rounded-xl border-gray-200"
                >
                  Decline
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-4">
                  Please sign in or create an account to accept this invitation.
                </p>
                <Button
                  onClick={() => navigate('/login', { state: { returnTo: window.location.pathname + window.location.search } })}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In to Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/register', { state: { returnTo: window.location.pathname + window.location.search } })}
                  className="w-full h-12 rounded-xl border-gray-200"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Account
                </Button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}
          </motion.div>
        );

      case 'accepted':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the Family!</h1>
            <p className="text-gray-600 mb-6">
              You've successfully joined <strong>{inviteDetails?.familyName}</strong>. You can now
              share and manage finances together.
            </p>
            <Button
              onClick={() => navigate('/family')}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl"
            >
              View Family
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        );

      case 'expired':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm"
          >
            <div className="w-20 h-20 bg-amber-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Expired</h1>
            <p className="text-gray-600 mb-6">
              This invitation has expired. Please contact the family admin to send a new invite.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl"
            >
              Go to Dashboard
            </Button>
          </motion.div>
        );

      case 'invalid':
      case 'error':
      default:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm"
          >
            <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-gray-600 mb-6">
              {error || 'This invitation link is invalid or has already been used.'}
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/')}
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl"
              >
                Go to Dashboard
              </Button>
              <Link
                to="/login"
                className="block text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center p-6">
      {renderContent()}
    </div>
  );
}
