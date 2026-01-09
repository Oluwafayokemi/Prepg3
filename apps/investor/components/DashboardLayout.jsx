// apps/investor/components/DashboardLayout.jsx
"use client";

import { useState, useEffect } from "react";
import styled from "styled-components";
import Header from "./Header";
import Sidebar from "./Sidebar";

const LayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem 1.5rem;
  overflow-y: auto;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;

  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

// Overlay for mobile when sidebar is open
const Overlay = styled.div`
  display: ${(props) => (props.$isOpen ? "block" : "none")};
  position: fixed;
  top: 70px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;

  @media (min-width: 769px) {
    display: none;
  }
`;

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile on mount
    const checkMobile = () => {
      const mobile = window.innerWidth < 769;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebarOnMobile = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <LayoutContainer>
      <Header onMenuToggle={toggleSidebar} sidebarOpen={sidebarOpen} />
      <ContentWrapper>
        <Sidebar isOpen={sidebarOpen} onNavigate={closeSidebarOnMobile} />
        <MainContent>{children}</MainContent>
        <Overlay
          $isOpen={sidebarOpen && isMobile}
          onClick={closeSidebarOnMobile}
        />
      </ContentWrapper>
    </LayoutContainer>
  );
}
