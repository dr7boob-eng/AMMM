const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const fileUpload = require('express-fileupload');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use(express.static('public'));

// Database file path
const dbPath = path.join(__dirname, 'data.json');
const excelPath = path.join(__dirname, 'AMMM_Data.xlsx');

// Initialize database if it doesn't exist
if (!fs.existsSync(dbPath)) {
    const initialData = {
        321: [],
        330: [],
        777: [],
        787: []
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
}

// Get all data
app.get('/api/data', (req, res) => {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: 'Error reading data' });
    }
});

// Get data for specific section
app.get('/api/data/:section', (req, res) => {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        const allData = JSON.parse(data);
        const section = req.params.section;
        
        if (allData[section]) {
            res.json(allData[section]);
        } else {
            res.status(404).json({ error: 'Section not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error reading data' });
    }
});

// Add new data to a section
app.post('/api/data/:section', (req, res) => {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        const allData = JSON.parse(data);
        const section = req.params.section;
        
        if (!allData[section]) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        const newItem = {
            id: Date.now(),
            name: req.body.name,
            amm1: req.body.amm1,
            amm2: req.body.amm2,
            pn: req.body.pn,
            createdAt: new Date().toISOString()
        };
        
        allData[section].push(newItem);
        fs.writeFileSync(dbPath, JSON.stringify(allData, null, 2));
        
        // Update Excel file
        updateExcelFile(allData);
        
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: 'Error saving data' });
    }
});

// Delete data from a section
app.delete('/api/data/:section/:id', (req, res) => {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        const allData = JSON.parse(data);
        const section = req.params.section;
        const id = parseInt(req.params.id);
        
        if (!allData[section]) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        allData[section] = allData[section].filter(item => item.id !== id);
        fs.writeFileSync(dbPath, JSON.stringify(allData, null, 2));
        
        // Update Excel file
        updateExcelFile(allData);
        
        res.json({ message: 'Data deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting data' });
    }
});

// Update data in a section
app.put('/api/data/:section/:id', (req, res) => {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        const allData = JSON.parse(data);
        const section = req.params.section;
        const id = parseInt(req.params.id);
        
        if (!allData[section]) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        const itemIndex = allData[section].findIndex(item => item.id === id);
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        allData[section][itemIndex] = {
            ...allData[section][itemIndex],
            name: req.body.name,
            amm1: req.body.amm1,
            amm2: req.body.amm2,
            pn: req.body.pn,
            updatedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(dbPath, JSON.stringify(allData, null, 2));
        
        // Update Excel file
        updateExcelFile(allData);
        
        res.json(allData[section][itemIndex]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating data' });
    }
});

// Export to Excel
app.get('/api/export/excel', (req, res) => {
    try {
        if (fs.existsSync(excelPath)) {
            res.download(excelPath, 'AMMM_Data.xlsx');
        } else {
            res.status(404).json({ error: 'Excel file not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error downloading file' });
    }
});

// Import from Excel
app.post('/api/import/excel', (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const uploadedFile = req.files.file;
        const tempPath = path.join(__dirname, 'temp_import.xlsx');
        
        uploadedFile.mv(tempPath, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error uploading file' });
            }

            try {
                const workbook = XLSX.readFile(tempPath);
                const allData = {
                    321: [],
                    330: [],
                    777: [],
                    787: []
                };

                // Process each sheet
                for (const sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet);

                    if (allData[sheetName]) {
                        rows.forEach(row => {
                            if (row.name && row.amm1 && row.amm2 && row.pn) {
                                allData[sheetName].push({
                                    id: Date.now() + Math.random(),
                                    name: row.name,
                                    amm1: row.amm1,
                                    amm2: row.amm2,
                                    pn: row.pn,
                                    createdAt: new Date().toISOString()
                                });
                            }
                        });
                    }
                }

                fs.writeFileSync(dbPath, JSON.stringify(allData, null, 2));
                updateExcelFile(allData);
                fs.unlinkSync(tempPath);

                res.json({ message: 'Data imported successfully', data: allData });
            } catch (error) {
                fs.unlinkSync(tempPath);
                res.status(500).json({ error: 'Error processing Excel file' });
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error importing data' });
    }
});

// Function to update Excel file
function updateExcelFile(allData) {
    const workbook = XLSX.utils.book_new();

    for (const [section, items] of Object.entries(allData)) {
        const worksheetData = [];
        
        // Add header
        worksheetData.push({
            name: 'Name',
            amm1: 'AMM 1',
            amm2: 'AMM 2',
            pn: 'P/N',
            createdAt: 'Created At'
        });

        // Add items
        items.forEach(item => {
            worksheetData.push({
                name: item.name,
                amm1: item.amm1,
                amm2: item.amm2,
                pn: item.pn,
                createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : ''
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        
        // Set column widths
        worksheet['!cols'] = [
            { wch: 25 },
            { wch: 20 },
            { wch: 20 },
            { wch: 20 },
            { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, section);
    }

    XLSX.writeFile(workbook, excelPath);
}

// Initialize Excel file on startup
function initializeExcel() {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        const allData = JSON.parse(data);
        updateExcelFile(allData);
    } catch (error) {
        console.error('Error initializing Excel file:', error);
    }
}

app.listen(PORT, () => {
    console.log(`AMM Reference Server running on http://localhost:${PORT}`);
    console.log(`Excel file will be saved at: ${excelPath}`);
    initializeExcel();
});