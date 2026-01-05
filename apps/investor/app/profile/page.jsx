// apps/investor/app/profile/page.jsx
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
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

const ProfileContainer = styled.div`
  display: grid;
  gap: 2rem;
  max-width: 800px;
`;

const Section = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
`;

const InfoGrid = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const InfoRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 1rem;
  align-items: start;
`;

const Label = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  padding-top: 0.5rem;
`;

const Value = styled.div`
  font-size: 1rem;
  color: #111827;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
`;

const StatCard = styled.div`
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 0.5rem;
  color: white;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const GET_INVESTOR = `
  query GetInvestor($id: ID!) {
    getInvestor(id: $id) {
      id
      email
      firstName
      lastName
      phone
      totalInvested
      portfolioValue
      totalROI
      createdAt
      updatedAt
    }
  }
`;

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [attributes, setAttributes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();
      const attrs = await fetchUserAttributes();
      const investorId = user.userId || user.username;

      setAttributes(attrs);

      const result = await client.graphql({
        query: GET_INVESTOR,
        variables: { id: investorId },
      });

      setProfile(result.data.getInvestor);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingContainer>
          <p>Loading profile...</p>
        </LoadingContainer>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <PageHeader>
          <Title>Error Loading Profile</Title>
          <Subtitle style={{ color: '#ef4444' }}>{error}</Subtitle>
        </PageHeader>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader>
        <Title>My Profile</Title>
        <Subtitle>View and manage your account information</Subtitle>
      </PageHeader>

      <ProfileContainer>
        <Section>
          <SectionTitle>Personal Information</SectionTitle>
          <InfoGrid>
            <InfoRow>
              <Label>Full Name</Label>
              <Value>{profile?.firstName} {profile?.lastName}</Value>
            </InfoRow>

            <InfoRow>
              <Label>Email Address</Label>
              <Value>{profile?.email || attributes?.email}</Value>
            </InfoRow>

            <InfoRow>
              <Label>Phone Number</Label>
              <Value>{profile?.phone || 'Not provided'}</Value>
            </InfoRow>

            <InfoRow>
              <Label>Member Since</Label>
              <Value>
                {profile?.createdAt 
                  ? new Date(profile.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                  : 'N/A'}
              </Value>
            </InfoRow>

            <InfoRow>
              <Label>Investor ID</Label>
              <Value style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {profile?.id?.slice(0, 20)}...
              </Value>
            </InfoRow>
          </InfoGrid>
        </Section>

        <Section>
          <SectionTitle>Portfolio Overview</SectionTitle>
          <StatsGrid>
            <StatCard style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <StatLabel>Total Invested</StatLabel>
              <StatValue>£{profile?.totalInvested?.toLocaleString() || '0'}</StatValue>
            </StatCard>

            <StatCard style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <StatLabel>Portfolio Value</StatLabel>
              <StatValue>£{profile?.portfolioValue?.toLocaleString() || '0'}</StatValue>
            </StatCard>

            <StatCard style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <StatLabel>Total ROI</StatLabel>
              <StatValue>{profile?.totalROI?.toFixed(2) || '0'}%</StatValue>
            </StatCard>
          </StatsGrid>
        </Section>

        <Section>
          <SectionTitle>Account Security</SectionTitle>
          <InfoGrid>
            <InfoRow>
              <Label>Email Verified</Label>
              <Value>
                {attributes?.email_verified ? (
                  <span style={{ color: '#10b981' }}>✓ Verified</span>
                ) : (
                  <span style={{ color: '#ef4444' }}>Not verified</span>
                )}
              </Value>
            </InfoRow>

            <InfoRow>
              <Label>Two-Factor Auth</Label>
              <Value>
                <span style={{ color: '#6b7280' }}>Not enabled</span>
              </Value>
            </InfoRow>

            <InfoRow>
              <Label>Last Updated</Label>
              <Value>
                {profile?.updatedAt 
                  ? new Date(profile.updatedAt).toLocaleDateString('en-GB')
                  : 'N/A'}
              </Value>
            </InfoRow>
          </InfoGrid>
        </Section>
      </ProfileContainer>
    </DashboardLayout>
  );
}