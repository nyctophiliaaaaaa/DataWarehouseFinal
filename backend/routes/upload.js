const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const supabase = require('../config/supabase');
const router = express.Router();

// Memory storage for file upload (10MB limit)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const TABLE_SCHEMAS = {
  // Database Table Name  :  [ List of Expected CSV Headers ]
  'raw_airports':   ['AirportKey', 'AirportName', 'City', 'Country'],
  'raw_airlines':   ['AirlineKey', 'AirlineName', 'Alliance'],
  'raw_flights':    ['FlightKey', 'OriginAirportKey', 'DestinationAirportKey', 'AircraftType'],
  'raw_passengers': ['PassengerKey', 'FullName', 'Email', 'LoyaltyStatus'],
  'raw_sales':      ['TransactionID', 'TransactionDate', 'PassengerID', 'FlightID', 'TicketPrice', 'Taxes', 'BaggageFees', 'TotalAmount']
};

// --- HELPER: Identify table based on CSV columns ---
function identifyTableByHeaders(firstRow) {
  if (!firstRow) return null;

  // 1. Get the headers from the uploaded file (normalized to lowercase)
  const uploadedHeaders = Object.keys(firstRow).map(h => h.trim().toLowerCase());
  const uploadedSet = new Set(uploadedHeaders);

  // 2. Compare against our known schemas
  for (const [tableName, requiredHeaders] of Object.entries(TABLE_SCHEMAS)) {
    // Normalize our config headers to lowercase
    const requiredSet = new Set(requiredHeaders.map(h => h.toLowerCase()));

    // Check: Do the uploaded headers contain ALL the required headers for this table?
    // We use "every" to ensure the file has every column we need.
    const isMatch = [...requiredSet].every(header => uploadedSet.has(header));

    if (isMatch) {
      return tableName;
    }
  }
  return null; // No match found
}

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    console.log(`\n--- 📥 START UPLOAD: ${req.file.originalname} ---`);

    // 1. Parse CSV FIRST (We need to see the data to know the table)
    // 1. Parse CSV FIRST
    parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // 👈 ADD THIS LINE! (Crucial for Excel files)
      relax_column_count: true, 
      skip_records_with_error: true
    }, async (err, records) => {

      if (err) {
        console.error('❌ CSV Parse Error:', err);
        return res.status(500).json({ error: 'Failed to parse CSV file content.' });
      }

      console.log(`📊 Rows Parsed: ${records.length}`);

      if (records.length === 0) {
        return res.json({ success: true, message: 'File uploaded but CSV was empty.' });
      }

      // 2. Identify Target Table using the HEADERS of the first row
      const firstRow = records[0];
      const tableName = identifyTableByHeaders(firstRow);

      // If we couldn't match the headers to any table in TABLE_SCHEMAS
      if (!tableName) {
        const foundHeaders = Object.keys(firstRow).join(', ');
        console.error(`❌ Error: CSV headers [${foundHeaders}] do not match any known table schema.`);
        return res.status(400).json({ 
          error: 'Could not identify table from CSV headers.',
          detected_headers: foundHeaders,
          allowed_schemas: TABLE_SCHEMAS // Helpful for debugging
        });
      }

      console.log(`✅ Identified Table: ${tableName}`);

      // 3. Upload to Storage Bucket (Backup)
      // We use the detected table name in the folder path for organization
      const filePath = `uploads/${tableName}/${Date.now()}_${req.file.originalname}`;
      
      const { error: storageError } = await supabase.storage
        .from('raw-datasets')
        .upload(filePath, req.file.buffer, { contentType: 'text/csv' });
      
      if (storageError) console.warn('⚠️ Storage Upload Warning:', storageError.message);

      // 4. Insert into Database
      console.log(`🚀 Inserting data into ${tableName}...`);
      
      const { data, error: insertError } = await supabase
        .from(tableName)
        .insert(records)
        .select();

      if (insertError) {
        console.error(`❌ INSERT FAILED for ${tableName}:`, insertError.message);
        return res.status(500).json({ 
          error: `Database insert failed: ${insertError.message}`,
          details: insertError.details
        });
      }

      console.log(`✅ SUCCESS: Inserted ${data?.length || records.length} rows.`);

      res.json({
        success: true,
        message: `Successfully identified data as '${tableName}' and inserted ${records.length} rows.`,
        file: { name: req.file.originalname, target_table: tableName }
      });
    });

  } catch (error) {
    console.error('❌ Server Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;