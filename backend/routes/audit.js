const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();

/**
 * GET /api/audit/logs
 * Fetches audit logs from AUDIT_MASTER table
 */
router.get('/logs', async (req, res) => {
  try {
    const { limit = 50, dataset_type } = req.query;

    console.log('📋 Fetching audit logs...');

    // Build query
    let query = supabase
      .from('AUDIT_MASTER')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    // Filter by dataset type if provided
    if (dataset_type) {
      query = query.eq('dataset_type', dataset_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Audit fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch audit logs',
        details: error.message
      });
    }

    res.json({
      success: true,
      count: data.length,
      logs: data
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Server error while fetching logs',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/errors
 * Fetches error logs from GARBAGE_LOGS table
 */
router.get('/errors', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    console.log('⚠️ Fetching error logs...');

    const { data, error } = await supabase
      .from('GARBAGE_LOGS')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Error fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch error logs',
        details: error.message
      });
    }

    res.json({
      success: true,
      count: data.length,
      errors: data
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Server error while fetching errors',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/stats
 * Get statistics about processed data
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching statistics...');

    // Get counts from various tables
    const stats = {};

    // Count successful loads
    const { count: successCount } = await supabase
      .from('AUDIT_MASTER')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'SUCCESS');

    // Count errors
    const { count: errorCount } = await supabase
      .from('GARBAGE_LOGS')
      .select('*', { count: 'exact', head: true });

    stats.successful_loads = successCount || 0;
    stats.total_errors = errorCount || 0;

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Server error while fetching stats',
      message: error.message
    });
  }
});

module.exports = router;