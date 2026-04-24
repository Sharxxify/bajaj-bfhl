const express = require('express');
const cors = require('cors');
const { processData } = require('./logic');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
        return res.status(400).json({ error: "Missing 'data' in request body" });
    }
    const result = processData(data);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
