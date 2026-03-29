'use client';

import { createContext, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser, useLogout } from '@/features/auth/api/use-auth';
import type { User } from '@ethos/shared';

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  const logoutMutation = useLogout();

  const logout = useCallback(() => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => router.push('/login'),
    });
  }, [logoutMutation, router]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
