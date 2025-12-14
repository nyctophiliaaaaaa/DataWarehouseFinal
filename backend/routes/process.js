const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();

// List of all datasets your system supports (matches your SQL Switchboard)
const KNOWN_DATASETS = ['airlines', 'airports', 'flights', 'sales', 'passengers'];

/**
 * HELPER: Run a sequence of RPC calls
 * This loops through all known datasets and runs the specific function for them.
 */
async function runSequence(actionPrefix) {
  const results = [];
  
  for (const type of KNOWN_DATASETS) {
    // Construct the function name (e.g., "sp_clean_airlines")
    const functionName = `sp_${actionPrefix}_${type}`;
    
    console.log(`🔄 Attempting: ${functionName}...`);
    
    try {
      // Call Supabase RPC
      const { data, error } = await supabase.rpc(functionName);
      
      if (error) {
        // If function doesn't exist (e.g. sp_clean_passengers might not be made yet), we skip it
        console.warn(`⚠️ Skipped ${type}: ${error.message}`);
        results.push({ type, status: 'skipped', details: error.message });
      } else {
        console.log(`✅ Success: ${functionName}`);
        results.push({ type, status: 'success', data });
      }
    } catch (err) {
      console.error(`❌ Error running ${functionName}:`, err);
      results.push({ type, status: 'error', error: err.message });
    }
  }
  return results;
}

/**
 * POST /api/process/clean
 * Triggers cleaning for ALL datasets
 */
router.post('/clean', async (req, res) => {
  try {
    console.log(`🧹 Starting Batch Clean...`);

    // This will call: sp_clean_airlines, sp_clean_airports, etc.
    const results = await runSequence('clean');

    res.json({
      success: true,
      message: `Batch cleaning finished`,
      results: results
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/process/load
 * Triggers loading for ALL datasets
 */
router.post('/load', async (req, res) => {
  try {
    console.log(`📥 Starting Batch Load...`);

    // This will call: sp_load_airlines, sp_load_airports, etc.
    const results = await runSequence('load');

    res.json({
      success: true,
      message: `Batch loading finished`,
      results: results
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/denormalize', async (req, res) => {
  try {
    console.log(`🔄 Building denormalized table...`);
    
    const { data, error } = await supabase.rpc('sp_build_denorm_table');
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'Denormalization failed'
      });
    }
    
    console.log(`✅ Denormalization complete`);
    
    res.json({ 
      success: true, 
      message: 'Denormalized table built successfully',
      data 
    });
  } catch (error) {
    console.error('❌ Denormalization error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error'
    });
  }
});
/**
 * POST /api/process
 * Triggers the Master Pipeline (Clean + Load) for ALL datasets
 */
router.post('/', async (req, res) => {
  try {
    console.log(`⚙️ Running Master Pipelines...`);

    // We loop through known types and call sp_master_pipeline for each
    const results = [];

    for (const type of KNOWN_DATASETS) {
      const { data, error } = await supabase.rpc('sp_master_pipeline', {
        dataset_type: type
      });
      
      if (error) {
         // Some datasets might not be supported by the master pipeline yet
         console.warn(`⚠️ Pipeline skipped for ${type}: ${error.message}`);
      } else {
         results.push({ type, data });
      }
    }

    res.json({
      success: true,
      message: `Master pipelines finished`,
      results
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;