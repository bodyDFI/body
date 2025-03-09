import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const HomeContainer = styled.div`
  padding: 2rem;
`;

const HeroSection = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #1E1E1E 0%, #2D2D2D 100%);
  border-radius: 12px;
  margin-bottom: 3rem;
`;

const HeroTitle = styled.h1`
  font-size: 3rem;
  color: #14F195;
  margin-bottom: 1rem;
`;

const HeroSubtitle = styled.p`
  font-size: 1.5rem;
  color: #FFFFFF;
  max-width: 800px;
  margin-bottom: 2rem;
`;

const HeroButton = styled(Link)`
  display: inline-block;
  padding: 1rem 2rem;
  background-color: #14F195;
  color: #1E1E1E;
  font-weight: bold;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(20, 241, 149, 0.3);
  }
`;

const FeaturesSection = styled.section`
  margin: 4rem 0;
`;

const SectionTitle = styled.h2`
  font-size: 2rem;
  color: #14F195;
  text-align: center;
  margin-bottom: 2rem;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
`;

const FeatureCard = styled.div`
  background-color: #2A2A2A;
  border-radius: 8px;
  padding: 2rem;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }
`;

const FeatureTitle = styled.h3`
  font-size: 1.5rem;
  color: #14F195;
  margin-bottom: 1rem;
`;

const FeatureDescription = styled.p`
  color: #FFFFFF;
`;

const ComparisonSection = styled.section`
  margin: 4rem 0;
`;

const ComparisonTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 2rem;
`;

const TableHead = styled.thead`
  background-color: #14F195;
  color: #1E1E1E;
`;

const TableHeadCell = styled.th`
  padding: 1rem;
  text-align: left;
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: #2A2A2A;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #444;
  color: #FFFFFF;
`;

const HomePage = () => {
  return (
    <HomeContainer>
      <HeroSection>
        <HeroTitle>将你的身体数据转化为数字资产</HeroTitle>
        <HeroSubtitle>
          BodyDFi是一个基于Solana的革命性区块链项目，创建了一个全新的"数据挖矿"生态系统。
          通过我们的平台，你可以控制、拥有并货币化你的身体数据。
        </HeroSubtitle>
        <HeroButton to="/dashboard">开始使用</HeroButton>
      </HeroSection>

      <FeaturesSection>
        <SectionTitle>主要特点</SectionTitle>
        <FeaturesGrid>
          <FeatureCard>
            <FeatureTitle>数据所有权</FeatureTitle>
            <FeatureDescription>
              拥有并控制你的身体数据，不再让大公司免费使用你的宝贵信息。
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureTitle>数据货币化</FeatureTitle>
            <FeatureDescription>
              通过提供有价值的身体数据赚取$MOVE代币，将日常活动转化为加密货币奖励。
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureTitle>数据市场</FeatureTitle>
            <FeatureDescription>
              将你的数据出售给需要它的企业，完全按照你设定的条款和价格。
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureTitle>多层次硬件</FeatureTitle>
            <FeatureDescription>
              从基础传感器到医疗级设备，我们的生态系统适合各种用户需求和使用场景。
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureTitle>治理</FeatureTitle>
            <FeatureDescription>
              通过$BodyDFi代币参与社区驱动的决策，塑造平台的未来发展方向。
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureTitle>低门槛进入</FeatureTitle>
            <FeatureDescription>
              从价格实惠的传感器开始，无需高额初始投资即可加入生态系统。
            </FeatureDescription>
          </FeatureCard>
        </FeaturesGrid>
      </FeaturesSection>

      <ComparisonSection>
        <SectionTitle>BodyDFi vs STEPN</SectionTitle>
        <ComparisonTable>
          <TableHead>
            <tr>
              <TableHeadCell>特性</TableHeadCell>
              <TableHeadCell>STEPN</TableHeadCell>
              <TableHeadCell>BodyDFi</TableHeadCell>
            </tr>
          </TableHead>
          <tbody>
            <TableRow>
              <TableCell>核心资产</TableCell>
              <TableCell>NFT运动鞋</TableCell>
              <TableCell>身体数据所有权</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>收入来源</TableCell>
              <TableCell>新用户购买NFT</TableCell>
              <TableCell>实际数据销售+设备</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>设备要求</TableCell>
              <TableCell>单一高价入口</TableCell>
              <TableCell>多层次、灵活选择</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>应用范围</TableCell>
              <TableCell>仅限有氧运动</TableCell>
              <TableCell>全方位身体活动+专业场景</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>价值主张</TableCell>
              <TableCell>"运动赚钱"</TableCell>
              <TableCell>"数据即资产"</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>长期价值</TableCell>
              <TableCell>依赖代币价格上涨</TableCell>
              <TableCell>基于实际产业需求</TableCell>
            </TableRow>
          </tbody>
        </ComparisonTable>
      </ComparisonSection>
    </HomeContainer>
  );
};

export default HomePage; 