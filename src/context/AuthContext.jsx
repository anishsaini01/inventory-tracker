import { createContext, useContext, useState } from 'react';
import { db } from '../db.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('manutrack_user')); } catch { return null; }
  });

  const login = (username, password) => {
    const found = db.findUser(username, password);
    if (found) {
      const { password: _, ...safe } = found;
      setUser(safe);
      localStorage.setItem('manutrack_user', JSON.stringify(safe));
      return { success: true, user: safe };
    }
    return { success: false };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('manutrack_user');
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
