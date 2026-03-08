import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      if (data) return data;
    } catch (err) {
      console.warn('⚠️ Supabase connection failed in API. Falling back to CSV.');
    }
  }

  // 2. Default Local CSV Mode
  return new Promise((resolve, reject) => {
    const results = [];
    const csvPath = path.join(process.cwd(), 'public', 'data', 'sales_data.csv');

    if (!fs.existsSync(csvPath)) {
      return reject(new Error('CSV data file not found at ' + csvPath));
    }

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => {
        const formattedRow = {};
        for (const key in data) {
          const val = data[key];
          formattedRow[key] = !isNaN(val) && val.trim() !== '' ? Number(val) : val;
        }
        results.push(formattedRow);
      })
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

export async function GET() {
  try {
    const data = await getSalesData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
