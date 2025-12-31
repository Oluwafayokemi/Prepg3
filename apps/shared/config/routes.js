// apps/shared/config/routes.js

import { config } from "next/dist/build/templates/pages";

export const investorRoutes = {
  '/': {
    component: 'RedirectPage',
    props: { to: '/dashboard' },
    public: false,
  },
  '/login': {
    component: 'LoginPage',
    props: {
      title: 'PREPG3 Investor Portal',
      subtitle: 'Sign in to your investor account',
      redirectPath: '/dashboard',
    },
    public: true,
  },
  '/forgot-password': {
    component: 'ForgotPasswordPage',
    props: {},
    public: true,
  },
  '/dashboard': {
    component: 'DashboardPage',
    props: {},
    public: false,
    requiredGroup: 'Investor',
  },
  '/investments': {
    component: 'InvestmentsPage',
    props: {},
    public: false,
    requiredGroup: 'Investor',
  },
  '/investments/:id': {
    component: 'InvestmentDetailPage',
    props: {},
    public: false,
    requiredGroup: 'Investor',
  },
  '/properties': {
    component: 'PropertiesPage',
    props: {},
    public: false,
    requiredGroup: 'Investor',
  },
  '/properties/:id': {
    component: 'PropertyDetailPage',
    props: {},
    public: false,
    requiredGroup: 'Investor',
  },
  '/documents': {
    component: 'DocumentsPage',
    props: {},
    public: false,
    requiredGroup: 'Investor',
  },
  '/transactions': {
    component: 'TransactionsPage',
    props: {},
    public: false,
    requiredGroup: 'Investor',
  },
  '/profile': {
    component: 'ProfilePage',
    props: {},
    public: false,
    requiredGroup: 'Investor',
  },
  '/settings': {
    component: 'SettingsPage',
    props: {},
    public: false,
    requiredGroup: 'Investor',
  },
  '/test-config': {
    component: 'TestConfigPage',
    props: {},
    public: true,
    requiredGroup: 'Investor',
  },
};

export const adminRoutes = {
  '/': {
    component: 'RedirectPage',
    props: { to: '/dashboard' },
    public: false,
  },
  '/login': {
    component: 'LoginPage',
    props: {
      title: 'PREPG3 Admin Panel',
      subtitle: 'Sign in to admin dashboard',
      redirectPath: '/dashboard',
    },
    public: true,
  },
  '/forgot-password': {
    component: 'ForgotPasswordPage',
    props: {},
    public: true,
  },
  '/dashboard': {
    component: 'AdminDashboardPage',
    props: {},
    public: false,
    requiredGroup: 'Admin',
  },
  '/investors': {
    component: 'AdminInvestorsPage',
    props: {},
    public: false,
    requiredGroup: 'Admin',
  },
  '/investors/:id': {
    component: 'AdminInvestorDetailPage',
    props: {},
    public: false,
    requiredGroup: 'Admin',
  },
  '/properties': {
    component: 'AdminPropertiesPage',
    props: {},
    public: false,
    requiredGroup: 'Admin',
  },
  '/properties/new': {
    component: 'AdminPropertyNewPage',
    props: {},
    public: false,
    requiredGroup: 'Admin',
  },
  '/properties/:id': {
    component: 'AdminPropertyDetailPage',
    props: {},
    public: false,
    requiredGroup: 'Admin',
  },
  '/reports': {
    component: 'AdminReportsPage',
    props: {},
    public: false,
    requiredGroup: 'Admin',
  },
};