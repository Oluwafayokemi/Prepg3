// apps/shared/components/Card.jsx (was .tsx)
import styled from 'styled-components';
import { theme } from '../styles/theme';

export const Card = styled.div`
  background: ${theme.colors.background.primary};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.sm};
  border: 1px solid ${theme.colors.border.light};
`;

export const CardHeader = styled.div`
  margin-bottom: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border.light};
`;

export const CardTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${theme.colors.text.primary};
  margin: 0;
`;

export const CardContent = styled.div`
  color: ${theme.colors.text.secondary};
`;