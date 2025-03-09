import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import styled from 'styled-components';

const MarketplaceContainer = styled.div`
  padding: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  color: #14F195;
  margin-bottom: 2rem;
`;

const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 2rem;
  border-bottom: 1px solid #444;
`;

const Tab = styled.button`
  padding: 1rem 2rem;
  background-color: ${props => props.active ? '#14F195' : 'transparent'};
  color: ${props => props.active ? '#1E1E1E' : '#FFFFFF'};
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.active ? '#14F195' : '#2A2A2A'};
  }
`;

const FiltersContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  background-color: #2A2A2A;
  color: #FFFFFF;
  border: 1px solid #444;
  border-radius: 8px;
`;

const SearchInput = styled.input`
  padding: 0.75rem 1rem;
  background-color: #2A2A2A;
  color: #FFFFFF;
  border: 1px solid #444;
  border-radius: 8px;
  flex-grow: 1;

  &::placeholder {
    color: #888;
  }
`;

const ListingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
`;

const ListingCard = styled.div`
  background-color: #2A2A2A;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  }
`;

const ListingHeader = styled.div`
  padding: 1.5rem;
  background-color: #333;
`;

const ListingTitle = styled.h3`
  font-size: 1.25rem;
  color: #14F195;
  margin-bottom: 0.5rem;
`;

const ListingProvider = styled.p`
  font-size: 0.875rem;
  color: #CCC;
`;

const ListingBody = styled.div`
  padding: 1.5rem;
`;

const ListingDescription = styled.p`
  color: #FFFFFF;
  margin-bottom: 1rem;
`;

const ListingDetail = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  color: #CCC;
  font-size: 0.875rem;
`;

const ListingPrice = styled.div`
  font-size: 1.25rem;
  color: #14F195;
  font-weight: bold;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const PurchaseButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #14F195;
  color: #1E1E1E;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: #10CC7A;
  }

  &:disabled {
    background-color: #888;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #888;
`;

// Mock data for demonstration
const mockListings = [
  {
    id: '1',
    title: '健身训练数据集',
    provider: 'FitnessPro123',
    description: '包含6个月的详细健身训练数据，包括动作、心率、能量消耗等指标。',
    dataTypes: ['动作', '心率', '能量消耗'],
    accessPeriod: '1年',
    reputation: '★★★★☆',
    price: 150,
    purchaseCount: 27
  },
  {
    id: '2',
    title: '跑步生物力学数据',
    provider: 'RunnerScience',
    description: '专业跑步者的详细生物力学数据，包括步态分析、压力分布等。',
    dataTypes: ['压力', '动作', '肌肉活动'],
    accessPeriod: '2年',
    reputation: '★★★★★',
    price: 300,
    purchaseCount: 15
  },
  {
    id: '3',
    title: '医疗级康复数据',
    provider: 'RehabSpecialist',
    description: '髋关节置换术后患者的康复训练数据，包含恢复曲线分析。',
    dataTypes: ['医疗', '动作', '肌肉活动'],
    accessPeriod: '3年',
    reputation: '★★★★★',
    price: 750,
    purchaseCount: 8
  },
  {
    id: '4',
    title: '日常活动数据汇总',
    provider: 'LifeTracker365',
    description: '一整年的日常活动追踪数据，包含步数、睡眠、活动类型等。',
    dataTypes: ['动作', '生物特征'],
    accessPeriod: '6个月',
    reputation: '★★★☆☆',
    price: 80,
    purchaseCount: 42
  }
];

