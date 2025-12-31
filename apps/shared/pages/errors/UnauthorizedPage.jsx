// apps/shared/pages/errors/UnauthorizedPage.jsx
'use client';

import { useRouter } from 'next/navigation';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9fafb;
  padding: 2rem;
`;

const Content = styled.div`
  text-align: center;
  max-width: 28rem;
`;

const ErrorCode = styled.h1`
  font-size: 6rem;
  font-weight: 700;
  color: #dc2626;
  margin: 0;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 1rem 0;
`;

const Description = styled.p`
  font-size: 1rem;
  color: #6b7280;
  margin-bottom: 2rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  margin: 0 0.5rem;

  &:hover {
    background-color: #1d4ed8;
  }
`;

export default function UnauthorizedPage({ 
  title = 'Access Denied',
  description = 'You don"t have permission to access this page.',
  loginLink = '/login',
  homeLink = '/dashboard'
}) {
  const router = useRouter();

  return (
    <Container>
      <Content>
        <ErrorCode>403</ErrorCode>
        <Title>{title}</Title>
        <Description>{description}</Description>
        <div>
          <Button onClick={() => router.push(homeLink)}>
            Go to Dashboard
          </Button>
          <Button onClick={() => router.push(loginLink)}>
            Login Again
          </Button>
        </div>
      </Content>
    </Container>
  );
}