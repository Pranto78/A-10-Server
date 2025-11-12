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
    const reviewsCollection = db.collection("reviews");
    const newProperties = db.collection("newProperties");


    app.get("/featured-properties", async (req, res) => {
      const cursor = featuredCollection.find().sort({price:1});
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/featured-properties", async (req, res) => {
      const newProperty = req.body;
      const result = await featuredCollection.insertOne(newProperty);
      res.send(result);
    });

    app.post("/createProperties",async(req,res)=>{
      const property = req.body;
      const result = await newProperties.insertOne(property);
      res.send(result);
    })

   app.get("/properties/:id", async (req, res) => {
     try {
       const { id } = req.params;
       let prop;

       // Try ObjectId first, then fall back to string ID
       try {
         prop = await featuredCollection.findOne({ _id: new ObjectId(id) });
       } catch {
         prop = await featuredCollection.findOne({ _id: id });
       }

       if (!prop) {
         return res.status(404).send({ message: "Property not found" });
       }

       res.send(prop);
     } catch (err) {
       console.error(err);
       res.status(500).send({ error: "Invalid id or server error" });
     }
   });


      app.get("/reviews", async (req, res) => {
        try {
          const { propertyId, userId } = req.query;
          const filter = {};
          if (propertyId) filter.propertyId = propertyId;
          if (userId) filter.userId = userId;
          const cursor = reviewsCollection.find(filter).sort({ date: -1 });
          const result = await cursor.toArray();
          res.send(result);
        } catch (err) {
          console.error(err);
          res.status(500).send({ error: "Server error" });
        }
      });


       app.post("/reviews", async (req, res) => {
         try {
           const review = req.body;
           review.date = review.date || new Date().toISOString();

           if (!review.propertyId || !review.rating || !review.reviewerName) {
             return res.status(400).send({
               error: "propertyId, rating and reviewerName required",
             });
           }

           // normalize propertyId to ObjectId if valid
           if (ObjectId.isValid(review.propertyId)) {
             review.propertyId = new ObjectId(review.propertyId);
           }

           const result = await reviewsCollection.insertOne(review);
           const inserted = await reviewsCollection.findOne({
             _id: result.insertedId,
           });
           res.send(inserted);
         } catch (err) {
           console.error(err);
           res.status(500).send({ error: "Server error" });
         }
       });

        app.get("/reviews/user/:userId", async (req, res) => {
          try {
            const { userId } = req.params;
            const cursor = reviewsCollection
              .find({ userId })
              .sort({ date: -1 });
            const result = await cursor.toArray();
            res.send(result);
          } catch (err) {
            console.error(err);
            res.status(500).send({ error: "Server error" });
          }
        });


            app.get("/reviews/with-property", async (req, res) => {
              // query can pass ?userId=... or ?propertyId=...
              try {
                const { userId, propertyId } = req.query;
                const match = {};
                if (userId) match.userId = userId;
                if (propertyId) match.propertyId = propertyId;

                const pipeline = [
                  { $match: match },
                  {
                    $lookup: {
                      from: "f_properties",
                      localField: "propertyId",
                      foreignField: "_id",
                      as: "propertyDoc",
                    },
                  },
                  {
                    $addFields: {
                      property: { $arrayElemAt: ["$propertyDoc", 0] },
                    },
                  },
                  { $project: { propertyDoc: 0 } },
                  { $sort: { date: -1 } },
                ];

                const aggCursor = reviewsCollection.aggregate(pipeline);
                const results = await aggCursor.toArray();
                res.send(results);
              } catch (err) {
                console.error(err);
                res.status(500).send({ error: "Server error" });
              }
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
