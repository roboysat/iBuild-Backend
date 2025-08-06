import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

// Register endpoint
router.post('/register', async (req, res) => {
  const { fullName, email, password, primaryRole } = req.body;
  if (!fullName || !email || !password || !primaryRole) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { fullName, email, passwordHash, primaryRole },
    });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'changeme');
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(500).json({ message: 'Server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'changeme');
    res.json({ user, token });
  } catch (err) {
    console.error(err); // Log the error for debugging
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 