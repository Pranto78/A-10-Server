// WG3xA7SBuPZFgeY9-> password;
// Home-Nest-78 -> database name

const express = require("express");
const cors = require("cors");
// require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 4000;

// middleware
app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://Home-Nest-78:WG3xA7SBuPZFgeY9@cluster0.fkvjwgn.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    
    await client.connect();

    const db = client.db("Home_Db");
    const featuredCollection = db.collection("f_properties");


    app.get("/featured-properties", async (req, res) => {
      const cursor = featuredCollection.find().sort({price:1}).limit(8);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/featured-properties", async (req, res) => {
      const newProperty = req.body;
      const result = await featuredCollection.insertOne(newProperty);
      res.send(result);
    });


    
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}






run().catch(console.dir);

app.listen(port, () => {
  console.log(`Smart server is running on port: ${port}`);
});
