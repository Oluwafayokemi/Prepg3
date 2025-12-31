// apps/admin/components/AdminLayout.jsx
'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'aws-amplify/auth';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #f9fafb;
`;

const Sidebar = styled.aside`
  width: 16rem;
  background-color: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const Logo = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #dc2626;
  margin: 0;
`;

const Nav = styled.nav`
  flex: 1;
  padding: 1rem;
`;

const NavItem = styled.a`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  margin-bottom: 0.25rem;
  border-radius: 0.375rem;
  color: ${props => props.$active ? '#dc2626' : '#6b7280'};
  background-color: ${props => props.$active ? '#fef2f2' : 'transparent'};
  font-weight: ${props => props.$active ? '500' : '400'};
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    background-color: #f3f4f6;
    color: #111827;
  }
`;

const SidebarFooter = styled.div`
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s ease;

  &:hover {
    background-color: #fef2f2;
    border-color: #fecaca;
    color: #dc2626;
  }
`;

const Main = styled.main`
  flex: 1;
  overflow-y: auto;
`;

const Header = styled.header`
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const Content = styled.div`
  padding: 2rem;
  max-width: 1280px;
  margin: 0 auto;
`;

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  { name: 'Investors', path: '/investors', icon: '👥' },
  { name: 'Properties', path: '/properties', icon: '🏠' },
  { name: 'Reports', path: '/reports', icon: '📈' },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    
    setLoggingOut(true);
    
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setLoggingOut(false);
    }
  };

  return (
    <Container>
      <Sidebar>
        <SidebarHeader>
          <Logo>PREPG3 Admin</Logo>
        </SidebarHeader>

        <Nav>
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              $active={pathname === item.path}
              onClick={() => router.push(item.path)}
            >
              <span style={{ marginRight: '0.75rem' }}>{item.icon}</span>
              {item.name}
            </NavItem>
          ))}
        </Nav>

        <SidebarFooter>
          <LogoutButton onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Logging out...' : '🚪 Logout'}
          </LogoutButton>
        </SidebarFooter>
      </Sidebar>

      <Main>
        <Header>
          <HeaderTitle>Admin Panel</HeaderTitle>
        </Header>
        
        <Content>
          {children}
        </Content>
      </Main>
    </Container>
  );
}