import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://paulonbruno:P0agoCOBlc4eCuIg@cluster0.c4xkskb.mongodb.net/designacoes?retryWrites=true&w=majority&appName=Cluster0';

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db();

const users = await db.collection('users').find({}).toArray();
for (const u of users) {
  console.log(`email: ${u.email}`);
  console.log(`  _id: ${u._id} (type: ${typeof u._id})`);
  console.log(`  id: ${u.id}`);
  console.log(`  isActive: ${u.isActive}`);
  
  // Try to find by _id string
  const foundByString = await db.collection('users').findOne({ _id: u._id.toString() });
  console.log(`  findOne by string: ${foundByString ? 'FOUND' : 'NOT FOUND'}`);
  
  // Try to find by ObjectId
  const foundByObjectId = await db.collection('users').findOne({ _id: new ObjectId(u._id.toString()) });
  console.log(`  findOne by ObjectId: ${foundByObjectId ? 'FOUND' : 'NOT FOUND'}`);
}

await client.close();
