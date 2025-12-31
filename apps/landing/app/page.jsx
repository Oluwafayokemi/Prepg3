"use client";

import styled from 'styled-components';
import { Button } from '../../shared/components';
import { theme } from '../../shared/styles/theme';

const Hero = styled.section`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  background: ${theme.colors.background.secondary};
`;

const Title = styled.h1`
  font-size: 3rem;
  margin-bottom: 1rem;
  color: ${theme.colors.text.primary};
`;

const Subtitle = styled.p`
  font-size: 1.25rem;
  color: ${theme.colors.text.secondary};
  margin-bottom: 2rem;
`;

export default function HomePage() {
  return (
    <Hero>
      <Title>Welcome to PREPG3</Title>
      <Subtitle>Invest in premium UK property developments</Subtitle>
      <Button size="lg">Get Started</Button>
    </Hero>
  );
}