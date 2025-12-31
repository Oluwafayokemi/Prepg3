// apps/shared/components/Button.jsx (was .tsx)
import styled from 'styled-components';
import { theme } from '../styles/theme';

export const Button = styled.button`
  padding: ${props => {
    switch (props.size) {
      case 'sm': return '0.5rem 1rem';
      case 'lg': return '0.875rem 1.5rem';
      default: return '0.625rem 1.25rem';
    }
  }};
  
  font-size: ${props => {
    switch (props.size) {
      case 'sm': return '0.813rem';
      case 'lg': return '1rem';
      default: return '0.875rem';
    }
  }};
  
  font-weight: 500;
  border: none;
  border-radius: ${theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.15s ease;
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  
  background-color: ${props => {
    switch (props.variant) {
      case 'secondary': return theme.colors.secondary;
      case 'danger': return theme.colors.danger;
      default: return theme.colors.primary;
    }
  }};
  
  color: white;
  
  &:hover {
    background-color: ${props => {
      switch (props.variant) {
        case 'secondary': return '#059669';
        case 'danger': return '#dc2626';
        default: return theme.colors.primaryHover;
      }
    }};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;