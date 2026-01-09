// apps/investor/app/properties/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { generateClient } from "aws-amplify/api";
import styled from "styled-components";
import {
  ArrowLeft, MapPin, Calendar, TrendingUp, DollarSign,
  Activity, Upload, Download, MessageSquare, FileText,
  Image as ImageIcon, Check, Clock, ChevronRight
} from "lucide-react";
import DashboardLayout from "../../../components/DashboardLayout";

const client = generateClient();

const PageContainer = styled.div`
  max-width: 1400px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 1.5rem;
  transition: color 0.2s;

  &:hover {
    color: #111827;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const HeaderCard = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  margin-bottom: 2rem;
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const PropertyTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
`;

const PropertyLocation = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 1.125rem;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const StatusBadge = styled.span`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    switch(props.$status) {
      case 'COMPLETED': return '#10b981';
      case 'IN_PROGRESS': return '#3b82f6';
      case 'NEAR_COMPLETION': return '#f59e0b';
      default: return '#6b7280';
    }
  }};
  color: white;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled.div`
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.75rem;
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  color: #3F8392;

  svg {
    width: 20px;
    height: 20px;
    margin-right: 0.5rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-top: 0.25rem;
`;

const ProgressSection = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const ProgressLabel = styled.h3`
  font-weight: 600;
  color: #111827;
`;

const ProgressPercentage = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: #3F8392;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 16px;
  background: #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #3F8392 0%, #2d5f6d 100%);
  width: ${props => props.$progress}%;
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1.5rem;
`;

const Timeline = styled.div`
  position: relative;
`;

const TimelineItem = styled.div`
  position: relative;
  padding-left: 3rem;
  padding-bottom: 2rem;

  &:last-child {
    padding-bottom: 0;
  }

  &:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 1.25rem;
    top: 2.5rem;
    bottom: 0;
    width: 2px;
    background: ${props => props.$completed ? '#10b981' : '#e5e7eb'};
  }
`;

const TimelineIcon = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: ${props => {
    if (props.$status === 'completed') return '#10b981';
    if (props.$status === 'current') return '#3b82f6';
    return '#d1d5db';
  }};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const TimelineContent = styled.div``;

const TimelineHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 0.5rem;
`;

const TimelineName = styled.h4`
  font-weight: 600;
  color: #111827;
`;

const TimelineDate = styled.span`
  font-size: 0.875rem;
  color: #6b7280;
`;

const TimelineStatus = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    if (props.$status === 'completed') return '#d1fae5';
    if (props.$status === 'current') return '#dbeafe';
    return '#f3f4f6';
  }};
  color: ${props => {
    if (props.$status === 'completed') return '#065f46';
    if (props.$status === 'current') return '#1e40af';
    return '#374151';
  }};
`;

const TimelineProgress = styled.div`
  margin-top: 0.5rem;
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
`;

const TimelineProgressFill = styled.div`
  height: 100%;
  background: #3F8392;
  width: ${props => props.$progress}%;
  transition: width 0.3s ease;
`;

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
`;

const GalleryItem = styled.div`
  aspect-ratio: 1;
  border-radius: 0.75rem;
  background: ${props => props.$url ? `url(${props.$url})` : '#3F839220'};
  background-size: cover;
  background-position: center;
  cursor: pointer;
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3F8392;

  &:hover {
    transform: scale(1.05);
  }

  svg {
    width: 32px;
    height: 32px;
  }
`;

const UploadButton = styled.button`
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.75rem;
  background: transparent;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    border-color: #3F8392;
    color: #3F8392;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const DocumentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const DocumentItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f3f4f6;
  }
`;

const DocumentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const DocumentIcon = styled.div`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  background: #3F839220;
  color: #3F8392;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const DocumentDetails = styled.div``;

const DocumentName = styled.h4`
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;
`;

const DocumentMeta = styled.p`
  font-size: 0.75rem;
  color: #6b7280;
`;

const ActionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.75rem;
  background: ${props => props.$primary ? '#3F8392' : '#f3f4f6'};
  color: ${props => props.$primary ? 'white' : '#374151'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$primary ? '#2d5f6d' : '#e5e7eb'};
    ${props => props.$primary && 'box-shadow: 0 4px 12px rgba(63, 131, 146, 0.3);'}
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const TeamList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TeamMember = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const MemberAvatar = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: #3F8392;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
`;

const MemberInfo = styled.div`
  flex: 1;
`;

const MemberName = styled.h4`
  font-weight: 600;
  color: #111827;
