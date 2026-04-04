import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://paulonbruno:P0agoCOBlc4eCuIg@cluster0.c4xkskb.mongodb.net/designacoes?retryWrites=true&w=majority&appName=Cluster0';

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db();

// Fix users where isActive is not true (undefined, false, null)
const result = await db.collection('users').updateMany(
  { isActive: { $ne: true } },
  { $set: { isActive: true, failedLoginAttempts: 0, lockedUntil: null } }
);
console.log(`Fixed ${result.modifiedCount} users`);

// Verify
const users = await db.collection('users').find({}).toArray();
console.log('\nAfter fix:');
for (const u of users) {
  console.log(`  - ${u.email} | active: ${u.isActive} | role: ${u.role}`);
}

await client.close();
