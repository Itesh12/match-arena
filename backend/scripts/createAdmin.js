const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const createAdmin = async () => {
  const username = 'admin';
  const password = 'adminpassword123';

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existingAdmin = await User.findOne({ username });
    if (existingAdmin) {
      console.log('Admin user already exists');
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = new User({
        username,
        password: hashedPassword,
        role: 'admin'
      });
      await admin.save();
      console.log(`Admin user created: ${username} / ${password}`);
    }
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    mongoose.connection.close();
  }
};

createAdmin();
