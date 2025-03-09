import React from 'react';
import { Link } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import styled from 'styled-components';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #1E1E1E;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #14F195;
  display: flex;
  align-items: center;
  
  img {
    height: 40px;
    margin-right: 10px;
  }
`;

const Navigation = styled.nav`
  display: flex;
  gap: 2rem;
`;

const NavLink = styled(Link)`
  color: #FFFFFF;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
  
  &:hover {
    color: #14F195;
  }
`;

const WalletButton = styled.div`
  .wallet-adapter-button {
    background-color: #14F195;
    color: #1E1E1E;
    font-weight: bold;
  }
`;

const Header = () => {
  return (
    <HeaderContainer>
      <Logo>
        <img src="/assets/logos/bodydfi_logo.svg" alt="BodyDFi Logo" />
        BodyDFi
      </Logo>
      
      <Navigation>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/marketplace">Data Marketplace</NavLink>
        <NavLink to="/governance">Governance</NavLink>
        <NavLink to="/devices">Devices</NavLink>
      </Navigation>
      
      <WalletButton>
        <WalletMultiButton />
      </WalletButton>
    </HeaderContainer>
  );
};

export default Header; 