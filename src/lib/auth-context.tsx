import React, { createContext, useContext, useState, useEffect } from "react";
import { api, login as apiLogin, logout as apiLogout, fetchMe, hasStoredSession } from "./api";
import { setPin, verifyPin, hasPin, setLastUserId, getLastUserId } from "./pin";
import { clearReadCache } from "./readCache";
import type { UserRole } from "./moduleCategories";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  userRole: UserRole;
  activeCompany: any | null;
  activeBrand: any | null;
  availableBrands: any[];
  setActiveBrand: (brand: any | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshBrands: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  pinLoginAvailable: boolean;
  setupQuickPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [activeCompany, setActiveCompany] = useState<any | null>(null);
  const [activeBrand, setActiveBrand] = useState<any | null>(null);
  const [availableBrands, setAvailableBrands] = useState<any[]>([]);
  const [pinLoginAvailable, setPinLoginAvailable] = useState(false);

  const userRole = (user?.role as UserRole) || "field_agent";


  const fetchTenantData = async () => {
    try {
      const company = await api.get<any>("/companies/me");
      setActiveCompany(company.data);

      const brands = await api.get<any>("/brands");
      setAvailableBrands(brands.data ?? []);
    } catch (error) {
      console.error("Failed to fetch tenant data:", error);
    }
  };

  const refreshBrands = async () => {
    try {
      const brands = await api.get<any>("/brands");
      setAvailableBrands(brands.data ?? []);
    } catch (error) {
      console.error("Failed to refresh brands:", error);
    }
  };

  const refreshAllData = async () => {
    await Promise.all([
      refreshBrands(),
    ]);
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        const lastUserId = await getLastUserId();
        if (lastUserId) {
          setPinLoginAvailable(await hasPin(lastUserId));
        }

        if (!(await hasStoredSession())) {
          setIsLoading(false);
          return;
        }

        const result = await fetchMe();
        // "transient" (network/server error, not a real 401) falls back
        // to the last-known cached profile rather than kicking the user
        // to the login screen — the stored tokens are still valid, this
        // device just couldn't verify them against the server right now.
        const me = result.status === "ok" ? result.user : result.status === "transient" ? result.cachedUser : null;
        if (me) {
          setUser(me);
          setIsAuthenticated(true);
          if (me.company_id) {
            await fetchTenantData();
          }
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
        setActiveCompany(null);
        setActiveBrand(null);
        setAvailableBrands([]);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // Deliberately does NOT touch the global isLoading flag — that flag
    // controls whether the root layout renders the whole app as a blank
    // spinner (only appropriate for the initial boot-time auth check).
    // Toggling it here used to unmount the login screen mid-request on
    // every attempt, silently discarding any error message.
    try {
      const me = await apiLogin(email, password);
      setUser(me);
      setIsAuthenticated(true);
      await setLastUserId(me.id);
      setPinLoginAvailable(await hasPin(me.id));
      if (me.company_id) {
        await fetchTenantData();
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      setActiveCompany(null);
      setActiveBrand(null);
      setAvailableBrands([]);
      throw error;
    }
  };

  const setupQuickPin = async (pin: string) => {
    if (!user?.id) throw new Error("You must be signed in to set up a PIN.");
    await setPin(user.id, pin);
    setPinLoginAvailable(true);
  };

  const unlockWithPin = async (pin: string): Promise<boolean> => {
    const lastUserId = await getLastUserId();
    if (!lastUserId) return false;

    const verified = await verifyPin(lastUserId, pin);
    if (!verified) return false;

    // PIN is correct — restore the already-persisted session rather than
    // re-authenticating with email/password (which we never store).
    try {
      const result = await fetchMe();
      const me = result.status === "ok" ? result.user : result.status === "transient" ? result.cachedUser : null;
      if (!me) return false;
      setUser(me);
      setIsAuthenticated(true);
      if (me.company_id) {
        await fetchTenantData();
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      await clearReadCache();
      setUser(null);
      setIsAuthenticated(false);
      setActiveCompany(null);
      setActiveBrand(null);
      setAvailableBrands([]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        userRole,
        activeCompany,
        activeBrand,
        availableBrands,
        setActiveBrand,
        login,
        logout,
        refreshBrands,
        refreshAllData,
        pinLoginAvailable,
        setupQuickPin,
        unlockWithPin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
