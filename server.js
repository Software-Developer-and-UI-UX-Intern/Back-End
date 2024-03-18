const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors'); // Import the cors middleware
require('dotenv').config();

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Check if the users table exists in the database
async function checkUsersTable() {
  try {
    const result = await pool.query(`SELECT to_regclass('public.users')`);
    return result.rows[0].to_regclass !== null;
  } catch (error) {
    console.error('Error checking users table:', error);
    return false;
  }
}

// Register route
app.post('/register', async (req, res) => {
  const { email, password, fullName, phoneNumber, domisili, jenisKelamin } = req.body;

  try {
    // Check if email is taken
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already taken' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user details in the database
    await pool.query(
      'INSERT INTO users (email, password, full_name, phone_number, domisili, jenis_kelamin) VALUES ($1, $2, $3, $4, $5, $6)',
      [email, hashedPassword, fullName, phoneNumber, domisili, jenisKelamin]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user in the database
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate JWT token
    const token = jwt.sign({ email: user.rows[0].email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to list users
app.get('/', async (req, res) => {
  try {
    // Check if users table exists
    const tableExists = await checkUsersTable();
    if (!tableExists) {
      return res.status(500).json({ error: 'Users table does not exist' });
    }

    // Fetch users from the database
    const users = await pool.query('SELECT * FROM users');
    res.json(users.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/hotels', async (req, res) => {
  try {
    const hotels = await pool.query('SELECT * FROM hotel');
    res.json(hotels.rows);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
