// components/AdminDashboard.tsx

import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_MY_PERMISSIONS = gql`
  query GetMyPermissions {
    getMyPermissions {
      role
      canApproveKYC
      canDeleteData
      canManageRoles
      canUpdateProperties
    }
  }
`;

export function AdminDashboard() {
  const { data } = useQuery(GET_MY_PERMISSIONS);
  const permissions = data?.getMyPermissions;

  return (
    <div>
      <h1>Admin Dashboard</h1>
      
      {/* Show based on permissions */}
      {permissions?.canApproveKYC && (
        <Link to="/admin/kyc">KYC Review Queue</Link>
      )}

      {permissions?.canUpdateProperties && (
        <Link to="/admin/properties">Manage Properties</Link>
      )}

      {permissions?.canManageRoles && (
        <Link to="/admin/users">Manage User Roles</Link>
      )}

      {permissions?.canDeleteData && (
        <div className="text-red-600">
          <Link to="/admin/dangerous">⚠️ Dangerous Operations</Link>
        </div>
      )}
    </div>
  );
}