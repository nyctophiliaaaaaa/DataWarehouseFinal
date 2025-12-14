const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const supabase = require('../config/supabase');
const router = express.Router();

// Memory storage for file upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Helper: Map filename to table
function getTableName(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('airline')) return 'raw_airlines';
  if (lower.includes('airport')) return 'raw_airports';
  if (lower.includes('flight')) return 'raw_flights';
  if (lower.includes('sales')) return 'raw_sales';
  if (lower.includes('passenger')) return 'raw_passengers';
  return null;
}

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    console.log(`\n--- 📥 START UPLOAD: ${req.file.originalname} ---`);

    // 1. Identify Target Table
    const tableName = getTableName(req.file.originalname);
    if (!tableName) {
      console.error(`❌ Error: Could not match filename "${req.file.originalname}" to a table.`);
      return res.status(400).json({ 
        error: 'Filename must contain: airline, airport, flight, sales, or passenger' 
      });
    }
    console.log(`✅ Target Table: ${tableName}`);

    // 2. Parse CSV
   // 2. Parse CSV
    parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // <--- ADD THIS LINE (Prevents crashing on bad rows)
      skip_records_with_error: true // <--- AND THIS (Skips the bad row entirely if it can't fix it)
    }, async (err, records) => {

      console.log(`📊 Rows Found in CSV: ${records.length}`);

      if (records.length === 0) {
        console.warn('⚠️ Warning: CSV is empty or headers could not be read.');
        return res.json({ success: true, message: 'File uploaded but CSV was empty.' });
      }

      // 3. Upload to Storage Bucket (Backup)
      const filePath = `uploads/${Date.now()}_${req.file.originalname}`;
      const { error: storageError } = await supabase.storage
        .from('raw-datasets')
        .upload(filePath, req.file.buffer, { contentType: 'text/csv' });
      
      if (storageError) console.error('⚠️ Storage Upload Warning:', storageError.message);

      // 4. Insert into Database
      console.log(`🚀 Inserting data into ${tableName}...`);
      
      const { data, error: insertError } = await supabase
        .from(tableName)
        .insert(records)
        .select(); // essential to verify data was returned

      if (insertError) {
    console.error(`❌ CRITICAL INSERT FAILED for ${tableName}:`, insertError);
    console.error('  -- MESSAGE:', insertError.message);
    console.error('  -- DETAILS:', insertError.details); // This often names the column!

    return res.status(500).json({ 
        error: `Database insert failed: ${insertError.message}. Details: ${insertError.details}` 
    });
}

      console.log(`✅ SUCCESS: Inserted ${data?.length || records.length} rows.`);

      res.json({
        success: true,
        message: `Successfully uploaded and inserted ${records.length} rows into ${tableName}`,
        file: { name: req.file.originalname, target_table: tableName }
      });
    });

  } catch (error) {
    console.error('❌ Server Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;