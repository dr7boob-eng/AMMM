const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database file path
const dbPath = path.join(__dirname, 'data.json');

// Initialize database if it doesn't exist
if (!fs.existsSync(dbPath)) {
    const initialData = {
        321: [],
        330: [],
        777: [],
        999: []
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
        res.json(allData[section][itemIndex]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating data' });
    }
});

app.listen(PORT, () => {
    console.log(`AMM Reference Server running on http://localhost:${PORT}`);
});