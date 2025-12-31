// apps/shared/pages/auth/ForgotPasswordPage.jsx
'use client';

import { useState } from 'react';
import { resetPassword } from 'aws-amplify/auth';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9fafb;
`;

const Card = styled.div`
  max-width: 28rem;
  width: 100%;
  padding: 2rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`;

const Input = styled.input`
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 0.625rem 1rem;
  background-color: ${props => props.disabled ? '#9ca3af' : '#2563eb'};
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};

  &:hover {
    background-color: ${props => props.disabled ? '#9ca3af' : '#1d4ed8'};
  }
`;

const Message = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: ${props => props.$error ? '#fef2f2' : '#f0fdf4'};
  border: 1px solid ${props => props.$error ? '#fecaca' : '#bbf7d0'};
  color: ${props => props.$error ? '#dc2626' : '#16a34a'};
`;

const BackLink = styled.a`
  text-align: center;
  font-size: 0.875rem;
  color: #2563eb;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
`;

export default function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await resetPassword({ username: email });
      setMessage('Password reset code sent to your email');
    } catch (err) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Card>
        <Header>
          <Title>Forgot Password</Title>
          <Subtitle>Enter your email to receive a reset code</Subtitle>
        </Header>
        
        <Form onSubmit={handleSubmit}>
          {error && <Message $error>{error}</Message>}
          {message && <Message>{message}</Message>}
          
          <FormGroup>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </FormGroup>

          <Button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Code'}
          </Button>

          {onBackToLogin && (
            <BackLink onClick={onBackToLogin}>
              ← Back to login
            </BackLink>
          )}
        </Form>
      </Card>
    </Container>
  );
}