const MarketplacePage = () => {
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState('browse');
  const [dataType, setDataType] = useState('all');
  const [sortBy, setSortBy] = useState('price-asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState([]);

  useEffect(() => {
    // In a real app, this would fetch data from your backend or blockchain
    setListings(mockListings);
  }, []);

  const filteredListings = listings.filter(listing => {
    // Filter by data type
    if (dataType !== 'all' && !listing.dataTypes.includes(dataType)) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery && !listing.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !listing.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort listings
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'popularity':
        return b.purchaseCount - a.purchaseCount;
      case 'newest':
        return b.id - a.id;
      default:
        return 0;
    }
  });

  const handlePurchase = (listingId) => {
    // In a real app, this would interact with your Solana contract
    alert(`购买数据列表 #${listingId}。这将在真实应用中触发区块链交易。`);
  };

  return (
    <MarketplaceContainer>
      <PageTitle>数据市场</PageTitle>
      
      <TabsContainer>
        <Tab 
          active={activeTab === 'browse'} 
          onClick={() => setActiveTab('browse')}
        >
          浏览数据
        </Tab>
        <Tab 
          active={activeTab === 'my-listings'} 
          onClick={() => setActiveTab('my-listings')}
        >
          我的列表
        </Tab>
        <Tab 
          active={activeTab === 'my-purchases'} 
          onClick={() => setActiveTab('my-purchases')}
        >
          我的购买
        </Tab>
      </TabsContainer>
      
      <FiltersContainer>
        <FilterSelect 
          value={dataType} 
          onChange={(e) => setDataType(e.target.value)}
        >
          <option value="all">所有数据类型</option>
          <option value="动作">动作数据</option>
          <option value="生物特征">生物特征数据</option>
          <option value="压力">压力数据</option>
          <option value="肌肉活动">肌肉活动数据</option>
          <option value="医疗">医疗数据</option>
        </FilterSelect>
        
        <FilterSelect 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="price-asc">价格: 从低到高</option>
          <option value="price-desc">价格: 从高到低</option>
          <option value="popularity">人气优先</option>
          <option value="newest">最新发布</option>
        </FilterSelect>
        
        <SearchInput 
          placeholder="搜索数据列表..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </FiltersContainer>
      
      {activeTab === 'browse' && (
        <>
          {filteredListings.length > 0 ? (
            <ListingsGrid>
              {filteredListings.map(listing => (
                <ListingCard key={listing.id}>
                  <ListingHeader>
                    <ListingTitle>{listing.title}</ListingTitle>
                    <ListingProvider>提供者: {listing.provider}</ListingProvider>
                  </ListingHeader>
                  
                  <ListingBody>
                    <ListingDescription>{listing.description}</ListingDescription>
                    
                    <ListingDetail>
                      <span>数据类型:</span>
                      <span>{listing.dataTypes.join(', ')}</span>
                    </ListingDetail>
                    
                    <ListingDetail>
                      <span>访问期限:</span>
                      <span>{listing.accessPeriod}</span>
                    </ListingDetail>
                    
                    <ListingDetail>
                      <span>提供者信誉:</span>
                      <span>{listing.reputation}</span>
                    </ListingDetail>
                    
                    <ListingDetail>
                      <span>已售出:</span>
                      <span>{listing.purchaseCount} 次</span>
                    </ListingDetail>
                    
                    <ListingPrice>
                      <span>{listing.price} $MOVE</span>
                      <PurchaseButton 
                        disabled={!wallet.connected}
                        onClick={() => handlePurchase(listing.id)}
                      >
                        购买访问权
                      </PurchaseButton>
                    </ListingPrice>
                  </ListingBody>
                </ListingCard>
              ))}
            </ListingsGrid>
          ) : (
            <EmptyState>
              <h3>未找到符合条件的数据列表</h3>
              <p>尝试调整过滤条件或搜索词</p>
            </EmptyState>
          )}
        </>
      )}
      
      {activeTab === 'my-listings' && (
        <EmptyState>
          <h3>{wallet.connected ? '你还没有创建数据列表' : '请连接钱包查看你的数据列表'}</h3>
          {wallet.connected && (
            <p>开始通过创建数据列表来分享并销售你的数据</p>
          )}
        </EmptyState>
      )}
      
      {activeTab === 'my-purchases' && (
        <EmptyState>
          <h3>{wallet.connected ? '你还没有购买数据' : '请连接钱包查看你购买的数据'}</h3>
          {wallet.connected && (
            <p>浏览市场以查找并购买有价值的数据</p>
          )}
        </EmptyState>
      )}
    </MarketplaceContainer>
  );
};

export default MarketplacePage; 