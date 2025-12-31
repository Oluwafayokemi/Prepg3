// apps/investor/app/error.jsx
'use client';

import { useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  background-color: #f9fafb;
`;

const ErrorCode = styled.h1`
  font-size: 4rem;
  font-weight: 700;
  color: #ef4444;
  margin: 0;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;

  &:hover {
    background-color: #1d4ed8;
  }
`;

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
    <Container>
      <ErrorCode>⚠️</ErrorCode>
      <Title>Something went wrong!</Title>
      <p style={{ color: '#6b7280', textAlign: 'center', maxWidth: '500px' }}>
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button onClick={() => reset()}>
        Try again
      </Button>
    </Container>
  );
}