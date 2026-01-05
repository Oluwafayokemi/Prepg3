// apps/investor/app/transactions/page.jsx
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

const TransactionsContainer = styled.div`
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  overflow: hidden;
`;

const TransactionsList = styled.div``;

const TransactionRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 1.5rem;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  align-items: center;
  transition: background 0.2s;

  &:hover {
    background: #f9fafb;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TransactionIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: ${props => {
    switch(props.$type) {
      case 'INVESTMENT': return '#dbeafe';
      case 'DIVIDEND': return '#d1fae5';
      case 'PROFIT_SHARE': return '#fef3c7';
      case 'WITHDRAWAL': return '#fee2e2';
      case 'FEE': return '#f3f4f6';
      default: return '#f3f4f6';
    }
  }};
`;

const TransactionInfo = styled.div``;

const TransactionType = styled.div`
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
`;

const TransactionDescription = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const TransactionDate = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  text-align: right;
`;

const TransactionAmount = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  text-align: right;
  color: ${props => props.$positive ? '#10b981' : '#ef4444'};
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const SummaryCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const SummaryLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.$color || '#111827'};
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
`;

const GET_TRANSACTIONS = `
  query ListTransactionsByInvestor($investorId: ID!, $limit: Int, $nextToken: String) {
    listTransactionsByInvestor(investorId: $investorId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        investorId
        propertyId
        type
        amount
        description
        date
        reference
        createdAt
      }
      nextToken
    }
  }
`;

const typeIcons = {
  INVESTMENT: '💰',
  DIVIDEND: '💵',
  PROFIT_SHARE: '📈',
  WITHDRAWAL: '🏦',
  FEE: '📋',
};

const typeLabels = {
  INVESTMENT: 'Investment',
  DIVIDEND: 'Dividend Payment',
  PROFIT_SHARE: 'Profit Share',
  WITHDRAWAL: 'Withdrawal',
  FEE: 'Fee',
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    if (filter === 'ALL') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter(txn => txn.type === filter));
    }
  }, [filter, transactions]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();
      const investorId = user.userId || user.username;

      const result = await client.graphql({
        query: GET_TRANSACTIONS,
        variables: { investorId, limit: 100 },
      });

      console.log('Transactions:', result.data.listTransactionsByInvestor);
      setTransactions(result.data.listTransactionsByInvestor.items);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingContainer>
          <p>Loading transactions...</p>
        </LoadingContainer>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <PageHeader>
          <Title>Error Loading Transactions</Title>
          <Subtitle style={{ color: '#ef4444' }}>{error}</Subtitle>
        </PageHeader>
      </DashboardLayout>
    );
  }

  // Calculate summaries
  const totalInvested = transactions
    .filter(t => t.type === 'INVESTMENT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDividends = transactions
    .filter(t => t.type === 'DIVIDEND' || t.type === 'PROFIT_SHARE')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFees = transactions
    .filter(t => t.type === 'FEE')
    .reduce((sum, t) => sum + t.amount, 0);

  const stats = {
    total: transactions.length,
    investment: transactions.filter(t => t.type === 'INVESTMENT').length,
    dividend: transactions.filter(t => t.type === 'DIVIDEND').length,
    profitShare: transactions.filter(t => t.type === 'PROFIT_SHARE').length,
    fee: transactions.filter(t => t.type === 'FEE').length,
  };

  return (
    <DashboardLayout>
      <PageHeader>
        <Title>Transactions</Title>
        <Subtitle>View your complete transaction history</Subtitle>
      </PageHeader>

      <SummaryCards>
        <SummaryCard>
          <SummaryLabel>Total Invested</SummaryLabel>
          <SummaryValue>£{totalInvested.toLocaleString()}</SummaryValue>
        </SummaryCard>

        <SummaryCard>
          <SummaryLabel>Total Returns</SummaryLabel>
          <SummaryValue $color="#10b981">£{totalDividends.toLocaleString()}</SummaryValue>
        </SummaryCard>

        <SummaryCard>
          <SummaryLabel>Total Fees</SummaryLabel>
          <SummaryValue $color="#ef4444">£{totalFees.toLocaleString()}</SummaryValue>
        </SummaryCard>

        <SummaryCard>
          <SummaryLabel>Net Gain</SummaryLabel>
          <SummaryValue $color={totalDividends - totalFees >= 0 ? '#10b981' : '#ef4444'}>
            £{(totalDividends - totalFees).toLocaleString()}
          </SummaryValue>
        </SummaryCard>
      </SummaryCards>

      <FilterBar>
        <FilterButton 
          $active={filter === 'ALL'} 
          onClick={() => setFilter('ALL')}
        >
          All ({stats.total})
        </FilterButton>
        <FilterButton 
          $active={filter === 'INVESTMENT'} 
          onClick={() => setFilter('INVESTMENT')}
        >
          Investments ({stats.investment})
        </FilterButton>
        <FilterButton 
          $active={filter === 'DIVIDEND'} 
          onClick={() => setFilter('DIVIDEND')}
        >
          Dividends ({stats.dividend})
        </FilterButton>
        <FilterButton 
          $active={filter === 'PROFIT_SHARE'} 
          onClick={() => setFilter('PROFIT_SHARE')}
        >
          Profit Share ({stats.profitShare})
        </FilterButton>
        <FilterButton 
          $active={filter === 'FEE'} 
          onClick={() => setFilter('FEE')}
        >
          Fees ({stats.fee})
        </FilterButton>
      </FilterBar>

      {filteredTransactions.length === 0 ? (
        <TransactionsContainer>
          <EmptyState>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No transactions found
            </h3>
            <p style={{ color: '#6b7280' }}>
              {filter === 'ALL' 
                ? "You don't have any transactions yet." 
                : `No ${filter.toLowerCase()} transactions found.`}
            </p>
          </EmptyState>
        </TransactionsContainer>
      ) : (
        <TransactionsContainer>
          <TransactionsList>
            {filteredTransactions.map((transaction) => (
              <TransactionRow key={transaction.id}>
                <TransactionIcon $type={transaction.type}>
                  {typeIcons[transaction.type] || '📄'}
                </TransactionIcon>

                <TransactionInfo>
                  <TransactionType>{typeLabels[transaction.type] || transaction.type}</TransactionType>
                  <TransactionDescription>{transaction.description}</TransactionDescription>
                  {transaction.reference && (
                    <TransactionDescription style={{ marginTop: '0.25rem', fontFamily: 'monospace' }}>
                      Ref: {transaction.reference}
                    </TransactionDescription>
                  )}
                </TransactionInfo>

                <TransactionDate>
                  {new Date(transaction.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </TransactionDate>

                <TransactionAmount 
                  $positive={transaction.type === 'DIVIDEND' || transaction.type === 'PROFIT_SHARE'}
                >
                  {transaction.type === 'DIVIDEND' || transaction.type === 'PROFIT_SHARE' ? '+' : ''}
                  {transaction.type === 'FEE' ? '-' : ''}
                  £{transaction.amount.toLocaleString()}
                </TransactionAmount>
              </TransactionRow>
            ))}
          </TransactionsList>
        </TransactionsContainer>
      )}
    </DashboardLayout>
  );
}