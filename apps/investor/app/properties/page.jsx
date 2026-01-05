// apps/investor/app/properties/page.jsx
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/api";
import styled from "styled-components";
import DashboardLayout from "../../components/DashboardLayout";

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

const PropertiesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`;

const PropertyCard = styled.div`
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  }
`;

const PropertyImage = styled.div`
  height: 200px;
  background: ${props => props.$url ? `url(${props.$url})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  background-size: cover;
  background-position: center;
  position: relative;
`;

const StatusBadge = styled.span`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
  background: ${props => {
    switch(props.$status) {
      case 'COMPLETED': return 'rgba(16, 185, 129, 0.9)';
      case 'DEVELOPMENT': return 'rgba(245, 158, 11, 0.9)';
      case 'ACQUISITION': return 'rgba(59, 130, 246, 0.9)';
      case 'SOLD': return 'rgba(107, 114, 128, 0.9)';
      default: return 'rgba(156, 163, 175, 0.9)';
    }
  }};
  color: white;
`;

const PropertyContent = styled.div`
  padding: 1.5rem;
`;

const PropertyAddress = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
`;

const PropertyType = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1rem;
`;

const PropertyStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
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
  color: #111827;
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

const GET_DASHBOARD = `
  query GetInvestorDashboard($investorId: ID!) {
    getInvestorDashboard(investorId: $investorId) {
      properties {
        id
        address
        postcode
        propertyType
        currentValuation
        status
        equityPercentage
        investmentValue
        investmentAmount
      }
    }
  }
`;

const GET_ALL_PROPERTIES = `
  query ListProperties($limit: Int, $nextToken: String) {
    listProperties(limit: $limit, nextToken: $nextToken) {
      id
      address
      postcode
      city
      propertyType
      status
      purchasePrice
      currentValuation
      acquisitionDate
      images
    }
  }
`;

export default function PropertiesPage() {
  const [myProperties, setMyProperties] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [displayedProperties, setDisplayedProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('MY_PROPERTIES');

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (view === 'MY_PROPERTIES') {
      setDisplayedProperties(myProperties);
    } else {
      setDisplayedProperties(allProperties);
    }
  }, [view, myProperties, allProperties]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();
      const investorId = user.userId || user.username;

      // Get investor's properties
      const dashboardResult = await client.graphql({
        query: GET_DASHBOARD,
        variables: { investorId },
      });

      setMyProperties(dashboardResult.data.getInvestorDashboard.properties);

      // Get all available properties
      const allPropsResult = await client.graphql({
        query: GET_ALL_PROPERTIES,
        variables: { limit: 50 },
      });

      setAllProperties(allPropsResult.data.listProperties);
    } catch (err) {
      console.error('Error loading properties:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingContainer>
          <p>Loading properties...</p>
        </LoadingContainer>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <PageHeader>
          <Title>Error Loading Properties</Title>
          <Subtitle style={{ color: '#ef4444' }}>{error}</Subtitle>
        </PageHeader>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader>
        <Title>Properties</Title>
        <Subtitle>
          {view === 'MY_PROPERTIES' 
            ? 'Properties you have invested in' 
            : 'Browse all available investment opportunities'}
        </Subtitle>
      </PageHeader>

      <FilterBar>
        <FilterButton 
          $active={view === 'MY_PROPERTIES'} 
          onClick={() => setView('MY_PROPERTIES')}
        >
          My Properties ({myProperties.length})
        </FilterButton>
        <FilterButton 
          $active={view === 'ALL_PROPERTIES'} 
          onClick={() => setView('ALL_PROPERTIES')}
        >
          All Properties ({allProperties.length})
        </FilterButton>
      </FilterBar>

      {displayedProperties.length === 0 ? (
        <EmptyState>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No properties found
          </h2>
          <p style={{ color: '#6b7280' }}>
            {view === 'MY_PROPERTIES' 
              ? "You haven't invested in any properties yet." 
              : "No properties available at the moment."}
          </p>
        </EmptyState>
      ) : (
        <PropertiesGrid>
          {displayedProperties.map((property) => (
            <PropertyCard key={property.id}>
              <PropertyImage $url={property.images?.[0]}>
                <StatusBadge $status={property.status}>
                  {property.status}
                </StatusBadge>
              </PropertyImage>

              <PropertyContent>
                <PropertyAddress>{property.address}</PropertyAddress>
                <PropertyType>
                  {property.propertyType?.replace('_', ' ')} • {property.postcode}
                </PropertyType>

                <PropertyStats>
                  <Stat>
                    <StatLabel>Current Value</StatLabel>
                    <StatValue>£{property.currentValuation?.toLocaleString() || '0'}</StatValue>
                  </Stat>

                  {property.equityPercentage !== undefined ? (
                    <>
                      <Stat>
                        <StatLabel>Your Equity</StatLabel>
                        <StatValue>{property.equityPercentage}%</StatValue>
                      </Stat>
                      <Stat>
                        <StatLabel>Your Investment</StatLabel>
                        <StatValue>£{property.investmentAmount?.toLocaleString() || '0'}</StatValue>
                      </Stat>
                      <Stat>
                        <StatLabel>Current Worth</StatLabel>
                        <StatValue>£{property.investmentValue?.toLocaleString() || '0'}</StatValue>
                      </Stat>
                    </>
                  ) : (
                    <>
                      <Stat>
                        <StatLabel>Purchase Price</StatLabel>
                        <StatValue>£{property.purchasePrice?.toLocaleString() || '0'}</StatValue>
                      </Stat>
                      <Stat>
                        <StatLabel>Acquired</StatLabel>
                        <StatValue>
                          {property.acquisitionDate 
                            ? new Date(property.acquisitionDate).toLocaleDateString()
                            : 'N/A'}
                        </StatValue>
                      </Stat>
                      <Stat>
                        <StatLabel>City</StatLabel>
                        <StatValue>{property.city || 'London'}</StatValue>
                      </Stat>
                    </>
                  )}
                </PropertyStats>
              </PropertyContent>
            </PropertyCard>
          ))}
        </PropertiesGrid>
      )}
    </DashboardLayout>
  );
}