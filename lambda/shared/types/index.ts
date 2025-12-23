// lambda/shared/types/index.ts
export interface Investor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  totalInvested: number;
  portfolioValue: number;
  totalROI: number;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  address: string;
  postcode: string;
  propertyType: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED_USE' | 'LAND';
  purchasePrice: number;
  currentValuation: number;
  status: 'ACQUISITION' | 'DEVELOPMENT' | 'COMPLETED' | 'SOLD';
  images: string[];
  acquisitionDate: string;
  totalInvested?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Investment {
  id: string;
  investorId: string;
  propertyId: string;
  investmentAmount: number;
  equityPercentage: number;
  investmentDate: string;
  currentValue: number;
  roi: number;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING';
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  investorId: string;
  propertyId?: string;
  type: 'INVESTMENT' | 'DIVIDEND' | 'PROFIT_SHARE' | 'WITHDRAWAL' | 'FEE';
  amount: number;
  description: string;
  date: string;
  reference?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  investorId?: string;
  propertyId?: string;
  title: string;
  description?: string;
  fileKey: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  category: 'CONTRACT' | 'REPORT' | 'CERTIFICATE' | 'INVOICE' | 'VALUATION' | 'OTHER';
}

export interface Notification {
  id: string;
  investorId: string;
  title: string;
  message: string;
  type: 'INVESTMENT_UPDATE' | 'DOCUMENT_UPLOADED' | 'PAYMENT_RECEIVED' | 'PROPERTY_UPDATE' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  link?: string;
  ttl?: number; // Unix timestamp for auto-deletion
}

export interface Development {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  status: string;
  updateDate: string;
  images: string[];
  createdAt: string;
}

// GraphQL Event Context
export interface AppSyncEvent {
  arguments: any;
  identity: {
    sub: string;
    username: string;
    claims: {
      'cognito:groups'?: string[];
      email: string;
      'custom:investorId'?: string;
      'custom:role'?: string;
    };
  };
  source: any;
  request: {
    headers: any;
  };
}