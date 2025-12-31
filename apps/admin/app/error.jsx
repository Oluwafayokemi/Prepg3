// apps/admin/app/error.jsx
"use client";

import { useEffect } from "react";
import styled from "styled-components";

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

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  &:hover {
    background-color: #1d4ed8;
  }
`;
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);
  return (
    <Container>
      <h2>Something went wrong!</h2>
      <p>{error?.message || "An unexpected error occurred"}</p>
      <Button onClick={() => reset()}>Try again</Button>
    </Container>
  );
}
