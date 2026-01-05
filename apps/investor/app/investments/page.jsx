// apps/investor/app/investments/page.jsx
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/api";
import styled from "styled-components";
import DashboardLayout from "../../components/DashboardLayout";
import Link from "next/link";

const client = generateClient();

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

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const FilterButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid ${props => props.$active ? '#3b82f6' : '#d1d5db'};
  background: ${props => props.$active ? '#3b82f6' : 'white'};
  color: ${props => props.$active ? 'white' : '#374151'};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    ${props => !props.$active && 'background: #f3f4f6;'}
  }
`;

const InvestmentsGrid = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const InvestmentCard = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  overflow: hidden;
  transition: box-shadow 0.2s;
  cursor: pointer;

  &:hover {
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }
`;

const CardHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: start;
`;

const PropertyInfo = styled.div`
  flex: 1;
`;

const PropertyAddress = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
`;

const PropertyType = styled.span`
  font-size: 0.875rem;
  color: #6b7280;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    switch(props.$status) {
      case 'ACTIVE': return '#d1fae5';
      case 'PENDING': return '#fef3c7';
      case 'COMPLETED': return '#dbeafe';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch(props.$status) {
      case 'ACTIVE': return '#065f46';
      case 'PENDING': return '#92400e';
      case 'COMPLETED': return '#1e40af';
      default: return '#374151';
    }
  }};
`;

const CardBody = styled.div`
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
`;

const Stat = styled.div``;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.$color || '#111827'};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const GET_INVESTMENTS = `
  query ListInvestmentsByInvestor($investorId: ID!, $limit: Int, $nextToken: String) {
    listInvestmentsByInvestor(investorId: $investorId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        investorId
        propertyId
        investmentAmount
        currentValue
        equityPercentage
        status
        roi
        investmentDate
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState([]);
  const [filteredInvestments, setFilteredInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadInvestments();
  }, []);

  useEffect(() => {
    if (filter === 'ALL') {
      setFilteredInvestments(investments);
    } else {
      setFilteredInvestments(investments.filter(inv => inv.status === filter));
    }
  }, [filter, investments]);

  const loadInvestments = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();
      const investorId = user.userId || user.username;

      const result = await client.graphql({
        query: GET_INVESTMENTS,
        variables: { investorId, limit: 50 },
      });

      console.log('Investments:', result.data.listInvestmentsByInvestor);
      setInvestments(result.data.listInvestmentsByInvestor.items);
    } catch (err) {
      console.error('Error loading investments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingContainer>
          <p>Loading investments...</p>
        </LoadingContainer>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <PageHeader>
          <Title>Error Loading Investments</Title>
          <Subtitle style={{ color: '#ef4444' }}>{error}</Subtitle>
        </PageHeader>
      </DashboardLayout>
    );
  }

  const stats = {
    total: investments.length,
    active: investments.filter(i => i.status === 'ACTIVE').length,
    pending: investments.filter(i => i.status === 'PENDING').length,
    completed: investments.filter(i => i.status === 'COMPLETED').length,
  };

  return (
    <DashboardLayout>
      <PageHeader>
        <Title>My Investments</Title>
        <Subtitle>Track and manage your property investments</Subtitle>
      </PageHeader>

      <FilterBar>
        <FilterButton 
          $active={filter === 'ALL'} 
          onClick={() => setFilter('ALL')}
        >
          All ({stats.total})
        </FilterButton>
        <FilterButton 
          $active={filter === 'ACTIVE'} 
          onClick={() => setFilter('ACTIVE')}
        >
          Active ({stats.active})
        </FilterButton>
        <FilterButton 
          $active={filter === 'PENDING'} 
          onClick={() => setFilter('PENDING')}
        >
          Pending ({stats.pending})
        </FilterButton>
        <FilterButton 
          $active={filter === 'COMPLETED'} 
          onClick={() => setFilter('COMPLETED')}
        >
          Completed ({stats.completed})
        </FilterButton>
      </FilterBar>

      {filteredInvestments.length === 0 ? (
        <EmptyState>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No {filter.toLowerCase()} investments
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            {filter === 'ALL' 
              ? "You haven't made any investments yet." 
              : `You don't have any ${filter.toLowerCase()} investments.`}
          </p>
          <Link 
            href="/properties" 
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Browse Properties
          </Link>
        </EmptyState>
      ) : (
        <InvestmentsGrid>
          {filteredInvestments.map((investment) => (
            <InvestmentCard key={investment.id}>
              <CardHeader>
                <PropertyInfo>
                  <PropertyAddress>Investment #{investment.id.slice(0, 8)}</PropertyAddress>
                  <PropertyType>Property ID: {investment.propertyId.slice(0, 8)}</PropertyType>
                </PropertyInfo>
                <StatusBadge $status={investment.status}>
                  {investment.status}
                </StatusBadge>
              </CardHeader>

              <CardBody>
                <Stat>
                  <StatLabel>Investment Amount</StatLabel>
                  <StatValue>£{investment.investmentAmount.toLocaleString()}</StatValue>
                </Stat>

                <Stat>
                  <StatLabel>Current Value</StatLabel>
                  <StatValue>£{investment.currentValue.toLocaleString()}</StatValue>
                </Stat>

                <Stat>
                  <StatLabel>Equity Share</StatLabel>
                  <StatValue>{investment.equityPercentage}%</StatValue>
                </Stat>

                <Stat>
                  <StatLabel>ROI</StatLabel>
                  <StatValue $color={investment.roi >= 0 ? '#10b981' : '#ef4444'}>
                    {investment.roi.toFixed(2)}%
                  </StatValue>
                </Stat>

                <Stat>
                  <StatLabel>Investment Date</StatLabel>
                  <StatValue style={{ fontSize: '1rem' }}>
                    {new Date(investment.investmentDate).toLocaleDateString()}
                  </StatValue>
                </Stat>

                <Stat>
                  <StatLabel>Gain/Loss</StatLabel>
                  <StatValue $color={investment.currentValue >= investment.investmentAmount ? '#10b981' : '#ef4444'}>
                    £{(investment.currentValue - investment.investmentAmount).toLocaleString()}
                  </StatValue>
                </Stat>
              </CardBody>
            </InvestmentCard>
          ))}
        </InvestmentsGrid>
      )}
    </DashboardLayout>
  );
}