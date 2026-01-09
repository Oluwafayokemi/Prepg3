// apps/investor/app/dashboard/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
} from "aws-amplify/auth";
import styled from "styled-components";
import DashboardLayout from "../../components/DashboardLayout";
import { createAuthenticatedClient } from "../../../shared/lib/graph-client";

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #6b7280;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.875rem;
  font-weight: 600;
  color: ${(props) => props.$color || "#111827"};
`;

const Section = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const GET_INVESTOR_DASHBOARD = `
  query GetInvestorDashboard($investorId: ID!) {
    getInvestorDashboard(investorId: $investorId) {
      totalInvested
      portfolioValue
      totalROI
      activeInvestments
      unreadNotifications
      recentTransactions {
        id
        type
        amount
        description
        date
      }
      properties {
        id
        address
        currentValuation
        status
      }
    }
  }
`;

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState(null);
  const [investorName, setInvestorName] = useState("");
  const client = createAuthenticatedClient();

  useEffect(() => {
    // Add a small delay to ensure auth provider has finished
    const timer = setTimeout(() => {
      setAuthChecked(true);
      loadDashboard();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📊 Dashboard: Starting to load...");

      const user = await getCurrentUser();
      console.log("✅ User found:", user);

      // ✅ Check session tokens
      const session = await fetchAuthSession();
      console.log("✅ Session:", {
        hasIdToken: !!session.tokens?.idToken,
        hasAccessToken: !!session.tokens?.accessToken,
      });

      if (!session.tokens?.idToken) {
        throw new Error("Auth not ready");
      }
      // ✅ Use email as investorId
      const investorId = user.username || user.userId;
      const attributes = await fetchUserAttributes();
      console.log("Step 9: Investor found:", {
        id: investorId,
        email: attributes.email,
      });
      setInvestorName(attributes.given_name || "Investor");

      if (!investorId) {
        setError("Could not determine user id");
        setLoading(false);
        return;
      }

      // Fetch dashboard data
      try {
        const result = await client.graphql({
          query: GET_INVESTOR_DASHBOARD,
          variables: { investorId },
        });

        console.log(
          "✅ Dashboard: Data received:",
          result.data.getInvestorDashboard
        );
        setDashboard(result.data.getInvestorDashboard);
      } catch (apiError) {
        console.error("❌ Dashboard: API error:", apiError);

        // Show detailed error
        const errorMessage =
          apiError.errors?.[0]?.message || apiError.message || "Unknown error";
        setError(`Failed to load dashboard: ${errorMessage}`);
      }
    } catch (err) {
      console.error("❌ Dashboard: Unexpected error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked || loading) {
    return (
      <DashboardLayout>
        <LoadingContainer>
          <p>Loading dashboard...</p>
        </LoadingContainer>
      </DashboardLayout>
    );
  }

  if (!dashboard) {
    return (
      <DashboardLayout>
        <PageHeader>
          <Title>Error Loading Dashboard</Title>
          <Subtitle>Unable to fetch your dashboard data</Subtitle>
        </PageHeader>
      </DashboardLayout>
    );
  }
  if (error) {
    return (
      <DashboardLayout>
        <PageHeader>
          <Title>Error Loading Dashboard</Title>
          <Subtitle style={{ color: "#ef4444" }}>
            Unable to load dashboard data
          </Subtitle>
        </PageHeader>
        <div
          style={{
            background: "#fef2f2",
            padding: "1.5rem",
            borderRadius: "0.5rem",
            border: "1px solid #fecaca",
            marginBottom: "1rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.5rem 0",
              color: "#991b1b",
              fontWeight: 600,
            }}
          >
            Error Details:
          </p>
          <p style={{ margin: 0, color: "#991b1b", fontSize: "0.875rem" }}>
            {error}
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setAuthChecked(false);
            setTimeout(() => {
              setAuthChecked(true);
              loadDashboard();
            }, 100);
          }}
          style={{
            background: "#3b82f6",
            color: "white",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            border: "none",
            fontSize: "1rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader>
        <Title>Welcome back, {investorName}!</Title>
        <Subtitle>Here's an overview of your investments</Subtitle>
      </PageHeader>

      <StatsGrid>
        <StatCard>
          <StatLabel>Total Invested</StatLabel>
          <StatValue>£{dashboard.totalInvested.toLocaleString()}</StatValue>
        </StatCard>

        <StatCard>
          <StatLabel>Portfolio Value</StatLabel>
          <StatValue>£{dashboard.portfolioValue.toLocaleString()}</StatValue>
        </StatCard>

        <StatCard>
          <StatLabel>Total ROI</StatLabel>
          <StatValue $color={dashboard.totalROI >= 0 ? "#10b981" : "#ef4444"}>
            {dashboard.totalROI.toFixed(2)}%
          </StatValue>
        </StatCard>

        <StatCard>
          <StatLabel>Active Investments</StatLabel>
          <StatValue>{dashboard.activeInvestments}</StatValue>
        </StatCard>
      </StatsGrid>

      <Section>
        <SectionTitle>Recent Transactions</SectionTitle>
        {dashboard.recentTransactions &&
        dashboard.recentTransactions.length > 0 ? (
          <div>
            {dashboard.recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                style={{
                  padding: "1rem 0",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {transaction.description}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {transaction.date}
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>
                  £{transaction.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#6b7280" }}>No recent transactions</p>
        )}
      </Section>

      <Section>
        <SectionTitle>Your Properties</SectionTitle>
        {dashboard.properties && dashboard.properties.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {dashboard.properties.map((property) => (
              <div
                key={property.id}
                style={{
                  padding: "1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.375rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  {property.address}
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "0.5rem",
                  }}
                >
                  Status: {property.status}
                </p>
                <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                  £{property.currentValuation.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#6b7280" }}>No properties yet</p>
        )}
      </Section>
    </DashboardLayout>
  );
}
