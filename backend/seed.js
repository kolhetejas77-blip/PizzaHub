const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI;

const pizzas = [
  {
    name: "Margherita",
    description: "Classic pizza with tomato sauce, mozzarella and fresh basil.",
    price: 299,
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Farmhouse",
    description:
      "Loaded with onion, capsicum, tomato, mushroom and mozzarella cheese.",
    price: 399,
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Pepperoni",
    description:
      "Classic pepperoni pizza with tomato sauce and lots of mozzarella.",
    price: 449,
    image:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Veggie Supreme",
    description:
      "A delicious combination of fresh vegetables, tomato sauce and cheese.",
    price: 429,
    image:
      "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Cheese Burst",
    description:
      "Extra cheesy pizza with a delicious cheese-filled crust.",
    price: 499,
    image:
      "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "BBQ Chicken",
    description:
      "Tender chicken, BBQ sauce, onion and mozzarella cheese.",
    price: 549,
    image:
      "https://images.unsplash.com/photo-1566843972142-a7fcb70de55a?auto=format&fit=crop&w=800&q=80",
  },
];

async function seedDatabase() {
  if (!uri) {
    console.error("❌ MONGODB_URI is missing from .env");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();

    console.log("✅ Connected to MongoDB");

    const db = client.db("pizza_delivery");
    const pizzasCollection = db.collection("pizzas");

    // Remove existing pizza documents
    await pizzasCollection.deleteMany({});

    // Insert new pizzas
    const result = await pizzasCollection.insertMany(pizzas);

    console.log(`🍕 ${result.insertedCount} pizzas added successfully!`);
  } catch (error) {
    console.error("❌ Database seeding failed:");
    console.error(error.message);
  } finally {
    await client.close();
    console.log("🔌 MongoDB connection closed");
  }
}

seedDatabase();
