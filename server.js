const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
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

// Get all oleh entries
app.get('/oleh', async (req, res) => {
  try {
    const olehEntries = await pool.query('SELECT * FROM oleh');
    res.json(olehEntries.rows);
  } catch (error) {
    console.error('Error fetching oleh entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get an oleh entry by name
app.get('/oleh/:nama', async (req, res) => {
  const { nama } = req.params;
  try {
    const olehEntry = await pool.query('SELECT * FROM oleh WHERE nama = $1', [nama]);
    if (olehEntry.rows.length === 0) {
      return res.status(404).json({ error: 'Oleh entry not found' });
    }
    res.json(olehEntry.rows[0]);
  } catch (error) {
    console.error('Error fetching oleh entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Insert an oleh entry
app.post('/oleh', async (req, res) => {
  const { nama, gambar_url1, gambar_url2, gambar_url3, tiket_masuk, parkir, description, domisili } = req.body;
  try {
    await pool.query(
      'INSERT INTO oleh (nama, gambar_url1, gambar_url2, gambar_url3, tiket_masuk, parkir, description, domisili) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [nama, gambar_url1, gambar_url2, gambar_url3, tiket_masuk, parkir, description, domisili]
    );
    res.status(201).json({ message: 'Oleh entry created successfully' });
  } catch (error) {
    console.error('Error inserting oleh entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an oleh entry
app.put('/oleh/:nama', async (req, res) => {
  const { nama } = req.params;
  const { gambar_url1, gambar_url2, gambar_url3, tiket_masuk, parkir, description, domisili } = req.body;
  try {
    const updateQuery = `
      UPDATE oleh
      SET gambar_url1 = $1, gambar_url2 = $2, gambar_url3 = $3, tiket_masuk = $4, parkir = $5, description = $6, domisili = $7
      WHERE nama = $8
    `;
    await pool.query(updateQuery, [gambar_url1, gambar_url2, gambar_url3, tiket_masuk, parkir, description, domisili, nama]);
    res.json({ message: 'Oleh entry updated successfully' });
  } catch (error) {
    console.error('Error updating oleh entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an oleh entry
app.delete('/oleh/:nama', async (req, res) => {
  const { nama } = req.params;
  try {
    // Check if the oleh exists
    const olehExists = await pool.query('SELECT * FROM oleh WHERE nama = $1', [nama]);
    if (olehExists.rows.length === 0) {
      return res.status(404).json({ error: 'Oleh entry not found' });
    }

    // Delete the oleh entry
    await pool.query('DELETE FROM oleh WHERE nama = $1', [nama]);
    res.json({ message: 'Oleh entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting oleh entry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all addresses
app.get('/addresses', async (req, res) => {
  try {
    const addresses = await pool.query('SELECT * FROM addresses');
    res.json(addresses.rows);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get addresses by oleh nama
app.get('/addresses/:nama', async (req, res) => {
  const { nama } = req.params;
  try {
    const addresses = await pool.query('SELECT * FROM addresses WHERE oleh_nama = $1', [nama]);
    res.json(addresses.rows);
  } catch (error) {
    console.error('Error fetching addresses for oleh:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Insert an address for an oleh entry
app.post('/addresses/:nama', async (req, res) => {
  const { nama } = req.params;
  const { nama: addressNama, gambar_url, google_map_url } = req.body;
  try {
    const olehExists = await pool.query('SELECT * FROM oleh WHERE nama = $1', [nama]);
    if (olehExists.rows.length === 0) {
      return res.status(404).json({ error: 'Oleh entry not found' });
    }

    await pool.query(
      'INSERT INTO addresses (oleh_nama, nama, gambar_url, google_map_url) VALUES ($1, $2, $3, $4)',
      [nama, addressNama, gambar_url, google_map_url]
    );
    res.status(201).json({ message: 'Address created successfully' });
  } catch (error) {
    console.error('Error inserting address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an address for an oleh entry
app.put('/addresses/:nama/:addressName', async (req, res) => {
  const { nama, addressName } = req.params;
  const { nama: newAddressNama, gambar_url, google_map_url } = req.body;
  try {
    const olehExists = await pool.query('SELECT * FROM oleh WHERE nama = $1', [nama]);
    if (olehExists.rows.length === 0) {
      return res.status(404).json({ error: 'Oleh entry not found' });
    }

    const addressExistsQuery = `
      SELECT * FROM addresses WHERE nama = $1 AND oleh_nama = $2
    `;
    const addressExists = await pool.query(addressExistsQuery, [addressName, nama]);
    if (addressExists.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found for the specified Oleh entry' });
    }

    const updateQuery = `
      UPDATE addresses
      SET nama = $1, gambar_url = $2, google_map_url = $3
      WHERE nama = $4 AND oleh_nama = $5
    `;
    await pool.query(updateQuery, [newAddressNama, gambar_url, google_map_url, addressName, nama]);
    res.json({ message: 'Address updated successfully' });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an address for an oleh entry
app.delete('/addresses/:nama/:addressId', async (req, res) => {
  const { nama, addressId } = req.params;
  try {
    const olehExists = await pool.query('SELECT * FROM oleh WHERE nama = $1', [nama]);
    if (olehExists.rows.length === 0) {
      return res.status(404).json({ error: 'Oleh entry not found' });
    }

    await pool.query('DELETE FROM addresses WHERE id = $1 AND oleh_nama = $2', [addressId, nama]);
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Insert data into the 'wisata' table
app.post('/wisata', async (req, res) => {
  const { nama, gambar_url1, gambar_url2, gambar_url3, tiket_masuk, parkir, description, domisili, Alamat_gbr, Alamat_url } = req.body;
  try {
    await pool.query(
      'INSERT INTO wisata (nama, gambar_url1, gambar_url2, gambar_url3, tiket_masuk, parkir, description, domisili, Alamat_gbr, Alamat_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [nama, gambar_url1, gambar_url2, gambar_url3, tiket_masuk, parkir, description, domisili, Alamat_gbr, Alamat_url]
    );
    res.status(201).json({ message: 'Data inserted into Wisata table successfully' });
  } catch (error) {
    console.error('Error inserting data into Wisata table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update data in the 'wisata' table
app.put('/wisata/:nama', async (req, res) => {
  const { nama } = req.params;
  const { gambar_url1, gambar_url2, gambar_url3, tiket_masuk, parkir, description, domisili, Alamat_gbr, Alamat_url } = req.body;
  try {
    const updateQuery = `
      UPDATE wisata
      SET gambar_url1 = $1, gambar_url2 = $2, gambar_url3 = $3, tiket_masuk = $4, parkir = $5, description = $6, domisili = $7, Alamat_gbr = $8, Alamat_url = $9
      WHERE nama = $10
    `;
    await pool.query(updateQuery, [gambar_url1, gambar_url2, gambar_url3, tiket_masuk, parkir, description, domisili, Alamat_gbr, Alamat_url, nama]);
    res.json({ message: 'Data in Wisata table updated successfully' });
  } catch (error) {
    console.error('Error updating data in Wisata table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete data from the 'wisata' table
app.delete('/wisata/:nama', async (req, res) => {
  const { nama } = req.params;
  try {
    // Check if the data exists
    const dataExists = await pool.query('SELECT * FROM wisata WHERE nama = $1', [nama]);
    if (dataExists.rows.length === 0) {
      return res.status(404).json({ error: 'Data not found in Wisata table' });
    }

    // Delete the data
    await pool.query('DELETE FROM wisata WHERE nama = $1', [nama]);
    res.json({ message: 'Data deleted from Wisata table successfully' });
  } catch (error) {
    console.error('Error deleting data from Wisata table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all data from the 'wisata' table
app.get('/wisata', async (req, res) => {
  try {
    const data = await pool.query('SELECT * FROM wisata');
    res.json(data.rows);
  } catch (error) {
    console.error('Error fetching data from Wisata table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get data from the 'wisata' table by name
app.get('/wisata/:nama', async (req, res) => {
  const { nama } = req.params;
  try {
    const data = await pool.query('SELECT * FROM wisata WHERE nama = $1', [nama]);
    if (data.rows.length === 0) {
      return res.status(404).json({ error: 'Data not found in Wisata table' });
    }
    res.json(data.rows[0]);
  } catch (error) {
    console.error('Error fetching data from Wisata table:', error);
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

app.get('/recommendation', async (req, res) => {
  try {
    const hotels = await pool.query('SELECT * FROM recommendationhotel');
    res.json(hotels.rows);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/recommendationwisata', async (req, res) => {
  try {
    const hotels = await pool.query('SELECT * FROM recommendationwisata');
    res.json(hotels.rows);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/youtube', async (req, res) => {
  try {
    const hotels = await pool.query('SELECT * FROM youtube');
    res.json(hotels.rows);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
