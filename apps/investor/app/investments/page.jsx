// apps/investor/app/investments/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import DashboardLayout from '../../components/DashboardLayout';

const client = generateClient();

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`;

const InvestmentCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    transform: translateY(-2px);
  }
`;

const InvestmentHeader = styled.div`
  margin-bottom: 1rem;
`;

const InvestmentTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
`;

const InvestmentDate = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
`;

const InvestmentStats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
`;

const Stat = styled.div``;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
`;

const StatValue = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.$color || '#111827'};
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => {
    switch (props.$status) {
      case 'ACTIVE': return '#d1fae5';
      case 'COMPLETED': return '#dbeafe';
      case 'PENDING': return '#fef3c7';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'ACTIVE': return '#065f46';
      case 'COMPLETED': return '#1e40af';
      case 'PENDING': return '#92400e';
      default: return '#374151';
    }
  }};
`;

const LIST_INVESTMENTS = `
  query ListInvestmentsByInvestor($investorId: ID!) {
    listInvestmentsByInvestor(investorId: $investorId, limit: 50) {
      items {
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
          currentValuation
        }
      }
    }
  }
`;

export default function InvestmentsPage() {
  const router = useRouter();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvestments();
  }, []);

  const loadInvestments = async () => {
    try {
      const user = await getCurrentUser();
      const investorId = user.attributes?.['custom:investorId'] || user.userId;

      const result = await client.graphql({
        query: LIST_INVESTMENTS,
        variables: { investorId },
      });

      setInvestments(result.data.listInvestmentsByInvestor.items);
    } catch (error) {
      console.error('Error loading investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvestmentClick = (id) => {
    router.push(`/investments/${id}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading investments...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader>
        <Title>My Investments</Title>
      </PageHeader>

      {investments.length > 0 ? (
        <Grid>
          {investments.map((investment) => (
            <InvestmentCard 
              key={investment.id}
              onClick={() => handleInvestmentClick(investment.id)}
            >
              <InvestmentHeader>
                <InvestmentTitle>
                  {investment.property?.address || 'Property Investment'}
                </InvestmentTitle>
                <InvestmentDate>
                  Invested: {investment.investmentDate}
                </InvestmentDate>
                <div style={{ marginTop: '0.5rem' }}>
                  <Badge $status={investment.status}>{investment.status}</Badge>
                </div>
              </InvestmentHeader>

              <InvestmentStats>
                <Stat>
                  <StatLabel>Investment Amount</StatLabel>
                  <StatValue>
                    £{investment.investmentAmount.toLocaleString()}
                  </StatValue>
                </Stat>

                <Stat>
                  <StatLabel>Current Value</StatLabel>
                  <StatValue>
                    £{investment.currentValue.toLocaleString()}
                  </StatValue>
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
              </InvestmentStats>
            </InvestmentCard>
          ))}
        </Grid>
      ) : (
        <div style={{ 
          background: 'white', 
          padding: '3rem', 
          borderRadius: '0.5rem',
          textAlign: 'center' 
        }}>
          <p style={{ color: '#6b7280' }}>You don't have any investments yet</p>
        </div>
      )}
    </DashboardLayout>
  );
}