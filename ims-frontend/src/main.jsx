// src/main.jsx
import './i18n';
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

// Components
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import MainLayout from './components/layout/MainLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import './i18n';

// Lazy load all the pages
const DashboardRedirect = lazy(() => import('./components/auth/DashboardRedirect.jsx'));
const InventoryPage = lazy(() => import('./pages/InventoryPage.jsx'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage.jsx'));
const BrandPage = lazy(() => import('./pages/BrandPage.jsx'));
const CategoryPage = lazy(() => import('./pages/CategoryPage.jsx'));
const CustomerPage = lazy(() => import('./pages/CustomerPage.jsx'));
const CustomerHistoryPage = lazy(() => import('./pages/CustomerHistoryPage.jsx'));
const ActiveBorrowingsPage = lazy(() => import('./pages/ActiveBorrowingsPage.jsx'));
const CustomerReturnedHistoryPage = lazy(() => import('./pages/CustomerReturnedHistoryPage.jsx'));
const CustomerPurchaseHistoryPage = lazy(() => import('./pages/CustomerPurchaseHistoryPage.jsx'));
const SalePage = lazy(() => import('./pages/SalePage.jsx'));
const CreateSalePage = lazy(() => import('./pages/CreateSalePage.jsx'));
const SaleDetailPage = lazy(() => import('./pages/SaleDetailPage.jsx'));
const EditSalePage = lazy(() => import('./pages/EditSalePage.jsx'));
const BorrowingPage = lazy(() => import('./pages/BorrowingPage.jsx'));
const CreateBorrowingPage = lazy(() => import('./pages/CreateBorrowingPage.jsx'));
const BorrowingDetailPage = lazy(() => import('./pages/BorrowingDetailPage.jsx'));
const ProductModelPage = lazy(() => import('./pages/ProductModelPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const AssetPage = lazy(() => import('./pages/AssetPage.jsx'));
const CreateAssetPage = lazy(() => import('./pages/CreateAssetPage.jsx'));
const AssetDetailPage = lazy(() => import('./pages/AssetDetailPage.jsx'));
const EditAssetPage = lazy(() => import('./pages/EditAssetPage.jsx'));
const AssetAssignmentPage = lazy(() => import('./pages/AssetAssignmentPage.jsx'));
const CreateAssetAssignmentPage = lazy(() => import('./pages/CreateAssetAssignmentPage.jsx'));
const AssetAssignmentDetailPage = lazy(() => import('./pages/AssetAssignmentDetailPage.jsx'));
const AssetHistoryPage = lazy(() => import('./pages/AssetHistoryPage.jsx'));
const UserAssetHistoryPage = lazy(() => import('./pages/UserAssetHistoryPage.jsx'));
const UserActiveAssetsPage = lazy(() => import('./pages/UserActiveAssetsPage.jsx'));
const InventoryHistoryPage = lazy(() => import('./pages/InventoryHistoryPage.jsx'));
const AddressPage = lazy(() => import('./pages/AddressPage.jsx'));
const RepairListPage = lazy(() => import('./pages/RepairListPage.jsx'));
const CreateRepairPage = lazy(() => import('./pages/CreateRepairPage.jsx'));
const RepairDetailPage = lazy(() => import('./pages/RepairDetailPage.jsx'));

// Fallback component to show while lazy components are loading
const Loading = () => (
  <div className="flex justify-center items-center h-[calc(100vh-100px)]">
    <p>Loading Page...</p>
  </div>
);

const routes = [
  { path: 'dashboard', Page: DashboardRedirect },
  // Business
  { path: 'sales', Page: SalePage },
  { path: 'sales/new', Page: CreateSalePage },
  { path: 'sales/:saleId', Page: SaleDetailPage },
  { path: 'sales/edit/:saleId', Page: EditSalePage },
  { path: 'borrowings', Page: BorrowingPage },
  { path: 'borrowings/new', Page: CreateBorrowingPage },
  { path: 'borrowings/:borrowingId', Page: BorrowingDetailPage },
  { path: 'customers', Page: CustomerPage },
  { path: 'customers/:id/history', Page: CustomerHistoryPage },
  { path: 'customers/:id/active-borrowings', Page: ActiveBorrowingsPage },
  { path: 'customers/:id/returned-history', Page: CustomerReturnedHistoryPage },
  { path: 'customers/:id/purchase-history', Page: CustomerPurchaseHistoryPage },
  // Assets (Transaction Based)
  { path: 'asset-assignments', Page: AssetAssignmentPage },
  { path: 'asset-assignments/new', Page: CreateAssetAssignmentPage },
  { path: 'asset-assignments/:assignmentId', Page: AssetAssignmentDetailPage },
  // Products & Master Data
  { path: 'inventory', Page: InventoryPage },
  { path: 'inventory/:itemId/history', Page: InventoryHistoryPage },
  { path: 'assets', Page: AssetPage },
  { path: 'assets/new', Page: CreateAssetPage },
  { path: 'assets/:assetId/history', Page: AssetHistoryPage },
  { path: 'assets/edit/:assetId', Page: EditAssetPage },
  { path: 'product-models', Page: ProductModelPage },
  { path: 'brands', Page: BrandPage },
  { path: 'categories', Page: CategoryPage },
  // System & Repair
  { path: 'repairs', Page: RepairListPage },
  { path: 'repairs/new', Page: CreateRepairPage },
  { path: 'repairs/:repairId', Page: RepairDetailPage },
  { path: 'addresses', Page: AddressPage },
  { path: 'users', Page: UserManagementPage },
  { path: 'users/:userId/assets', Page: UserAssetHistoryPage },
  { path: 'users/:userId/active-assets', Page: UserActiveAssetsPage },
  { path: 'profile', Page: ProfilePage },
];

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'login',
        element: <LoginPage />
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <MainLayout />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              ...routes.map(({ path, Page }) => ({
                path,
                element: <Suspense fallback={<Loading />}><Page /></Suspense>,
              })),
            ]
          }
        ]
      }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);