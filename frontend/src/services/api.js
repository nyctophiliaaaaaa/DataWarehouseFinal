// API Service for Backend Communication
const API_BASE_URL = 'http://localhost:3001/api'; // Adjust port if needed

class APIService {
  /**
   * Upload CSV file to backend
   * @param {File} file - The CSV file to upload
   * @param {string} datasetType - Type of dataset (e.g., 'sales', 'flights')
   * @returns {Promise} Response from backend
   */
  async uploadFile(file, datasetType) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataset_type', datasetType);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Clean data
   * @param {string} datasetType - Type of dataset to clean
   * @returns {Promise} Response from backend
   */
  async cleanData(datasetType) {
    try {
      const response = await fetch(`${API_BASE_URL}/process/clean`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataset_type: datasetType
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Cleaning failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Clean error:', error);
      throw error;
    }
  }

  /**
   * Load data to warehouse
   * @param {string} datasetType - Type of dataset to load
   * @returns {Promise} Response from backend
   */
  async loadData(datasetType) {
    try {
      const response = await fetch(`${API_BASE_URL}/process/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataset_type: datasetType
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Loading failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Load error:', error);
      throw error;
    }
  }

  /**
   * Get audit logs
   * @param {number} limit - Number of logs to fetch
   * @param {string} datasetType - Filter by dataset type (optional)
   * @returns {Promise} Response from backend
   */
  async getAuditLogs(limit = 50, datasetType = null) {
    try {
      let url = `${API_BASE_URL}/audit/logs?limit=${limit}`;
      if (datasetType) {
        url += `&dataset_type=${datasetType}`;
      }

      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch logs');
      }

      return await response.json();
    } catch (error) {
      console.error('Audit logs error:', error);
      throw error;
    }
  }

  /**
   * Health check
   * @returns {Promise} Response from backend
   */
  async healthCheck() {
    try {
      const response = await fetch(`http://localhost:3001/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Backend is not responding');
      }

      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const apiService = new APIService();
export default apiService;