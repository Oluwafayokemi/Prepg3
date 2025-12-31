// apps/investor/components/Sidebar.jsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import styled from 'styled-components';

const Container = styled.aside`
  width: ${props => props.$isOpen ? '16rem' : '0'};
  background: white;
  box-shadow: 1px 0 3px 0 rgb(0 0 0 / 0.1);
  transition: width 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Nav = styled.nav`
  padding: 1rem 0;
  flex: 1;
`;

const NavLink = styled.a`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  color: ${props => props.$active ? '#2563eb' : '#6b7280'};
  background: ${props => props.$active ? '#eff6ff' : 'transparent'};
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
  border-left: 3px solid ${props => props.$active ? '#2563eb' : 'transparent'};

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }
`;

const Icon = styled.span`
  font-size: 1.25rem;
`;

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/investments', icon: '💰', label: 'Investments' },
  { href: '/properties', icon: '🏠', label: 'Properties' },
  { href: '/transactions', icon: '💳', label: 'Transactions' },
  { href: '/documents', icon: '📄', label: 'Documents' },
  { href: '/profile', icon: '👤', label: 'Profile' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar({ isOpen }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Container $isOpen={isOpen}>
      <Nav>
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            $active={pathname === item.href}
            onClick={() => router.push(item.href)}
          >
            <Icon>{item.icon}</Icon>
            {item.label}
          </NavLink>
        ))}
      </Nav>
    </Container>
  );
}