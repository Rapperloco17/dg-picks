// Demo mode for development without Firebase
export const DEMO_USER = {
  uid: 'demo-user-id',
  email: 'demo@dgpicks.com',
  displayName: 'Usuario Demo',
  photoURL: null,
};

export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('dg-picks-demo-mode') === 'true';
};

export const enableDemoMode = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dg-picks-demo-mode', 'true');
  localStorage.setItem('dg-picks-demo-user', JSON.stringify(DEMO_USER));
};

export const disableDemoMode = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('dg-picks-demo-mode');
  localStorage.removeItem('dg-picks-demo-user');
};

export const getDemoUser = () => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('dg-picks-demo-user');
  return stored ? JSON.parse(stored) : DEMO_USER;
};
