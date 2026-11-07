export interface UserPermissions {
  isSuperAdmin: boolean;
  canViewAllTickets: boolean;
  canAssignTickets: boolean;
  canManageUsers: boolean;
  canPublishOffers: boolean;
  canNotifyEmployees: boolean;
  managementLevel: number;
}

export interface DesignationPermissions {
  canViewAllTickets: boolean;
  canAssignTickets: boolean;
  canManageUsers: boolean;
  canPublishOffers: boolean;
  canNotifyEmployees: boolean;
  managementLevel: number;
}

export interface AuthUser {
  id: string;
  role: "admin" | "employee" | "client" | string;

  organisation: string | null;
  organisationId: string | null;

  userName: string;
  email: string;

  designation: string | null;
  designationRef: DesignationPermissions | null;

  isSuperAdmin: boolean;
  isRevoked: boolean;
  tokenVersion: number;

  permissions: UserPermissions;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;

  login: (userName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
