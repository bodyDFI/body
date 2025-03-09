const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * 加密工具 - 提供数据加密和解密功能
 */

// 加密算法配置
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

// 获取加密密钥
let encryptionKey;

/**
 * 初始化加密密钥
 * 如果存在密钥文件，则从文件加载；否则生成新的密钥并保存
 */
const initializeEncryptionKey = () => {
  try {
    // 尝试从环境变量获取密钥
    if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32) {
      encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
      return;
    }
    
    // 从配置获取密钥
    if (config.encryption && config.encryption.key && config.encryption.key.length >= 32) {
      encryptionKey = Buffer.from(config.encryption.key, 'hex');
      return;
    }
    
    // 检查密钥文件
    const keyFilePath = path.join(__dirname, '../../keys', 'encryption_key.key');
    
    // 确保目录存在
    if (!fs.existsSync(path.dirname(keyFilePath))) {
      fs.mkdirSync(path.dirname(keyFilePath), { recursive: true });
    }
    
    // 尝试读取密钥文件
    if (fs.existsSync(keyFilePath)) {
      encryptionKey = Buffer.from(fs.readFileSync(keyFilePath, 'utf-8'), 'hex');
      return;
    }
    
    // 生成新的随机密钥
    encryptionKey = crypto.randomBytes(KEY_LENGTH);
    
    // 保存密钥到文件
    fs.writeFileSync(keyFilePath, encryptionKey.toString('hex'), 'utf-8');
    console.log('已生成并保存新的加密密钥');
  } catch (error) {
    console.error('初始化加密密钥失败:', error);
    // 如果所有尝试都失败，生成基于主机名和时间的密钥
    const fallbackSeed = `${require('os').hostname()}-${Date.now()}`;
    encryptionKey = crypto.createHash('sha256').update(fallbackSeed).digest();
    console.warn('使用临时加密密钥，请在重新启动前设置正确的密钥');
  }
};

// 初始化密钥
initializeEncryptionKey();

/**
 * 加密数据
 * @param {string|Object} data - 要加密的数据
 * @param {Object} options - 加密选项
 * @returns {string} 加密后的字符串
 */
const encrypt = (data, options = {}) => {
  try {
    // 确保数据是字符串
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // 生成随机初始向量 (IV)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // 创建加密器
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
    
    // 加密数据
    let encrypted = cipher.update(dataString, 'utf-8', 'base64');
    encrypted += cipher.final('base64');
    
    // 获取认证标签
    const authTag = cipher.getAuthTag();
    
    // 组合加密结果
    const result = {
      iv: iv.toString('base64'),
      encryptedData: encrypted,
      authTag: authTag.toString('base64')
    };
    
    // 以指定格式返回
    if (options.format === 'json') {
      return JSON.stringify(result);
    } else {
      // 默认返回紧凑的字符串格式
      return `${result.iv}:${result.encryptedData}:${result.authTag}`;
    }
  } catch (error) {
    console.error('加密数据失败:', error);
    throw new Error('加密失败');
  }
};

/**
 * 解密数据
 * @param {string} encryptedData - 加密的数据
 * @param {Object} options - 解密选项
 * @returns {string|Object} 解密后的数据
 */
const decrypt = (encryptedData, options = {}) => {
  try {
    let iv, encrypted, authTag;
    
    // 解析加密数据
    if (typeof encryptedData === 'object') {
      // 如果是对象格式
      iv = Buffer.from(encryptedData.iv, 'base64');
      encrypted = encryptedData.encryptedData;
      authTag = Buffer.from(encryptedData.authTag, 'base64');
    } else if (encryptedData.includes('{') && encryptedData.includes('}')) {
      // 如果是JSON字符串格式
      try {
        const parsed = JSON.parse(encryptedData);
        iv = Buffer.from(parsed.iv, 'base64');
        encrypted = parsed.encryptedData;
        authTag = Buffer.from(parsed.authTag, 'base64');
      } catch (e) {
        // 非有效JSON，假设是紧凑格式
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
          throw new Error('无效的加密数据格式');
        }
        iv = Buffer.from(parts[0], 'base64');
        encrypted = parts[1];
        authTag = Buffer.from(parts[2], 'base64');
      }
    } else {
      // 紧凑字符串格式
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('无效的加密数据格式');
      }
      iv = Buffer.from(parts[0], 'base64');
      encrypted = parts[1];
      authTag = Buffer.from(parts[2], 'base64');
    }
    
    // 创建解密器
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
    
    // 设置认证标签
    decipher.setAuthTag(authTag);
    
    // 解密数据
    let decrypted = decipher.update(encrypted, 'base64', 'utf-8');
    decrypted += decipher.final('utf-8');
    
    // 如果是JSON，尝试解析
    if (options.parse) {
      try {
        return JSON.parse(decrypted);
      } catch (e) {
        return decrypted;
      }
    }
    
    return decrypted;
  } catch (error) {
    console.error('解密数据失败:', error);
    throw new Error('解密失败');
  }
};

/**
 * 哈希数据
 * @param {string} data - 要哈希的数据
 * @param {string} salt - 可选的盐值
 * @returns {string} 哈希后的字符串
 */
const hash = (data, salt = '') => {
  try {
    const saltedData = data + salt;
    return crypto.createHash('sha256').update(saltedData).digest('hex');
  } catch (error) {
    console.error('哈希数据失败:', error);
    throw new Error('哈希失败');
  }
};

/**
 * 生成安全的随机令牌
 * @param {number} length - 令牌长度（字节）
 * @returns {string} 随机令牌
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * 加密对象的指定字段
 * @param {Object} obj - 要处理的对象
 * @param {Array} fields - 要加密的字段名数组
 * @returns {Object} 处理后的对象
 */
const encryptFields = (obj, fields) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encrypt(result[field]);
    }
  }
  
  return result;
};

/**
 * 解密对象的指定字段
 * @param {Object} obj - 要处理的对象
 * @param {Array} fields - 要解密的字段名数组
 * @returns {Object} 处理后的对象
 */
const decryptFields = (obj, fields) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      try {
        result[field] = decrypt(result[field]);
      } catch (error) {
        console.warn(`解密字段 ${field} 失败，保持原值`);
      }
    }
  }
  
  return result;
};

/**
 * 验证哈希
 * @param {string} data - 原始数据
 * @param {string} hashedData - 哈希后的数据
 * @param {string} salt - 可选的盐值
 * @returns {boolean} 是否匹配
 */
const verifyHash = (data, hashedData, salt = '') => {
  return hash(data, salt) === hashedData;
};

module.exports = {
  encrypt,
  decrypt,
  hash,
  verifyHash,
  generateToken,
  encryptFields,
  decryptFields
}; 