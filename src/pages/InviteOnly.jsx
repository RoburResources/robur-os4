import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/components/AuthLayout';

export default function InviteOnly() {
  return (
    <AuthLayout
      icon={Lock}
      title="Invite-only access"
      subtitle="This application is not open for public registration"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Back to log in
        </Link>
      }
    >
      <div className="space-y-4 text-center">
        <p className="text-sm text-foreground">
          To access this application, you need an invite link from Robur Resources.
        </p>
        <p className="text-xs text-muted-foreground">
          If you have an invite link, check your email for the onboarding instructions.
        </p>
        <Button asChild className="w-full h-12">
          <Link to="/login">Go to Log In</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}