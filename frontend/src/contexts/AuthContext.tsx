import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { api } from '../utils/api';
import { User, Membership, Building, AuthState } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    membership: null,
    building: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const applyAuthUser = (user: User) => {
    console.log('Auth user applied', user?.email);
    setState(prev => ({
      user,
      membership: prev.membership ?? null,
      building: prev.building ?? null,
      isLoading: false,
      isAuthenticated: true,
    }));
  };

  const persistTokenWeb = (token: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem('session_token', token);
      return true;
    }
    return false;
  };

  const processSessionId = useCallback(async (sessionId: string) => {
    try {
      const response = await api.post<{ user: User; session_token: string }>('/auth/session', {
        session_id: sessionId,
      });

      try {
        await AsyncStorage.setItem('session_token', response.session_token);
      } catch (storageError) {
        console.warn('AsyncStorage unavailable, continuing without persistence', storageError);
      }
      persistTokenWeb(response.session_token);
      api.setToken(response.session_token);

      await refreshUser(true);
    } catch (error) {
      console.error('Session exchange error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const refreshUser = async (preserveAuth = false) => {
    try {
      const response = await api.get<{
        user: User;
        membership: Membership | null;
        building: Building | null;
      }>('/auth/me');

      setState({
        user: response.user,
        membership: response.membership,
        building: response.building,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      if (preserveAuth) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: Boolean(prev.user),
        }));
        return;
      }

      setState({
        user: null,
        membership: null,
        building: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const checkExistingSession = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        api.setToken(token);
        await refreshUser();
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      // Check for session_id in URL (web)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hash = window.location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        if (sessionIdMatch) {
          const sessionId = sessionIdMatch[1];
          window.history.replaceState(null, '', window.location.pathname);
          await processSessionId(sessionId);
          return;
        }
      }

      // Check for cold start deep link (mobile)
      if (Platform.OS !== 'web') {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const sessionIdMatch = initialUrl.match(/session_id=([^&]+)/);
          if (sessionIdMatch) {
            await processSessionId(sessionIdMatch[1]);
            return;
          }
        }
      }

      await checkExistingSession();
    };

    init();
  }, [processSessionId, checkExistingSession]);

  const login = async () => {
    const redirectUrl = Platform.OS === 'web'
      ? `${API_URL}/`
      : Linking.createURL('/');

    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === 'web') {
      window.location.href = authUrl;
    } else {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type === 'success' && result.url) {
        const sessionIdMatch = result.url.match(/session_id=([^&]+)/);
        if (sessionIdMatch) {
          await processSessionId(sessionIdMatch[1]);
        }
      }
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    const response = await api.post<{ user: User; session_token: string }>('/auth/login', {
      email,
      password,
    });

    console.log('Login response received', response?.user?.email);
    try {
      await AsyncStorage.setItem('session_token', response.session_token);
    } catch (storageError) {
      console.warn('AsyncStorage unavailable, continuing without persistence', storageError);
    }
    api.setToken(response.session_token);
    applyAuthUser(response.user);
    await refreshUser(true);
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await api.post<{ user: User; session_token: string }>('/auth/register', {
      name,
      email,
      password,
    });

    console.log('Register response received', response?.user?.email);
    try {
      await AsyncStorage.setItem('session_token', response.session_token);
    } catch (storageError) {
      console.warn('AsyncStorage unavailable, continuing without persistence', storageError);
    }
    api.setToken(response.session_token);
    applyAuthUser(response.user);
    await refreshUser(true);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }

    await AsyncStorage.removeItem('session_token');
    api.setToken(null);

    setState({
      user: null,
      membership: null,
      building: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const deleteAccount = async () => {
    await api.delete('/auth/account');
    await AsyncStorage.removeItem('session_token');
    api.setToken(null);

    setState({
      user: null,
      membership: null,
      building: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, loginWithEmail, register, logout, refreshUser, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