`;

const MemberRole = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
`;

const MessageButton = styled.button`
  padding: 0.5rem;
  border: none;
  background: #f3f4f6;
  border-radius: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
    color: #3F8392;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ActivityFeed = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: start;
  gap: 0.75rem;
  font-size: 0.875rem;
`;

const ActivityDot = styled.div`
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #3F8392;
  margin-top: 0.375rem;
  flex-shrink: 0;
`;

const ActivityText = styled.div`
  flex: 1;
  color: #374151;
`;

const ActivityTime = styled.div`
  color: #9ca3af;
  font-size: 0.75rem;
  flex-shrink: 0;
`;

const GET_PROPERTY_DETAIL = `
  query GetPropertyDetail($id: ID!) {
    getProperty(id: $id) {
      id
      name
      location
      description
      status
      investment
      currentValue
      roiPercentage
      completionDate
      progressPercentage
      images {
        items {
          id
          url
          caption
          uploadedAt
        }
      }
      documents {
        items {
          id
          name
          type
          url
          size
          uploadedAt
        }
      }
      timeline {
        items {
          id
          name
          status
          progress
          startDate
          endDate
          order
        }
      }
      team {
        items {
          id
          name
          role
          email
          phone
        }
      }
      updates {
        items {
          id
          title
          description
          type
          createdAt
        }
      }
    }
  }
`;

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (params.id) {
      loadPropertyDetail();
    }
  }, [params.id]);

  const loadPropertyDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await client.graphql({
        query: GET_PROPERTY_DETAIL,
        variables: { id: params.id },
      });

      setProperty(result.data.getProperty);
    } catch (err) {
      console.error('Error loading property:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageContainer>
          <p>Loading property details...</p>
        </PageContainer>
      </DashboardLayout>
    );
  }

  if (error || !property) {
    return (
      <DashboardLayout>
        <PageContainer>
          <BackButton onClick={() => router.push('/properties')}>
            <ArrowLeft />
            Back to Properties
          </BackButton>
          <Card>
            <h2 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>
              Error Loading Property
            </h2>
            <p style={{ color: '#6b7280' }}>{error || 'Property not found'}</p>
          </Card>
        </PageContainer>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageContainer>
        <BackButton onClick={() => router.push('/properties')}>
          <ArrowLeft />
          Back to Properties
        </BackButton>

        <HeaderCard>
          <HeaderTop>
            <div>
              <PropertyTitle>{property.name}</PropertyTitle>
              <PropertyLocation>
                <MapPin />
                {property.location}
              </PropertyLocation>
            </div>
            <StatusBadge $status={property.status}>
              {property.status?.replace('_', ' ')}
            </StatusBadge>
          </HeaderTop>

          <StatsGrid>
            <StatCard>
              <StatIcon>
                <DollarSign />
                <StatLabel>Your Investment</StatLabel>
              </StatIcon>
              <StatValue>£{property.investment?.toLocaleString() || '0'}</StatValue>
            </StatCard>

            <StatCard>
              <StatIcon>
                <Activity />
                <StatLabel>Progress</StatLabel>
              </StatIcon>
              <StatValue>{property.progressPercentage}%</StatValue>
            </StatCard>

            <StatCard>
              <StatIcon>
                <Calendar />
                <StatLabel>Est. Completion</StatLabel>
              </StatIcon>
              <StatValue>
                {property.completionDate 
                  ? new Date(property.completionDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                  : 'TBD'}
              </StatValue>
            </StatCard>

            <StatCard>
              <StatIcon>
                <TrendingUp />
                <StatLabel>ROI Forecast</StatLabel>
              </StatIcon>
              <StatValue>{property.roiPercentage}%</StatValue>
            </StatCard>
          </StatsGrid>

          <ProgressSection>
            <ProgressHeader>
              <ProgressLabel>Overall Progress</ProgressLabel>
              <ProgressPercentage>{property.progressPercentage}%</ProgressPercentage>
            </ProgressHeader>
            <ProgressBar>
              <ProgressFill $progress={property.progressPercentage} />
            </ProgressBar>
          </ProgressSection>
        </HeaderCard>

        <ContentGrid>
          <MainContent>
            <Card>
              <CardTitle>Project Timeline</CardTitle>
              <Timeline>
                {property.timeline?.items
                  ?.sort((a, b) => a.order - b.order)
                  .map((phase, index) => (
                    <TimelineItem 
                      key={phase.id}
                      $completed={phase.status === 'COMPLETED'}
                    >
                      <TimelineIcon $status={
                        phase.status === 'COMPLETED' ? 'completed' :
                        phase.status === 'IN_PROGRESS' ? 'current' : 'upcoming'
                      }>
                        {phase.status === 'COMPLETED' ? <Check /> : 
                         phase.status === 'IN_PROGRESS' ? <Clock /> : index + 1}
                      </TimelineIcon>
                      <TimelineContent>
                        <TimelineHeader>
                          <div>
                            <TimelineName>{phase.name}</TimelineName>
                            <TimelineDate>
                              {phase.startDate && new Date(phase.startDate).toLocaleDateString()} - {' '}
                              {phase.endDate && new Date(phase.endDate).toLocaleDateString()}
                            </TimelineDate>
                          </div>
                          <TimelineStatus $status={
                            phase.status === 'COMPLETED' ? 'completed' :
                            phase.status === 'IN_PROGRESS' ? 'current' : 'upcoming'
                          }>
                            {phase.status?.replace('_', ' ')}
                          </TimelineStatus>
                        </TimelineHeader>
                        {phase.status === 'IN_PROGRESS' && (
                          <TimelineProgress>
                            <TimelineProgressFill $progress={phase.progress} />
                          </TimelineProgress>
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  ))}
              </Timeline>
            </Card>

            <Card>
              <CardTitle>Photo Gallery</CardTitle>
              <GalleryGrid>
                {property.images?.items?.slice(0, 6).map((image) => (
                  <GalleryItem key={image.id} $url={image.url} />
                ))}
                {(!property.images?.items || property.images.items.length < 6) && (
                  Array.from({ length: 6 - (property.images?.items?.length || 0) }).map((_, i) => (
                    <GalleryItem key={`placeholder-${i}`}>
                      <ImageIcon />
                    </GalleryItem>
                  ))
                )}
              </GalleryGrid>
              <UploadButton>
                <Upload />
                Upload More Photos
              </UploadButton>
            </Card>

            <Card>
              <CardTitle>Documents & Reports</CardTitle>
              <DocumentList>
                {property.documents?.items?.map((doc) => (
                  <DocumentItem key={doc.id}>
                    <DocumentInfo>
                      <DocumentIcon>
                        <FileText />
                      </DocumentIcon>
                      <DocumentDetails>
                        <DocumentName>{doc.name}</DocumentName>
                        <DocumentMeta>
                          {new Date(doc.uploadedAt).toLocaleDateString()} • {' '}
                          {doc.size ? `${(doc.size / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
                        </DocumentMeta>
                      </DocumentDetails>
                    </DocumentInfo>
                    <Download size={20} style={{ color: '#6b7280', cursor: 'pointer' }} />
                  </DocumentItem>
                ))}
              </DocumentList>
            </Card>
          </MainContent>

          <Sidebar>
            <Card>
              <CardTitle>Quick Actions</CardTitle>
              <ActionButtons>
                <ActionButton $primary onClick={() => router.push('/messages')}>
                  <span>Send Message</span>
                  <MessageSquare />
                </ActionButton>
                <ActionButton>
                  <span>Upload Files</span>
                  <Upload />
                </ActionButton>
                <ActionButton>
                  <span>Schedule Call</span>
                  <Calendar />
                </ActionButton>
              </ActionButtons>
            </Card>

            <Card>
              <CardTitle>Project Team</CardTitle>
              <TeamList>
                {property.team?.items?.map((member) => (
                  <TeamMember key={member.id}>
                    <MemberAvatar>
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </MemberAvatar>
                    <MemberInfo>
                      <MemberName>{member.name}</MemberName>
                      <MemberRole>{member.role}</MemberRole>
                    </MemberInfo>
                    <MessageButton>
                      <MessageSquare />
                    </MessageButton>
                  </TeamMember>
                ))}
              </TeamList>
            </Card>

            <Card>
              <CardTitle>Recent Activity</CardTitle>
              <ActivityFeed>
                {property.updates?.items?.slice(0, 5).map((update) => (
                  <ActivityItem key={update.id}>
                    <ActivityDot />
                    <ActivityText>{update.title}</ActivityText>
                    <ActivityTime>
                      {new Date(update.createdAt).toLocaleDateString('en-GB', { 
                        day: 'numeric',
                        month: 'short'
                      })}
                    </ActivityTime>
                  </ActivityItem>
                ))}
              </ActivityFeed>
            </Card>
          </Sidebar>
        </ContentGrid>
      </PageContainer>
    </DashboardLayout>
  );
}