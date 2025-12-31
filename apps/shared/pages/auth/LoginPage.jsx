// apps/shared/pages/auth/LoginPage.jsx
"use client";

import { useState, useEffect } from "react";
import { signIn, getCurrentUser, signOut } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import styled from "styled-components";

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
  transition: all 0.15s ease;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 0.625rem 1rem;
  background-color: ${(props) => (props.disabled ? "#9ca3af" : "#2563eb")};
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: background-color 0.15s ease;

  &:hover {
    background-color: ${(props) => (props.disabled ? "#9ca3af" : "#1d4ed8")};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
  }
`;

const ErrorMessage = styled.div`
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
`;

const ForgotPasswordLink = styled.a`
  text-align: center;
  font-size: 0.875rem;
  color: #2563eb;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

export default function LoginPage({
  title = "Sign In",
  subtitle = "Sign in to your account",
  redirectPath = "/dashboard",
  onForgotPassword,
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      console.log("🔍 Checking for existing session...");
      const user = await getCurrentUser();

      if (user) {
        console.log("✅ Found existing session, redirecting...");
        router.push(redirectPath);
        return;
      }
    } catch (err) {
      // No existing session, show login form
      console.log("ℹ️ No existing session");
    } finally {
      setCheckingSession(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("🔐 Attempting sign in for:", email);

      // Clear any existing session
      await signOut();

      // Sign in
      const result = await signIn({
        username: email,
        password,
      });

      console.log("✅ Sign in successful");
      router.push(redirectPath);
    } catch (err) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Card>
        <Header>
          <Title>{title}</Title>
          <Subtitle>{subtitle}</Subtitle>
        </Header>

        <Form onSubmit={handleLogin}>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <FormGroup>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </FormGroup>

          <Button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          {onForgotPassword && (
            <ForgotPasswordLink onClick={onForgotPassword}>
              Forgot your password?
            </ForgotPasswordLink>
          )}
        </Form>
      </Card>
    </Container>
  );
}
