const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Invalid email format']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  publicKey: {
    type: String,
    unique: true,
    sparse: true
  },
  isRegisteredDataProvider: {
    type: Boolean,
    default: false
  },
  dataProviderId: {
    type: String,
    unique: true,
    sparse: true
  },
  deviceType: {
    type: Number,
    enum: [0, 1, 2], // 0: Sensor, 1: Pro, 2: Medical
    default: 0
  },
  deviceDetails: {
    type: Object,
    default: {}
  },
  dataSubmissionCount: {
    type: Number,
    default: 0
  },
  totalRewards: {
    type: Number,
    default: 0
  },
  avgQualityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 4
  },
  reputationScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 1000
  },
  role: {
    type: String,
    enum: ['user', 'validator', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profilePicture: {
    type: String
  },
  bio: {
    type: String,
    maxlength: 500
  },
  socialLinks: {
    twitter: String,
    discord: String,
    telegram: String,
    website: String
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update reputation score
userSchema.methods.updateReputation = function(qualityScore) {
  const count = this.dataSubmissionCount;
  
  // Calculate consistency factor
  let consistencyFactor = 0;
  if (count < 10) {
    consistencyFactor = count * 2;
  } else if (count < 100) {
    consistencyFactor = 20 + (count - 10) / 2;
  } else {
    consistencyFactor = 65 + (count - 100) / 10;
  }

  // Calculate quality factor (scale 0-4 to 80-120)
  const qualityFactor = 80 + (this.avgQualityScore * 10);
  
  // Calculate overall reputation (capped at 1000)
  this.reputationScore = Math.min(consistencyFactor + qualityFactor, 1000);
  
  return this.reputationScore;
};

// Create and export the model
const User = mongoose.model('User', userSchema);

module.exports = User; 