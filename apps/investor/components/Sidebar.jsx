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
  position: relative;
  z-index: 45;

  @media (max-width: 768px) {
    position: fixed;
    top: 70px;
    left: 0;
    bottom: 0;
    width: ${props => props.$isOpen ? '16rem' : '0'};
  }
`;

const Nav = styled.nav`
  padding: 1rem 0;
  flex: 1;
  overflow-y: auto;
`;

const NavLink = styled.a`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  color: ${props => props.$active ? '#3F8392' : '#6b7280'};
  background: ${props => props.$active ? '#f0f9ff' : 'transparent'};
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
  border-left: 3px solid ${props => props.$active ? '#3F8392' : 'transparent'};

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }
`;

const Icon = styled.span`
  font-size: 1.25rem;
  flex-shrink: 0;
`;

const Label = styled.span`
  white-space: nowrap;
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

export default function Sidebar({ isOpen, onNavigate }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavClick = (href) => {
    router.push(href);
    // Call the callback to close sidebar on mobile
    if (onNavigate) {
      onNavigate();
    }
  };

  const isActive = (href) => {
    if (href === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <Container $isOpen={isOpen}>
      <Nav>
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            $active={isActive(item.href)}
            onClick={() => handleNavClick(item.href)}
          >
            <Icon>{item.icon}</Icon>
            <Label>{item.label}</Label>
          </NavLink>
        ))}
      </Nav>
    </Container>
  );
}