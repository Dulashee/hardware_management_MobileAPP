import axios from 'axios';
import * as SecureStore from 'expo-secure-store';


const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hardwaremanagementmobileapp-production.up.railway.app/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export const toAbsoluteFileUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace('http://localhost', API_ORIGIN).replace('http://127.0.0.1', API_ORIGIN);
  }
  if (url.startsWith('/')) {
    return `${API_ORIGIN}${url}`;
  }
  return `${API_ORIGIN}/${url}`;
};

/**
 * Create axios instance with default configuration
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Attaches JWT token to authorization header if available
 */
api.interceptors.request.use(
  async (config) => {
    try {
      // If sending FormData, don't force JSON content-type (breaks multer parsing on server)
      if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        if (config.headers && config.headers['Content-Type']) {
          delete config.headers['Content-Type'];
        }
        if (config.headers && config.headers['content-type']) {
          delete config.headers['content-type'];
        }
      }

      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles common error scenarios (401, 403, 500)
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const { status } = error.response;

      // Unauthorized - Token expired or invalid
      if (status === 401) {
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('userData');
        // Navigate to login screen (handled by AuthContext)
      }

      // Forbidden - Insufficient permissions
      if (status === 403) {
        console.error('Access denied: Insufficient permissions');
      }

      // Server error
      if (status >= 500) {
        console.error('Server error:', error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Helper function for file uploads using XMLHttpRequest
 * More reliable than fetch for file uploads in React Native
 */
const uploadWithXHR = (url, method, formData) => {
  return new Promise(async (resolve, reject) => {
    const token = await SecureStore.getItemAsync('authToken');
    
    if (!token) {
      return reject(new Error('Authentication token not found. Please login again.'));
    }

    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        console.log(`Upload progress: ${progress.toFixed(0)}%`);
      }
    };
    
    xhr.onload = () => {
      console.log('XHR Status:', xhr.status);
      
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const responseData = JSON.parse(xhr.responseText);
          resolve({ data: responseData });
        } catch (e) {
          reject(new Error('Invalid server response'));
        }
      } else {
        let errorMessage = 'Upload failed';
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${xhr.status}`;
        }
        const error = new Error(errorMessage);
        error.response = { status: xhr.status, data: JSON.parse(xhr.responseText || '{}') };
        reject(error);
      }
    };
    
    xhr.onerror = () => {
      console.error('XHR Error - Network request failed');
      console.error('URL:', url);
      reject(new Error('Network error: Cannot connect to server. Please check your connection.'));
    };
    
    xhr.ontimeout = () => {
      console.error('XHR Timeout');
      reject(new Error('Upload timeout. Please try again.'));
    };
    
    xhr.open(method, url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 60000; // 60 seconds timeout for file uploads
    
    console.log('Uploading file via XHR...', { url, method });
    xhr.send(formData);
  });
};

// ==========================================
// API Service Functions
// ==========================================

/**
 * Authentication APIs
 */
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getAllUsers: () => api.get('/auth/users'),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

/**
 * Product APIs
 */
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: async (data) => {
    // Use XHR for file uploads to avoid network issues in React Native
    if (data instanceof FormData) {
      return uploadWithXHR(`${API_URL}/products`, 'POST', data);
    }
    return api.post('/products', data);
  },
  update: async (id, data) => {
    // Use XHR for file uploads to avoid network issues in React Native
    if (data instanceof FormData) {
      return uploadWithXHR(`${API_URL}/products/${id}`, 'PUT', data);
    }
    return api.put(`/products/${id}`, data);
  },
  delete: (id) => api.delete(`/products/${id}`),
  updateStock: (id, data) => api.patch(`/products/${id}/stock`, data),
  getLowStock: () => api.get('/products/low-stock'),
};

/**
 * Order APIs
 */
export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  cancel: (id) => api.delete(`/orders/${id}`),
  getStats: () => api.get('/orders/stats'),
  uploadPaymentProof: async (id, formData) => {
    const token = await SecureStore.getItemAsync('authToken');
    
    if (!token) {
      throw new Error('Authentication token not found. Please login again.');
    }
    
    const url = `${API_URL}/orders/${id}/payment-proof`;
    console.log('=== PAYMENT PROOF UPLOAD DEBUG ===');
    console.log('URL:', url);
    console.log('Token exists:', !!token);
    console.log('API_URL:', API_URL);
    
    try {
      // Use XMLHttpRequest for better error handling with file uploads in React Native
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            console.log('Upload progress:', progress.toFixed(0) + '%');
          }
        };
        
        xhr.onload = () => {
          console.log('XHR Status:', xhr.status);
          console.log('XHR Response:', xhr.responseText);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const responseData = JSON.parse(xhr.responseText);
              console.log('Upload successful');
              resolve({ data: responseData });
            } catch (e) {
              reject(new Error('Invalid server response'));
            }
          } else {
            let errorMessage = 'Upload failed';
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              errorMessage = `Server error: ${xhr.status}`;
            }
            reject(new Error(errorMessage));
          }
        };
        
        xhr.onerror = () => {
          console.error('XHR Error - Network request failed');
          console.error('URL attempted:', url);
          reject(new Error('Network error: Cannot connect to server. Please check your connection.'));
        };
        
        xhr.ontimeout = () => {
          console.error('XHR Timeout');
          reject(new Error('Upload timeout. Please try again.'));
        };
        
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 30000; // 30 seconds timeout
        
        console.log('Sending XHR request...');
        xhr.send(formData);
      });
    } catch (error) {
      console.error('API: Upload error:', error);
      throw error;
    }
  },
};

/**
 * Supplier APIs
 */
export const supplierAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: async (id, data) => {
    // Use XHR for file uploads to avoid network issues in React Native
    if (data instanceof FormData) {
      return uploadWithXHR(`${API_URL}/suppliers/${id}`, 'PUT', data);
    }
    return api.put(`/suppliers/${id}`, data);
  },
  delete: (id) => api.delete(`/suppliers/${id}`),
  uploadContract: async (id, formData) => {
    const token = await SecureStore.getItemAsync('authToken');
    
    if (!token) {
      throw new Error('Authentication token not found. Please login again.');
    }
    
    const url = `${API_URL}/suppliers/${id}/contract`;
    
    try {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            console.log('Contract upload progress:', progress.toFixed(0) + '%');
          }
        };
        
        xhr.onload = () => {
          console.log('Contract XHR Status:', xhr.status);
          console.log('Contract XHR Response:', xhr.responseText);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const responseData = JSON.parse(xhr.responseText);
              console.log('Contract upload successful');
              resolve({ data: responseData });
            } catch (e) {
              reject(new Error('Invalid server response'));
            }
          } else {
            let errorMessage = 'Contract upload failed';
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              errorMessage = `Server error: ${xhr.status}`;
            }
            reject(new Error(errorMessage));
          }
        };
        
        xhr.onerror = () => {
          console.error('Contract XHR Error - Network request failed');
          console.error('URL attempted:', url);
          reject(new Error('Network error: Cannot connect to server. Please check your connection.'));
        };
        
        xhr.ontimeout = () => {
          console.error('Contract XHR Timeout');
          reject(new Error('Upload timeout. Please try again.'));
        };
        
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 60000; // 60 seconds timeout for file uploads
        
        console.log('Sending contract XHR request...');
        xhr.send(formData);
      });
    } catch (error) {
      console.error('API: Contract upload error:', error);
      throw error;
    }
  },
};

/**
 * Notice APIs
 */
export const noticeAPI = {
  getAll: (params) => api.get('/notices', { params }),
  getActive: () => api.get('/notices/active'),
  getById: (id) => api.get(`/notices/${id}`),
  create: async (data) => {
    // Use XHR for file uploads to avoid network issues in React Native
    if (data instanceof FormData) {
      return uploadWithXHR(`${API_URL}/notices`, 'POST', data);
    }
    return api.post('/notices', data);
  },
  update: async (id, data) => {
    // Use XHR for file uploads to avoid network issues in React Native
    if (data instanceof FormData) {
      return uploadWithXHR(`${API_URL}/notices/${id}`, 'PUT', data);
    }
    return api.put(`/notices/${id}`, data);
  },
  delete: (id) => api.delete(`/notices/${id}`),
};

/**
 * Task APIs
 */
export const taskAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getMyTasks: (params) => api.get('/tasks/my-tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  delete: (id) => api.delete(`/tasks/${id}`),
  updateStatus: (id, data) => api.put(`/tasks/${id}/status`, data),
  uploadProof: async (id, formData) => {
    const token = await SecureStore.getItemAsync('authToken');
    const response = await fetch(`${API_URL}/tasks/${id}/proof`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    let responseData = null;
    try {
      responseData = await response.json();
    } catch (error) {
      responseData = null;
    }

    if (!response.ok) {
      const err = new Error(responseData?.message || 'Failed to upload proof');
      err.response = { status: response.status, data: responseData };
      throw err;
    }

    return { data: responseData };
  },
  getStats: () => api.get('/tasks/stats'),
};

/**
 * Repair APIs
 */
export const repairAPI = {
  getAll: (params) => api.get('/repairs', { params }),
  getById: (id) => api.get(`/repairs/${id}`),
  create: async (data) => {
    // Use XHR for file uploads to avoid network issues in React Native
    if (data instanceof FormData) {
      return uploadWithXHR(`${API_URL}/repairs`, 'POST', data);
    }
    return api.post('/repairs', data);
  },
  update: async (id, data) => {
    // Use XHR for file uploads to avoid network issues in React Native
    if (data instanceof FormData) {
      return uploadWithXHR(`${API_URL}/repairs/${id}`, 'PUT', data);
    }
    return api.put(`/repairs/${id}`, data);
  },
  updateStatus: (id, data) => api.put(`/repairs/${id}/status`, data),
  delete: (id) => api.delete(`/repairs/${id}`),
  uploadPhotos: async (id, formData) => {
    const token = await SecureStore.getItemAsync('authToken');
    
    if (!token) {
      throw new Error('Authentication token not found. Please login again.');
    }
    
    const url = `${API_URL}/repairs/${id}/photos`;
    
    try {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            console.log('Photo upload progress:', progress.toFixed(0) + '%');
          }
        };
        
        xhr.onload = () => {
          console.log('Photo XHR Status:', xhr.status);
          console.log('Photo XHR Response:', xhr.responseText);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const responseData = JSON.parse(xhr.responseText);
              console.log('Photo upload successful');
              resolve({ data: responseData });
            } catch (e) {
              reject(new Error('Invalid server response'));
            }
          } else {
            let errorMessage = 'Photo upload failed';
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              errorMessage = `Server error: ${xhr.status}`;
            }
            reject(new Error(errorMessage));
          }
        };
        
        xhr.onerror = () => {
          console.error('Photo XHR Error - Network request failed');
          console.error('URL attempted:', url);
          reject(new Error('Network error: Cannot connect to server. Please check your connection.'));
        };
        
        xhr.ontimeout = () => {
          console.error('Photo XHR Timeout');
          reject(new Error('Upload timeout. Please try again.'));
        };
        
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 60000; // 60 seconds timeout for file uploads
        
        console.log('Sending photo XHR request...');
        xhr.send(formData);
      });
    } catch (error) {
      console.error('API: Photo upload error:', error);
      throw error;
    }
  },
  getStats: () => api.get('/repairs/stats'),
};

export default api;
