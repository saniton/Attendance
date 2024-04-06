require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Parse incoming requests with JSON payloads
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define a mongoose schema for registration data
const registrationSchema = new mongoose.Schema({
  name: String,
  stream: String,
  rollNumber: String,
  phoneNumber: String,
  email: String,
  qrNumber: String
});

// Define a mongoose model based on the schema
const Registration = mongoose.model('Registration', registrationSchema);

// Endpoint to save data to MongoDB
app.post('/saveData', async (req, res) => {
  try {
    const { name, stream, rollNumber, phoneNumber, email, qrNumber } = req.body;

    // Create a new instance of the Registration model with the received data
    const registration = new Registration({
      name,
      stream,
      rollNumber,
      phoneNumber,
      email,
      qrNumber
    });

    // Save the data to MongoDB
    await registration.save();

    res.status(200).json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//Google Sheets API integration
const credentials = require('./credentials.json'); // Your Google Sheets API credentials
const spreadsheetId = '1KZfjffzDTksJ2pFXQxSPqNFFsYvBYQpSWWgRPkYPQR4'; // Replace with your Google Sheet ID

const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

app.post('/api/saveToGoogleSheet', async (req, res) => {
  const { data } = req.body;

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: 'Sheet1!A1', // Specify the range where you want to insert the data
      valueInputOption: 'RAW',
      requestBody: {
        values: [[data]],
      },
    });

    console.log('Data inserted:', response.data);
    res.status(200).json({ success: true, message: 'Data inserted successfully' });
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ success: false, message: 'Error inserting data' });
  }
});











//Admin Login Validation
const validUsername = 'admin';
const validPassword = 'admin123';

app.use(bodyParser.json());

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username === validUsername && password === validPassword) {
    const token = jwt.sign({ username }, process.env.SECRET_KEY, { expiresIn: '10m' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid username or password' });
  }
});

app.post('/api/tokenVerify', (req, res) => {
  const { presentToken } = req.body;


  try {
    const decode = jwt.verify(presentToken, process.env.SECRET_KEY);
    res.status(200).json({ success: true, date: decode });
  }
  catch (e) {
    console.log('------', e.message, '-------')
    res.status(401).json({ success: false, message: ('Error while decoding token, Error: '+ e.message) });
  }
});

app.get('/getData/:qrNumber', async (req, res) => {
    const { qrNumber } = req.params;
  
    try {
      const register = await Registration.findOne({ qrNumber });
      if (!register) {
        return res.status(404).json({ error: 'User data not found.' });
      }
      return res.status(200).json(register);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  });
  
  app.get('/getData', async (req, res) => {
    const { qrNumber } = req.params;
  
    try {
      const registrations = await Registration.find();
      if (!registrations || registrations.length === 0) {
        return res.status(404).json({ error: 'No user data found.' });
      }
      return res.status(200).json(registrations);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  });
  
  app.get('/RedirectUser', async (req, res) => {
    // Extract the parameters from the query string
    const modelNo = req.query.model;
    const serialNo = req.query.serial;
    const rollNumber = modelNo + serialNo;
    console.log('------ API: redirect User', 'USER ROLL: ', rollNumber , '----------');
  
    // Handle the extracted parameters as needed
    // For demonstration, just sending them back as a JSON response
    try {
      const customHeader = req.headers['sani-scanner']; // Replace 'custom-header' with your actual header name
  
      // If the custom header is not present or doesn't match the expected value, return an error response
      if (!customHeader || customHeader !== 'pancakes') {
        // return res.status(403).json({ error: 'Unauthorized access.' }); // You can choose the appropriate status code
        return res.redirect('https://www.youtube.com');
      }
      const register = await Registration.findOne({ rollNumber });
      if (!register) {
        return res.status(404).json({ error: 'User data not found.' });
      }
      return res.status(200).json(register);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
    // res.json({ modelNo, serialNo });
  });
  
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  // Export the app as a Cloud Function
module.exports = app;
