import { REGEX_PATTERNS, SEO_THRESHOLDS, LIMITS } from './constants';

// Email validation
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!REGEX_PATTERNS.EMAIL.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true, error: null };
};

// Password validation
export const validatePassword = (password, options = {}) => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = false
  } = options;
  
  const errors = [];
  
  if (!password) {
    return { isValid: false, errors: ['Password is required'] };
  }
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (requireSpecialChars && !/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

// Calculate password strength
const calculatePasswordStrength = (password) => {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[@$!%*?&]/.test(password)) strength++;
  
  const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  
  return {
    score: strength,
    level: levels[Math.min(strength, levels.length - 1)],
    percentage: (strength / 6) * 100
  };
};

// URL validation
export const validateUrl = (url, options = {}) => {
  const { requireHttps = false, allowLocalhost = false } = options;
  
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }
  
  // Add protocol if missing
  let urlToValidate = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    urlToValidate = `https://${url}`;
  }
  
  try {
    const urlObj = new URL(urlToValidate);
    
    if (requireHttps && urlObj.protocol !== 'https:') {
      return { isValid: false, error: 'URL must use HTTPS protocol' };
    }
    
    if (!allowLocalhost && urlObj.hostname === 'localhost') {
      return { isValid: false, error: 'Localhost URLs are not allowed' };
    }
    
    return { isValid: true, error: null, normalizedUrl: urlObj.href };
  } catch (error) {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
};

// Domain validation
export const validateDomain = (domain) => {
  if (!domain) {
    return { isValid: false, error: 'Domain is required' };
  }
  
  // Remove protocol if present
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  if (!REGEX_PATTERNS.DOMAIN.test(cleanDomain)) {
    return { isValid: false, error: 'Please enter a valid domain name' };
  }
  
  return { isValid: true, error: null, cleanDomain };
};

// Shopify domain validation
export const validateShopifyDomain = (domain) => {
  if (!domain) {
    return { isValid: false, error: 'Shopify domain is required' };
  }
  
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  if (!REGEX_PATTERNS.SHOPIFY_DOMAIN.test(cleanDomain)) {
    return { isValid: false, error: 'Please enter a valid Shopify domain (e.g., mystore.myshopify.com)' };
  }
  
  return { isValid: true, error: null, cleanDomain };
};

// Keyword validation
export const validateKeyword = (keyword) => {
  if (!keyword || keyword.trim().length === 0) {
    return { isValid: false, error: 'Keyword is required' };
  }
  
  const trimmedKeyword = keyword.trim();
  
  if (trimmedKeyword.length < 2) {
    return { isValid: false, error: 'Keyword must be at least 2 characters long' };
  }
  
  if (trimmedKeyword.length > 100) {
    return { isValid: false, error: 'Keyword must be less than 100 characters' };
  }
  
  return { isValid: true, error: null, cleanKeyword: trimmedKeyword };
};

// Meta title validation
export const validateMetaTitle = (title) => {
  if (!title || title.trim().length === 0) {
    return { 
      isValid: false, 
      error: 'Title is required',
      warnings: [],
      length: 0 
    };
  }
  
  const trimmedTitle = title.trim();
  const length = trimmedTitle.length;
  const warnings = [];
  
  if (length < SEO_THRESHOLDS.TITLE_LENGTH.MIN) {
    warnings.push(`Title is too short (${length} chars). Recommended: ${SEO_THRESHOLDS.TITLE_LENGTH.MIN}-${SEO_THRESHOLDS.TITLE_LENGTH.MAX} chars`);
  }
  
  if (length > SEO_THRESHOLDS.TITLE_LENGTH.MAX) {
    warnings.push(`Title is too long (${length} chars). It may be truncated in search results`);
  }
  
  return {
    isValid: true,
    error: null,
    warnings,
    length,
    isOptimal: length >= SEO_THRESHOLDS.TITLE_LENGTH.MIN && length <= SEO_THRESHOLDS.TITLE_LENGTH.OPTIMAL
  };
};

// Meta description validation
export const validateMetaDescription = (description) => {
  if (!description || description.trim().length === 0) {
    return { 
      isValid: false, 
      error: 'Description is required',
      warnings: [],
      length: 0 
    };
  }
  
  const trimmedDescription = description.trim();
  const length = trimmedDescription.length;
  const warnings = [];
  
  if (length < SEO_THRESHOLDS.DESCRIPTION_LENGTH.MIN) {
    warnings.push(`Description is too short (${length} chars). Recommended: ${SEO_THRESHOLDS.DESCRIPTION_LENGTH.MIN}-${SEO_THRESHOLDS.DESCRIPTION_LENGTH.MAX} chars`);
  }
  
  if (length > SEO_THRESHOLDS.DESCRIPTION_LENGTH.MAX) {
    warnings.push(`Description is too long (${length} chars). It may be truncated in search results`);
  }
  
  return {
    isValid: true,
    error: null,
    warnings,
    length,
    isOptimal: length >= SEO_THRESHOLDS.DESCRIPTION_LENGTH.MIN && length <= SEO_THRESHOLDS.DESCRIPTION_LENGTH.OPTIMAL
  };
};

