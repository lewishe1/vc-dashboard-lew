import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Supabase Configuration - Only initialize if real credentials are provided
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Check if URL is valid and not a placeholder
const isValidUrl = (url) => {
  try {
    return url && url.startsWith('http') && !url.includes('your_project_url');
  } catch {
    return false;
  }
};

const supabase = isValidUrl(supabaseUrl) && supabaseKey && !supabaseKey.includes('your_anon_key')
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// Data Layer: Fetches sales data based on environment configuration
async function getSalesData() {
  const dataSource = process.env.DATA_SOURCE || 'csv';

  // 1. Supabase Mode
  if (dataSource.toLowerCase() === 'supabase' && supabase) {
    try {
      const { data, error } = await supabase
        .from('sales_data')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      if (data) {
        console.log('✅ Serving data from: Supabase');
        return data;
      }
    } catch (err) {
      console.warn('⚠️ Supabase connection failed. Trying local fallback...');
    }
  }

  // 2. Default Local CSV Mode
  console.log('✅ Serving data from: Local CSV');
  return new Promise((resolve, reject) => {
    const results = [];
    const csvPath = path.join(__dirname, 'public', 'data', 'sales_data.csv');

    if (!fs.existsSync(csvPath)) {
      return reject(new Error('CSV data file not found'));
    }

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => {
        // Auto-convert numeric fields
        const formattedRow = {};
        for (const key in data) {
          const val = data[key];
          formattedRow[key] = !isNaN(val) && val.trim() !== '' ? Number(val) : val;
        }
        results.push(formattedRow);
      })
      .on('end', () => {
        console.log('✅ Fetched data from local CSV (Fallback)');
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// REST API endpoint
app.get('/api/sales', async (req, res) => {
  try {
    const data = await getSalesData();
    res.json(data);
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from the dist directory after build
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Backend server ready at http://localhost:${PORT}`);
  if (supabase) {
    console.log('🔌 Supabase connection detected');
  } else {
    console.log('📁 Using local CSV mode (Set VITE_SUPABASE_URL in .env to enable DB)');
  }
});
