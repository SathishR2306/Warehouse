// src/hooks/usePermissions.js
import { useAuth } from '../contexts/AuthContext';
import { ROLES, ROLE_PERMISSIONS } from '../constants';

const usePermissions = () => {
  const { userProfile } = useAuth();
  const role = userProfile?.role;

  // Get permissions from the ROLE_PERMISSIONS map, defaulting to staff (most restrictive)
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.STAFF] || {};

  const can = {
    manageUsers: permissions.manageUsers || false,
    createManager: permissions.createManager || false,
    createStaff: permissions.createStaff || false,
    manageProducts: permissions.manageProducts || false,
    manageInventory: permissions.manageInventory || false,
    manageWarehouses: permissions.manageWarehouses || false,
    manageSuppliers: permissions.manageSuppliers || false,
    manageOrders: permissions.manageOrders || false,
    manageCategories: permissions.manageCategories || false,
    viewOrders: permissions.viewOrders || false,
    viewAuditLogs: permissions.viewAuditLogs || false,
    deleteProducts: permissions.deleteProducts || false,
    adjustInventory: permissions.adjustInventory || false,
    approveOrders: permissions.approveOrders || false,
  };

  const requireRole = (requiredRole) => {
    const hierarchy = { admin: 3, manager: 2, staff: 1 };
    return (hierarchy[role] || 0) >= (hierarchy[requiredRole] || 0);
  };

  return { can, role, requireRole };
};

export default usePermissions;