// File validation
export const validateFile = (file, options = {}) => {
  const {
    maxSize = LIMITS.MAX_FILE_SIZE,
    acceptedTypes = [],
    acceptedExtensions = []
  } = options;
  
  if (!file) {
    return { isValid: false, error: 'File is required' };
  }
  
  // Check file size
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `File size must be less than ${maxSize / 1048576}MB` 
    };
  }
  
  // Check file type
  if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `File type must be one of: ${acceptedTypes.join(', ')}` 
    };
  }
  
  // Check file extension
  if (acceptedExtensions.length > 0) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!acceptedExtensions.includes(`.${extension}`)) {
      return { 
        isValid: false, 
        error: `File extension must be one of: ${acceptedExtensions.join(', ')}` 
      };
    }
  }
  
  return { isValid: true, error: null };
};

// Number validation
export const validateNumber = (value, options = {}) => {
  const {
    min = null,
    max = null,
    integer = false,
    positive = false,
    required = true
  } = options;
  
  if (required && (value === null || value === undefined || value === '')) {
    return { isValid: false, error: 'Value is required' };
  }
  
  if (value === '' && !required) {
    return { isValid: true, error: null };
  }
  
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  if (integer && !Number.isInteger(numValue)) {
    return { isValid: false, error: 'Please enter a whole number' };
  }
  
  if (positive && numValue < 0) {
    return { isValid: false, error: 'Please enter a positive number' };
  }
  
  if (min !== null && numValue < min) {
    return { isValid: false, error: `Value must be at least ${min}` };
  }
  
  if (max !== null && numValue > max) {
    return { isValid: false, error: `Value must be at most ${max}` };
  }
  
  return { isValid: true, error: null, value: numValue };
};

// Date validation
export const validateDate = (date, options = {}) => {
  const {
    minDate = null,
    maxDate = null,
    required = true,
    futureOnly = false,
    pastOnly = false
  } = options;
  
  if (required && !date) {
    return { isValid: false, error: 'Date is required' };
  }
  
  if (!date && !required) {
    return { isValid: true, error: null };
  }
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }
  
  const now = new Date();
  
  if (futureOnly && dateObj <= now) {
    return { isValid: false, error: 'Please select a future date' };
  }
  
  if (pastOnly && dateObj >= now) {
    return { isValid: false, error: 'Please select a past date' };
  }
  
  if (minDate && dateObj < new Date(minDate)) {
    return { isValid: false, error: `Date must be after ${new Date(minDate).toLocaleDateString()}` };
  }
  
  if (maxDate && dateObj > new Date(maxDate)) {
    return { isValid: false, error: `Date must be before ${new Date(maxDate).toLocaleDateString()}` };
  }
  
  return { isValid: true, error: null, date: dateObj };
};

// Phone number validation (basic)
export const validatePhoneNumber = (phone, options = {}) => {
  const { required = true, country = 'US' } = options;
  
  if (required && !phone) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  if (!phone && !required) {
    return { isValid: true, error: null };
  }
  
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Basic validation for US numbers
  if (country === 'US') {
    if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
      return { isValid: false, error: 'Please enter a valid 10-digit phone number' };
    }
    
    if (cleanPhone.length === 11 && !cleanPhone.startsWith('1')) {
      return { isValid: false, error: 'Invalid phone number format' };
    }
  }
  
  return { isValid: true, error: null, cleanPhone };
};

// Form validation helper
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(validationRules).forEach(field => {
    const value = formData[field];
    const rules = validationRules[field];
    
    // Check required
    if (rules.required && (!value || value.toString().trim() === '')) {
      errors[field] = rules.message || `${field} is required`;
      isValid = false;
      return;
    }
    
    // Check custom validator
    if (rules.validate && value) {
      const validation = rules.validate(value, formData);
      if (validation !== true) {
        errors[field] = validation || `${field} is invalid`;
        isValid = false;
        return;
      }
    }
    
    // Check pattern
    if (rules.pattern && value && !rules.pattern.test(value)) {
      errors[field] = rules.message || `${field} format is invalid`;
      isValid = false;
      return;
    }
    
    // Check min length
    if (rules.minLength && value && value.length < rules.minLength) {
      errors[field] = `${field} must be at least ${rules.minLength} characters`;
      isValid = false;
      return;
    }
    
    // Check max length
    if (rules.maxLength && value && value.length > rules.maxLength) {
      errors[field] = `${field} must be at most ${rules.maxLength} characters`;
      isValid = false;
      return;
    }
  });
  
  return { isValid, errors };
};

// Batch validation helper
export const validateBatch = (items, validator) => {
  const results = items.map(item => validator(item));
  const valid = results.filter(r => r.isValid);
  const invalid = results.filter(r => !r.isValid);
  
  return {
    isValid: invalid.length === 0,
    valid,
    invalid,
    totalValid: valid.length,
    totalInvalid: invalid.length
  };
};

export default {
  validateEmail,
  validatePassword,
  validateUrl,
  validateDomain,
  validateShopifyDomain,
  validateKeyword,
  validateMetaTitle,
  validateMetaDescription,
  validateFile,
  validateNumber,
  validateDate,
  validatePhoneNumber,
  validateForm,
  validateBatch
};