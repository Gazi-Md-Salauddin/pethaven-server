const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();

const uri = process.env.MONGODB_URI;

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
    }
});

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);
console.log(JWKS)

const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization;
    console.log(authHeader)
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorised" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorised" });
    }
    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload;
        
        next();
    } catch (error) {
        return res.status(403).json({ message: "Forbidden" });
    }
   
    
};

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        //await client.connect();
        const db = client.db("pethaven");
        const petCollection = db.collection("pets");
        const requestCollection = db.collection("requests");

        app.get("/pet", async (req, res) => {
          const search = req.query.search || "";
          
          const query = {}
    if(search) {
        query.petName = {
          $regex: search,
          $options: "i",
        };
      }
    console.log(query)
            const result = await petCollection.find(query).toArray();
            res.json(result);
        });
        
        app.get("/my-pets", verifyToken, async (req, res) => {
         const email = req.user.email;

          const result = await petCollection
           .find({ email })
            .toArray();

           res.json(result);
        });
        
        app.post("/pet", verifyToken, async (req, res) => {
            const petData = req.body;
            petData.email = req.user.email;
            const result = await petCollection.insertOne(petData);
            res.json(result);
        });

        app.get("/pet/:id", verifyToken, async (req, res) => {
            const { id } = req.params;
            const result = await petCollection.findOne({
                _id: new ObjectId(id)
            });
            res.json(result);
        });

        app.patch("/pet/:id", async (req, res) => {
            const { id } = req.params;
            const updateData = req.body;
            const result = await petCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );
            res.json(result);
        });

        app.delete("/pet/:id", verifyToken, async (req, res) => {
            const { id } = req.params;
            const result = await petCollection.deleteOne({
                _id: new ObjectId(id)
            });
            res.json(result);
        });

        app.get("/request/:userId", verifyToken, async (req, res) => {
            const { userId } = req.params;
            const result = await requestCollection
                .find({ userId: userId })
                .toArray();
            console.log(userId);
            res.json(result);
        });

        app.post("/request", async (req, res) => {
            const requestData = req.body;
            const result = await requestCollection.insertOne(requestData);
            res.json(result);
        });

        app.delete("/request/:userId", async (req, res) => {
            const { userId } = req.params;
            const result = await requestCollection.deleteOne({
                _id: new ObjectId(userId)
            });
            res.json(result);
        });
        app.patch("/request/:id", async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;

            const result = await requestCollection.updateOne(
                { petId: id },

                { $set: { status: status } }
            );

            res.json(result);
        });

        // Send a ping to confirm a successful connection
       // await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB"
        );
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Server is running good");
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
