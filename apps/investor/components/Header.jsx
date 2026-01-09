// apps/investor/components/Header.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { Menu, Bell, LogOut, User } from "lucide-react";
import { signOut, getCurrentUser } from "aws-amplify/auth";
import Image from "next/image";
import logo from "../../shared/images/logo.png";

const HeaderContainer = styled.header`
  height: 70px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 50;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const MenuButton = styled.button`
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }

  svg {
    width: 24px;
    height: 24px;
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #3f8392;
  font-size: 1.5rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`;

const LogoIcon = styled.span`
  font-size: 2rem;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3f8392 0%, #2d5f6d 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
`;

const UserName = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;

  @media (max-width: 768px) {
    display: none;
  }
`;

const IconButton = styled.button`
  position: relative;
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  background: #ef4444;
  border: 2px solid white;
  border-radius: 50%;
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #fee2e2;
    border-color: #fecaca;
    color: #991b1b;
  }

  svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 640px) {
    span {
      display: none;
    }
    padding: 0.5rem;
  }
`;

export default function Header({ onMenuToggle, sidebarOpen }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error("Error loading user:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getInitials = () => {
    if (!user) return "U";
    // Try to get from attributes first, fallback to username
    const name = user.signInDetails?.loginId || user.username || "User";
    return name
      .split("@")[0] // Remove email domain if it's an email
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserName = () => {
    if (!user) return "User";
    const name = user.signInDetails?.loginId || user.username || "User";
    return name.split("@")[0]; // Clean email if present
  };

  return (
    <HeaderContainer>
      <LeftSection>
        <MenuButton onClick={onMenuToggle}>
          <Menu />
        </MenuButton>
        <Logo onClick={() => router.push("/dashboard")}>
          <Image src={logo} alt="Logo" width={50} height={50} />
          <span>PREPG3</span>
        </Logo>
      </LeftSection>

      <RightSection>
        <IconButton onClick={() => router.push("/notifications")}>
          <Bell />
          <Badge />
        </IconButton>

        <UserInfo onClick={() => router.push("/profile")}>
          <Avatar>{getInitials()}</Avatar>
          <UserName>{getUserName()}</UserName>
        </UserInfo>

        <LogoutButton onClick={handleLogout}>
          <LogOut />
          <span>Logout</span>
        </LogoutButton>
      </RightSection>
    </HeaderContainer>
  );
}
