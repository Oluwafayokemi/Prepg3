// apps/investor/app/investments/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { useParams, useRouter } from "next/navigation";
import styled from "styled-components";
import DashboardLayout from "../../../components/DashboardLayout";

const client = generateClient();

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
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
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
`;
const StatItem = styled.div``;
const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
`;
const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${(props) => props.$color || "#111827"};
`;
const GET_INVESTMENT = `
  query GetInvestment($id: ID!) {
    getInvestment(id: $id) {
      id
      investmentAmount
      equityPercentage
      investmentDate
      currentValue
      roi
      status
      property {
        id
        address
        postcode
        propertyType
        currentValuation
        status
      }
    }
  }
`;
export default function InvestmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [investment, setInvestment] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (params.id) {
      loadInvestment();
    }
  }, [params.id]);
  const loadInvestment = async () => {
    try {
      const result = await client.graphql({
        query: GET_INVESTMENT,
        variables: { id: params.id },
      });
      setInvestment(result.data.getInvestment);
    } catch (error) {
      console.error("Error loading investment:", error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <p>Loading investment details...</p>
        </div>
      </DashboardLayout>
    );
  }
  if (!investment) {
    return (
      <DashboardLayout>
        <PageHeader>
          <BackButton onClick={() => router.back()}>← Back</BackButton>
          <Title>Investment Not Found</Title>
        </PageHeader>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <PageHeader>
        <BackButton onClick={() => router.back()}>
          ← Back to Investments
        </BackButton>
        <Title>{investment.property?.address || "Investment Details"}</Title>
        <Subtitle>Investment ID: {investment.id}</Subtitle>
      </PageHeader>
      <Section>
        <SectionTitle>Investment Overview</SectionTitle>
        <Grid>
          <StatItem>
            <StatLabel>Investment Amount</StatLabel>
            <StatValue>
              £{investment.investmentAmount.toLocaleString()}
            </StatValue>
          </StatItem>

          <StatItem>
            <StatLabel>Current Value</StatLabel>
            <StatValue>£{investment.currentValue.toLocaleString()}</StatValue>
          </StatItem>

          <StatItem>
            <StatLabel>ROI</StatLabel>
            <StatValue $color={investment.roi >= 0 ? "#10b981" : "#ef4444"}>
              {investment.roi.toFixed(2)}%
            </StatValue>
          </StatItem>

          <StatItem>
            <StatLabel>Equity Share</StatLabel>
            <StatValue>{investment.equityPercentage}%</StatValue>
          </StatItem>

          <StatItem>
            <StatLabel>Investment Date</StatLabel>
            <StatValue style={{ fontSize: "1rem" }}>
              {investment.investmentDate}
            </StatValue>
          </StatItem>

          <StatItem>
            <StatLabel>Status</StatLabel>
            <StatValue style={{ fontSize: "1rem" }}>
              {investment.status}
            </StatValue>
          </StatItem>
        </Grid>
      </Section>

      {investment.property && (
        <Section>
          <SectionTitle>Property Details</SectionTitle>
          <Grid>
            <StatItem>
              <StatLabel>Address</StatLabel>
              <StatValue style={{ fontSize: "1rem" }}>
                {investment.property.address}
              </StatValue>
            </StatItem>

            <StatItem>
              <StatLabel>Postcode</StatLabel>
              <StatValue style={{ fontSize: "1rem" }}>
                {investment.property.postcode}
              </StatValue>
            </StatItem>

            <StatItem>
              <StatLabel>Type</StatLabel>
              <StatValue style={{ fontSize: "1rem" }}>
                {investment.property.propertyType}
              </StatValue>
            </StatItem>

            <StatItem>
              <StatLabel>Current Valuation</StatLabel>
              <StatValue>
                £{investment.property.currentValuation.toLocaleString()}
              </StatValue>
            </StatItem>

            <StatItem>
              <StatLabel>Property Status</StatLabel>
              <StatValue style={{ fontSize: "1rem" }}>
                {investment.property.status}
              </StatValue>
            </StatItem>
          </Grid>
        </Section>
      )}
    </DashboardLayout>
  );
}
