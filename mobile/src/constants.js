// 应用程序常量设置

// 颜色配置
export const COLORS = {
  // 主题颜色
  primary: '#14F195',       // BodyDFi主题绿色
  primaryLight: '#E6FEF5',  // 主题浅绿色
  primaryDark: '#0DA671',   // 主题深绿色
  
  // 辅助颜色
  secondary: '#6369D1',     // 蓝紫色
  secondaryLight: '#E8E9FC',// 浅蓝紫色
  
  // 功能色
  success: '#25D366',       // 成功绿色
  error: '#FF4040',         // 错误红色
  errorLight: '#FFEFEF',    // 浅错误红色
  warning: '#FFA500',       // 警告橙色
  info: '#3498DB',          // 信息蓝色
  
  // 基础色
  white: '#FFFFFF',
  black: '#000000',
  dark: '#1A1D1F',
  gray: '#838B97',
  lightGray: '#E7ECF3',
  
  // 背景色
  background: '#F5F7FA',
  cardBackground: '#FFFFFF',
  
  // Solana相关颜色
  solana: '#9945FF',
  solanaGradient: ['#14F195', '#9945FF']
};

// 尺寸配置
export const SIZES = {
  // 基础间距
  base: 8,
  small: 12,
  medium: 16,
  large: 20,
  extraLarge: 24,
  
  // 字体大小
  h1: 30,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,
  body1: 16,
  body2: 14,
  body3: 12,
  small: 10,
  
  // 圆角大小
  radius: 8,
  radiusSmall: 4,
  radiusMedium: 12,
  radiusLarge: 16,
  radiusExtraLarge: 24,
  
  // 宽度百分比
  width100: '100%',
  width90: '90%',
  width80: '80%',
  width50: '50%',
  
  // 容器宽度
  contentWidth: '92%'
};

// 阴影样式
export const SHADOWS = {
  light: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  dark: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
};

// API配置
export const API_URL = 'https://api.bodydfi.com';

// 区块链配置
export const BLOCKCHAIN = {
  network: 'devnet', // 'mainnet', 'testnet', 'devnet'
  rpcUrl: 'https://api.devnet.solana.com',
  programId: 'BDFiC3XMQn4DCf3gFJJG9oKxVTXWE79MHBd6rZCvw2xk',
  tokenMint: 'BodyDFiTokenMint111111111111111111111111111'
};

// 传感器配置
export const SENSOR_CONFIG = {
  defaultSamplingRate: 50,
  maxSamplingRate: 200,
  minSamplingRate: 10,
  
  // 传感器数据模式
  DATA_MODES: {
    RAW: 0,       // 原始数据
    PROCESSED: 1, // 处理后的数据
    BOTH: 2       // 全部数据
  }
};

// 应用主题配置
export const THEME = {
  light: {
    background: COLORS.background,
    text: COLORS.dark,
    cardBackground: COLORS.white,
    primary: COLORS.primary
  },
  dark: {
    background: COLORS.dark,
    text: COLORS.white,
    cardBackground: '#1E1E1E',
    primary: COLORS.primary
  }
}; 