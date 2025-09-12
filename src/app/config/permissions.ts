// Roles and permissions used in the frontend
export const Roles = {
  Admin: 'ADMIN',
  RefManager: 'REF_MANAGER',
} as const;

export const Perms = {
  // Admin management
  Admin: {
    ManageUsersView: 'ADMIN_MANAGE_USERS_CAN_VIEW',
    ManageRolesView: 'ADMIN_MANAGE_ROLES_CAN_VIEW',
  },

  // Référentiels (reference data)
  Reference: {
    Status: {
      Create: 'REFERENCE_STATUS_CREATE',
      Read: 'REFERENCE_STATUS_READ',
      Update: 'REFERENCE_STATUS_UPDATE',
      Delete: 'REFERENCE_STATUS_DELETE',
    },
    Site: {
      Create: 'REFERENCE_SITE_CREATE',
      Read: 'REFERENCE_SITE_READ',
      Update: 'REFERENCE_SITE_UPDATE',
      Delete: 'REFERENCE_SITE_DELETE',
    },
    Priority: {
      Create: 'REFERENCE_PRIORITY_CREATE',
      Read: 'REFERENCE_PRIORITY_READ',
      Update: 'REFERENCE_PRIORITY_UPDATE',
      Delete: 'REFERENCE_PRIORITY_DELETE',
    },
  },
} as const;

