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

    app.get("/all-properties", async (req, res) => {
      try {
        const featured = await featuredCollection.find().toArray();
        const newProps = await newProperties.find().toArray();
        const allProps = [...featured, ...newProps];
        res.send(allProps);
      } catch (error) {
        console.error("Error fetching all properties:", error);
        res.status(500).send({ error: "Server error" });
      }
    });

    app.get("/getMyProperty",async(req,res)=>{
      const cursor = newProperties.find();
      const result = await cursor.toArray();
      res.send(result);
    })

   app.delete("/properties/:id", async (req, res) => {
     try {
       const id = req.params.id;
       const query = { _id: new ObjectId(id) };
       const result = await newProperties.deleteOne(query);

       // ✅ return deletedCount so frontend can check easily
       res.send(result);
     } catch (error) {
       console.error("Error deleting property:", error);
       res.status(500).send({ success: false, message: "Server error!" });
     }
   });

   app.get("/properties/:id", async (req, res) => {
     try {
       const { id } = req.params;
       const objectId = ObjectId.isValid(id) ? new ObjectId(id) : id;

       // Try featured first
       let prop =
         (await featuredCollection.findOne({ _id: objectId })) ||
         (await newProperties.findOne({ _id: objectId }));

       if (!prop) {
         return res.status(404).send({ message: "Property not found" });
       }

       res.send(prop);
     } catch (err) {
       console.error("Error fetching property:", err);
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
            try {
              const { userId, propertyId } = req.query;
              const match = {};
              if (userId) match.userId = userId;
              if (propertyId) {
                // normalize to ObjectId if valid
                match.propertyId = ObjectId.isValid(propertyId)
                  ? new ObjectId(propertyId)
                  : propertyId;
              }

              const pipeline = [
                { $match: match },
                // 🔹 lookup from featured properties
                {
                  $lookup: {
                    from: "f_properties",
                    localField: "propertyId",
                    foreignField: "_id",
                    as: "featuredProperty",
                  },
                },
                // 🔹 lookup from user-added properties
                {
                  $lookup: {
                    from: "newProperties",
                    localField: "propertyId",
                    foreignField: "_id",
                    as: "userProperty",
                  },
                },
                // 🔹 merge whichever exists
                {
                  $addFields: {
                    property: {
                      $cond: [
                        { $gt: [{ $size: "$featuredProperty" }, 0] },
                        { $arrayElemAt: ["$featuredProperty", 0] },
                        { $arrayElemAt: ["$userProperty", 0] },
                      ],
                    },
                  },
                },
                { $project: { featuredProperty: 0, userProperty: 0 } },
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
