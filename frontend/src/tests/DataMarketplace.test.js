import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import MarketplacePage from '../pages/MarketplacePage';

// Mock the wallet context
jest.mock('@solana/wallet-adapter-react', () => {
  const original = jest.requireActual('@solana/wallet-adapter-react');
  return {
    ...original,
    useWallet: () => ({
      connected: true,
      publicKey: { toString: () => 'TestPublicKey123' },
      connecting: false,
      disconnect: jest.fn(),
      select: jest.fn(),
      wallet: { adapter: { name: 'Phantom' } }
    })
  };
});

// Mock the API service
jest.mock('../services/api', () => ({
  getDataListings: jest.fn().mockResolvedValue({
    success: true,
    data: [
      {
        id: '1',
        title: '健身训练数据集',
        provider: { username: 'FitnessPro123', reputationScore: 85 },
        description: '包含6个月的详细健身训练数据，包括动作、心率、能量消耗等指标。',
        dataTypes: [0, 1],
        pricePerAccess: 150,
        accessPeriod: 2592000,
        purchaseCount: 27
      },
      {
        id: '2',
        title: '跑步生物力学数据',
        provider: { username: 'RunnerScience', reputationScore: 92 },
        description: '专业跑步者的详细生物力学数据，包括步态分析、压力分布等。',
        dataTypes: [0, 2, 3],
        pricePerAccess: 300,
        accessPeriod: 5184000,
        purchaseCount: 15
      }
    ]
  }),
  purchaseDataAccess: jest.fn().mockResolvedValue({
    success: true,
    message: 'Data access purchase initiated',
    data: {
      accessId: 'access123',
      listingId: '1',
      transactionInstruction: {}
    }
  })
}));

// Test wrapper component
const TestWrapper = ({ children }) => {
  // Set up a mock Solana connection
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);
  const wallets = [new PhantomWalletAdapter()];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </WalletProvider>
    </ConnectionProvider>
  );
};

describe('MarketplacePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders marketplace page with listings', async () => {
    render(
      <TestWrapper>
        <MarketplacePage />
      </TestWrapper>
    );

    // Check if page title is rendered
    expect(screen.getByText('数据市场')).toBeInTheDocument();

    // Wait for listings to load
    await waitFor(() => {
      expect(screen.getByText('健身训练数据集')).toBeInTheDocument();
      expect(screen.getByText('跑步生物力学数据')).toBeInTheDocument();
    });
  });

  test('filters listings by data type', async () => {
    render(
      <TestWrapper>
        <MarketplacePage />
      </TestWrapper>
    );

    // Wait for listings to load
    await waitFor(() => {
      expect(screen.getByText('健身训练数据集')).toBeInTheDocument();
    });

    // Select a filter option
    const filterSelect = screen.getByLabelText('数据类型');
    fireEvent.change(filterSelect, { target: { value: '2' } }); // Filter by pressure data

    // Only the second listing should be visible
    await waitFor(() => {
      expect(screen.queryByText('健身训练数据集')).not.toBeInTheDocument();
      expect(screen.getByText('跑步生物力学数据')).toBeInTheDocument();
    });
  });

  test('sorts listings by price', async () => {
    render(
      <TestWrapper>
        <MarketplacePage />
      </TestWrapper>
    );

    // Wait for listings to load
    await waitFor(() => {
      expect(screen.getByText('健身训练数据集')).toBeInTheDocument();
    });

    // Select sort option: price high to low
    const sortSelect = screen.getByLabelText('排序方式');
    fireEvent.change(sortSelect, { target: { value: 'price-desc' } });

    // Check if order is changed
    const listingCards = screen.getAllByTestId('listing-card');
    expect(listingCards[0]).toHaveTextContent('跑步生物力学数据');
    expect(listingCards[1]).toHaveTextContent('健身训练数据集');
  });

  test('initiates a purchase when buy button is clicked', async () => {
    render(
      <TestWrapper>
        <MarketplacePage />
      </TestWrapper>
    );

    // Wait for listings to load
    await waitFor(() => {
      expect(screen.getByText('健身训练数据集')).toBeInTheDocument();
    });

    // Click purchase button on the first listing
    const purchaseButtons = screen.getAllByText('购买访问权');
    fireEvent.click(purchaseButtons[0]);

    // Check if purchase confirmation dialog appears
    expect(screen.getByText('确认购买')).toBeInTheDocument();
    expect(screen.getByText('您即将购买以下数据的访问权限:')).toBeInTheDocument();
    expect(screen.getByText('健身训练数据集')).toBeInTheDocument();
    expect(screen.getByText('150 $MOVE')).toBeInTheDocument();

    // Confirm purchase
    const confirmButton = screen.getByText('确认');
    fireEvent.click(confirmButton);

    // Verify purchase API was called
    await waitFor(() => {
      expect(require('../services/api').purchaseDataAccess).toHaveBeenCalledWith('1');
    });

    // Check success message
    expect(screen.getByText('购买已发起')).toBeInTheDocument();
    expect(screen.getByText('交易已提交到区块链，请稍后检查您的数据访问权限。')).toBeInTheDocument();
  });

  test('shows empty state when no listings match filter', async () => {
    render(
      <TestWrapper>
        <MarketplacePage />
      </TestWrapper>
    );

    // Wait for listings to load
    await waitFor(() => {
      expect(screen.getByText('健身训练数据集')).toBeInTheDocument();
    });

    // Enter a search term that won't match any listings
    const searchInput = screen.getByPlaceholderText('搜索数据列表...');
    fireEvent.change(searchInput, { target: { value: 'nosuchdata' } });

    // Check if empty state is shown
    await waitFor(() => {
      expect(screen.getByText('未找到符合条件的数据列表')).toBeInTheDocument();
      expect(screen.getByText('尝试调整过滤条件或搜索词')).toBeInTheDocument();
    });
  });
}); 