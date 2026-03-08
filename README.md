# VibeDash - SaaS Dashboard Setup Guide

This dashboard is built to be simple and powerful. By default, it reads data from a local CSV file, but you can upgrade to a real database (Supabase) in just 5 steps.

---

## 🛠 Step 1: Install Dependencies
Open your terminal in this folder and run:
```bash
npm install
```

## 🗄 Step 2: Set up Supabase (Optional)
If you want to use a real database instead of a CSV file:

1. **Create a Project**: Go to [Supabase](https://supabase.com) and create a free project.
2. **Create the Table**: Go to the **SQL Editor** in Supabase and run this command:
   ```sql
   CREATE TABLE sales_data (
     id BIGSERIAL PRIMARY KEY,
     date DATE NOT NULL,
     product TEXT NOT NULL,
     channel TEXT NOT NULL,
     orders INTEGER DEFAULT 0,
     revenue NUMERIC DEFAULT 0,
     cost NUMERIC DEFAULT 0,
     visitors INTEGER DEFAULT 0,
     customers INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
3. **Import Data (Visual Guide)**:
   - Click the **Table Editor** icon (looks like a grid/table) on the left sidebar.
   - Select the `sales_data` table you just created.
   - Click the **Insert** button at the top right and choose **Import CSV**.
   - Drag and drop your `sales_data.csv` (find it in your project at `public/data/sales_data.csv`).
   - Supabase will automatically map the columns. Review them and click **Import Data**.
   - Your data is now live in the cloud! 🚀

## 🔑 Step 3: Configure Environment
Open or create a file named `.env` in your project folder and add your credentials:

```env
# ✨ DATA SOURCE TOGGLE (Use 'csv' or 'supabase')
DATA_SOURCE=csv

# 🤖 GEMINI AI KEY
VITE_GEMINI_API_KEY=your_key_here

# 🔌 SUPABASE CREDENTIALS (Find in Project Settings -> API)
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 🚀 Step 4: Run the Dashboard
Start the full-stack app with one command:
```bash
npm run dev
```
- **View Dashboard**: [http://localhost:5173](http://localhost:5173)

---

## 💡 How it works for you
- **No-Code Switch**: To switch from CSV to Database, just change `DATA_SOURCE=csv` to `DATA_SOURCE=supabase` in your `.env` and restart.
- **Auto-Fallback**: If you set it to `supabase` but your database is empty or offline, the API will automatically switch back to your CSV so your dashboard keeps working!
- **AI Ready**: The "AI Insights" panel works regardless of your data source.
