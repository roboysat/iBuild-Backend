import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get cost estimate
router.post('/', authenticateToken, async (req: any, res) => {
  const { area, areaUnit, location, quality, floors } = req.body;

  if (!area || !areaUnit || !location || !quality) {
    return res.status(400).json({ message: 'Area, unit, location, and quality are required' });
  }

  try {
    // Convert area to square feet for calculations
    let areaInSqFt = area;
    if (areaUnit === 'sq_meters') {
      areaInSqFt = area * 10.764;
    } else if (areaUnit === 'sq_yards') {
      areaInSqFt = area * 9;
    }

    // Base cost per sq ft based on quality
    const baseCosts = {
      'economy': 1200,
      'standard': 1800,
      'premium': 2500,
      'luxury': 3500
    };

    const baseCost = baseCosts[quality as keyof typeof baseCosts] || baseCosts.standard;

    // Location multiplier
    const locationMultipliers = {
      'mumbai': 1.4,
      'delhi': 1.3,
      'bangalore': 1.2,
      'hyderabad': 1.1,
      'chennai': 1.1,
      'pune': 1.0,
      'ahmedabad': 0.9,
      'kolkata': 0.9
    };

    const locationMultiplier = locationMultipliers[location.toLowerCase() as keyof typeof locationMultipliers] || 1.0;

    // Floor multiplier
    const floorMultiplier = floors > 1 ? 1 + (floors - 1) * 0.15 : 1;

    // Calculate total cost
    const totalCost = areaInSqFt * baseCost * locationMultiplier * floorMultiplier;

    // Material breakdown
    const breakdown = {
      'cement': Math.ceil(areaInSqFt * 0.4), // bags
      'steel': Math.ceil(areaInSqFt * 3.5), // kg
      'bricks': Math.ceil(areaInSqFt * 8), // pieces
      'sand': Math.ceil(areaInSqFt * 0.5), // cubic meters
      'aggregate': Math.ceil(areaInSqFt * 0.8), // cubic meters
      'labor': Math.ceil(totalCost * 0.25), // 25% of total cost
      'materials': Math.ceil(totalCost * 0.55), // 55% of total cost
      'overhead': Math.ceil(totalCost * 0.20) // 20% of total cost
    };

    res.json({
      totalCost: Math.round(totalCost),
      breakdown,
      details: {
        areaInSqFt: Math.round(areaInSqFt),
        baseCostPerSqFt: baseCost,
        locationMultiplier,
        floorMultiplier,
        quality,
        location,
        floors
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 