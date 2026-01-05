// apps/investor/app/documents/page.jsx
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

const DocumentsGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const DocumentCard = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  padding: 1.5rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1.5rem;
  align-items: center;
  transition: box-shadow 0.2s;
  cursor: pointer;

  &:hover {
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }
`;

const DocumentIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  background: ${props => {
    switch(props.$category) {
      case 'CONTRACT': return '#dbeafe';
      case 'REPORT': return '#d1fae5';
      case 'CERTIFICATE': return '#fef3c7';
      case 'INVOICE': return '#fee2e2';
      case 'VALUATION': return '#e9d5ff';
      default: return '#f3f4f6';
    }
  }};
`;

const DocumentInfo = styled.div`
  min-width: 0;
`;

const DocumentTitle = styled.div`
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
`;

const DocumentMeta = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const DocumentActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }
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

const GET_DOCUMENTS = `
  query ListDocumentsByInvestor($investorId: ID!, $limit: Int, $nextToken: String) {
    listDocumentsByInvestor(investorId: $investorId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        investorId
        propertyId
        title
        description
        fileKey
        fileType
        fileSize
        category
        uploadDate
      }
      nextToken
    }
  }
`;

const categoryIcons = {
  CONTRACT: '📄',
  REPORT: '📊',
  CERTIFICATE: '🏆',
  INVOICE: '🧾',
  VALUATION: '💎',
  OTHER: '📁',
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (filter === 'ALL') {
      setFilteredDocuments(documents);
    } else {
      setFilteredDocuments(documents.filter(doc => doc.category === filter));
    }
  }, [filter, documents]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();
      const investorId = user.userId || user.username;

      const result = await client.graphql({
        query: GET_DOCUMENTS,
        variables: { investorId, limit: 100 },
      });

      console.log('Documents:', result.data.listDocumentsByInvestor);
      setDocuments(result.data.listDocumentsByInvestor.items);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = (doc) => {
    console.log('Download document:', doc.id);
    // In a real app, you'd generate a presigned URL here
    alert(`Download functionality would fetch presigned URL for: ${doc.title}`);
  };

  const handleView = (doc) => {
    console.log('View document:', doc.id);
    alert(`View functionality would open: ${doc.title}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingContainer>
          <p>Loading documents...</p>
        </LoadingContainer>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <PageHeader>
          <Title>Error Loading Documents</Title>
          <Subtitle style={{ color: '#ef4444' }}>{error}</Subtitle>
        </PageHeader>
      </DashboardLayout>
    );
  }

  const stats = {
    total: documents.length,
    contract: documents.filter(d => d.category === 'CONTRACT').length,
    report: documents.filter(d => d.category === 'REPORT').length,
    certificate: documents.filter(d => d.category === 'CERTIFICATE').length,
    invoice: documents.filter(d => d.category === 'INVOICE').length,
    valuation: documents.filter(d => d.category === 'VALUATION').length,
  };

  return (
    <DashboardLayout>
      <PageHeader>
        <Title>Documents</Title>
        <Subtitle>Access your investment documents and reports</Subtitle>
      </PageHeader>

      <FilterBar>
        <FilterButton 
          $active={filter === 'ALL'} 
          onClick={() => setFilter('ALL')}
        >
          All ({stats.total})
        </FilterButton>
        <FilterButton 
          $active={filter === 'CONTRACT'} 
          onClick={() => setFilter('CONTRACT')}
        >
          Contracts ({stats.contract})
        </FilterButton>
        <FilterButton 
          $active={filter === 'REPORT'} 
          onClick={() => setFilter('REPORT')}
        >
          Reports ({stats.report})
        </FilterButton>
        <FilterButton 
          $active={filter === 'CERTIFICATE'} 
          onClick={() => setFilter('CERTIFICATE')}
        >
          Certificates ({stats.certificate})
        </FilterButton>
        <FilterButton 
          $active={filter === 'VALUATION'} 
          onClick={() => setFilter('VALUATION')}
        >
          Valuations ({stats.valuation})
        </FilterButton>
        <FilterButton 
          $active={filter === 'INVOICE'} 
          onClick={() => setFilter('INVOICE')}
        >
          Invoices ({stats.invoice})
        </FilterButton>
      </FilterBar>

      {filteredDocuments.length === 0 ? (
        <EmptyState>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No documents found
          </h2>
          <p style={{ color: '#6b7280' }}>
            {filter === 'ALL' 
              ? "You don't have any documents yet." 
              : `No ${filter.toLowerCase()} documents found.`}
          </p>
        </EmptyState>
      ) : (
        <DocumentsGrid>
          {filteredDocuments.map((doc) => (
            <DocumentCard key={doc.id}>
              <DocumentIcon $category={doc.category}>
                {categoryIcons[doc.category] || '📁'}
              </DocumentIcon>

              <DocumentInfo>
                <DocumentTitle>{doc.title}</DocumentTitle>
                {doc.description && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    {doc.description}
                  </div>
                )}
                <DocumentMeta>
                  <span>{doc.category}</span>
                  <span>•</span>
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span>•</span>
                  <span>
                    {new Date(doc.uploadDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </DocumentMeta>
              </DocumentInfo>

              <DocumentActions>
                <ActionButton onClick={() => handleView(doc)}>
                  View
                </ActionButton>
                <ActionButton onClick={() => handleDownload(doc)}>
                  Download
                </ActionButton>
              </DocumentActions>
            </DocumentCard>
          ))}
        </DocumentsGrid>
      )}
    </DashboardLayout>
  );
}