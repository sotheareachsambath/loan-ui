import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'admin@loan.com';

    // Check if admin already exists
    const existing = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (existing) {
        console.log(`✅ Admin user already exists: ${adminEmail}`);
        return;
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.create({
        data: {
            email: adminEmail,
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    });

    console.log(`🌱 Seeded admin user:`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: password123`);
    console.log(`   Role: ${admin.role}`);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
