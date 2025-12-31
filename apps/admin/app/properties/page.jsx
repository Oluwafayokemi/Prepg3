// apps/admin/app/properties/page.tsx
import { Button, Card, InvestorDashboard, formatCurrency } from '../../../shared';
import AdminLayout from '../../components/AdminLayout';
import styled from 'styled-components';

const Header = styled.h1`
  font-size: 2rem;
  margin-bottom: 1rem;
`;

export default function PropertiesPage() {

  return (
    <AdminLayout>
      <Header>Properties</Header>
      <Button>Add New Property</Button>
      {/* Properties list */}
    </AdminLayout>
  );
}
