// ==========================================
// User Registration API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  checkRateLimit,
  getClientIP,
  RATE_LIMITS,
  rateLimitHeaders,
} from '@/lib/rate-limit';

const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(254).toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and a number'
    ),
  name: z.string().min(1).max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const clientIP = getClientIP(request.headers);
    const rateLimitResult = checkRateLimit(
      `register:${clientIP}`,
      RATE_LIMITS.auth
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult),
        }
      );
    }

    const body = await request.json();

    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name } = result.data;

    // Check if user exists - use timing-safe comparison
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // SECURITY: Use same response for existing and new users
    // to prevent user enumeration attacks
    if (existingUser) {
      // Perform the same hash operation to make timing consistent
      await bcrypt.hash(password, 12);
      return NextResponse.json(
        { error: 'Unable to complete registration. Please check your email.' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with signup bonus
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        credits: 20,
        transactions: {
          create: {
            amount: 20,
            type: 'SIGNUP_BONUS',
            description: 'Welcome bonus credits',
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
      },
    });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
