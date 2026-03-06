import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User as FirebaseUser } from 'firebase/auth';
import { setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { 
  signInWithGoogle, 
  signInWithEmail, 
  signUpWithEmail, 
  logoutUser,
  onAuthChange,
  isFirebaseInitialized,
  getUserRef
} from '@/lib/firebase';
import { UserProfile, Bankroll, UserSettings } from '@/types';
import { isDemoMode, enableDemoMode, disableDemoMode, getDemoUser } from '@/lib/demo-mode';

// Helper to sanitize data for Firestore (remove undefined values)
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as unknown as T;
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue; // Skip undefined values
    }
    if (typeof value === 'object') {
      sanitized[key] = sanitizeForFirestore(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  bankroll: Bankroll;
  settings: UserSettings;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemo: boolean;
  
  // Actions
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  updateBankroll: (amount: number) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  
  // Auth methods
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUserData: (userId: string) => Promise<void>;
  
  // Demo mode
  enableDemo: () => void;
  disableDemo: () => void;
}

const defaultBankroll: Bankroll = {
  current: 100,
  initial: 100,
  currency: 'USD'
};

const defaultSettings: UserSettings = {
  oddsFormat: 'decimal',
  theme: 'dark',
  notifications: true,
  defaultStake: 10,
  kellyFraction: 0.25,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      bankroll: defaultBankroll,
      settings: defaultSettings,
      isLoading: true,
      isAuthenticated: isDemoMode(),
      isDemo: isDemoMode(),
      
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        isLoading: false 
      }),
      
      setProfile: (profile) => set({ profile }),
      
      updateBankroll: (amount) => {
        const newBankroll = { ...get().bankroll, current: amount };
        set({ bankroll: newBankroll });
        
        // Sync to Firestore if authenticated
        const user = get().user;
        if (user && isFirebaseInitialized()) {
          const userRef = getUserRef(user.uid);
          const sanitizedData = sanitizeForFirestore({ bankroll: newBankroll });
          setDoc(userRef, sanitizedData, { merge: true }).catch(console.error);
        }
      },
      
      updateSettings: (newSettings) => {
        const settings = { ...get().settings, ...newSettings };
        set({ settings });
        
        // Sync to Firestore if authenticated
        const user = get().user;
        if (user && isFirebaseInitialized()) {
          const userRef = getUserRef(user.uid);
          const sanitizedData = sanitizeForFirestore({ settings });
          setDoc(userRef, sanitizedData, { merge: true }).catch(console.error);
        }
      },
      
      loginWithGoogle: async () => {
        if (!isFirebaseInitialized()) {
          throw new Error('Firebase no está configurado');
        }
        
        const result = await signInWithGoogle();
        const user = result.user;
        
        // Create or update user profile
        const profile: UserProfile = {
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Usuario',
          photoURL: user.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };
        
        const userRef = getUserRef(user.uid);
        const userData = sanitizeForFirestore({
          profile,
          bankroll: get().bankroll,
          settings: get().settings,
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now(),
        });
        await setDoc(userRef, userData, { merge: true });
        
        set({ user, profile, isAuthenticated: true });
      },
      
      loginWithEmail: async (email, password) => {
        if (!isFirebaseInitialized()) {
          throw new Error('Firebase no está configurado');
        }
        
        const result = await signInWithEmail(email, password);
        const user = result.user;
        
        // Load user data
        await get().loadUserData(user.uid);
        set({ user, isAuthenticated: true });
      },
      
      registerWithEmail: async (email, password, displayName) => {
        if (!isFirebaseInitialized()) {
          throw new Error('Firebase no está configurado. Verifica las variables de entorno.');
        }
        
        try {
          const result = await signUpWithEmail(email, password);
          const user = result.user;
          
          const profile: UserProfile = {
            id: user.uid,
            email: user.email || '',
            displayName,
            createdAt: new Date().toISOString(),
          };
          
          const userRef = getUserRef(user.uid);
          const userData = sanitizeForFirestore({
            profile,
            bankroll: defaultBankroll,
            settings: defaultSettings,
            createdAt: Timestamp.now(),
            lastLogin: Timestamp.now(),
          });
          await setDoc(userRef, userData);
          
          set({ user, profile, isAuthenticated: true });
        } catch (error: any) {
          console.error('[Auth] Registration error:', error);
          // Map Firebase errors to user-friendly messages
          const errorCode = error.code || '';
          const errorMessage = error.message || '';
          
          if (errorCode === 'auth/email-already-in-use') {
            throw new Error('Este correo ya está registrado. Intenta iniciar sesión.');
          } else if (errorCode === 'auth/invalid-email') {
            throw new Error('El correo electrónico no es válido.');
          } else if (errorCode === 'auth/weak-password') {
            throw new Error('La contraseña es muy débil. Usa al menos 6 caracteres.');
          } else if (errorCode === 'auth/network-request-failed') {
            throw new Error('Error de conexión. Verifica tu internet.');
          } else if (errorCode === 'auth/operation-not-allowed') {
            throw new Error('El registro por email está deshabilitado en Firebase. Contacta al administrador.');
          } else if (errorMessage.includes('permission-denied')) {
            throw new Error('Error de permisos en la base de datos. Verifica las reglas de Firestore.');
          } else {
            throw new Error(`Error al crear cuenta: ${errorMessage}`);
          }
        }
      },
      
      logout: async () => {
        // Check if in demo mode
        if (get().isDemo) {
          disableDemoMode();
          set({ 
            user: null, 
            profile: null, 
            isAuthenticated: false,
            isDemo: false,
            bankroll: defaultBankroll,
          });
          return;
        }
        
        if (!isFirebaseInitialized()) {
          set({ user: null, profile: null, isAuthenticated: false });
          return;
        }
        
        await logoutUser();
        set({ 
          user: null, 
          profile: null, 
          isAuthenticated: false,
          bankroll: defaultBankroll,
        });
      },
      
      enableDemo: () => {
        enableDemoMode();
        const demoUser = getDemoUser();
        const profile: UserProfile = {
          id: demoUser.uid,
          email: demoUser.email,
          displayName: demoUser.displayName,
          createdAt: new Date().toISOString(),
        };
        set({
          user: demoUser as any,
          profile,
          isAuthenticated: true,
          isDemo: true,
        });
      },
      
      disableDemo: () => {
        disableDemoMode();
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          isDemo: false,
        });
      },
      
      loadUserData: async (userId) => {
        if (!isFirebaseInitialized()) return;
        
        const userRef = getUserRef(userId);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.profile) set({ profile: data.profile });
          if (data.bankroll) set({ bankroll: data.bankroll });
          if (data.settings) set({ settings: { ...defaultSettings, ...data.settings } });
        }
      },
    }),
    {
      name: 'dg-picks-auth',
      partialize: (state) => ({ 
        settings: state.settings,
        bankroll: state.bankroll,
      }),
    }
  )
);

// Initialize auth state listener
export const initAuthListener = () => {
  // Check for demo mode first
  if (isDemoMode()) {
    const demoUser = getDemoUser();
    const state = useAuthStore.getState();
    const profile: UserProfile = {
      id: demoUser.uid,
      email: demoUser.email,
      displayName: demoUser.displayName,
      createdAt: new Date().toISOString(),
    };
    state.setUser(demoUser as any);
    state.setProfile(profile);
    return;
  }
  
  if (!isFirebaseInitialized()) {
    useAuthStore.getState().setUser(null);
    return;
  }
  
  onAuthChange((user) => {
    const state = useAuthStore.getState();
    
    if (user) {
      state.setUser(user);
      state.loadUserData(user.uid);
    } else {
      state.setUser(null);
    }
  });
};
