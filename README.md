# BigQuery Release Notes Web Application

A lightweight, modern web application built with Python Flask, vanilla HTML5, JavaScript (ES6+), and CSS3 to fetch, browse, filter, and share Google Cloud BigQuery release notes.

## Features

- **Live Atom Feed Ingestion**: Fetches directly from [BigQuery Release Notes Feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml).
- **Refresh with Spinner**: On-demand feed refresh button with visual spinner animation and timestamp indicator.
- **Granular Update Parsing**: Automatically separates each release date's updates by category (`Feature`, `Breaking`, `Change`, `Announcement`).
- **Real-Time Search & Filtering**: Instant keyword search and category pill filters.
- **Select & Tweet / Post to X**:
  - Click **"Select & Tweet"** on any specific update.
  - Formats an optimized tweet (< 280 characters) with category prefix and link to documentation.
  - Interactive composition modal with live character counter.
  - One-click launch to X/Twitter web intent or quick copy to clipboard.
- **Zero Heavy Frontend Frameworks**: Pure vanilla JS & CSS for snappy performance.

## Project Structure

```
bq-release-notes/
├── app.py              # Flask server and XML/Atom feed parser
├── requirements.txt    # Dependencies (flask, beautifulsoup4)
├── static/
│   ├── app.js          # Vanilla JavaScript UI logic
│   └── style.css       # Clean dark-themed CSS styling
└── templates/
    └── index.html      # Main responsive HTML layout
```

## Running the Application

1. Make sure dependencies are installed:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the Flask application:
   ```bash
   python app.py
   ```

3. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```
