
const express = require('express');
const cors = require("cors");
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

require("dotenv").config();
app.use(cors({
  origin: [
    'http://localhost:5173',"https://diagno-auth.web.app", "https://5173-idx-b9a12-client-side-mdparvajmosharof-1723160812873.cluster-3g4scxt2njdd6uovkqyfcabgo6.cloudworkstations.dev/" //todo
  ],
  credentials: true
}));
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.PASS_DB}@cluster0.8srq6fs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    // await client.connect();

    const testsCollection = client.db("testsdb").collection("tests");
    const usersCollection = client.db("testsdb").collection("users");
    const bannerCollection = client.db("testsdb").collection("banner");
    const bookedCollection = client.db("testsdb").collection("booked");
    
    //jwt 
    app.post("/jwt", async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      res.send({token})
    })

    //midleware
    const verifyToken = (req, res, next)=>{
      if(!req.headers.authorization){
        return res.status(401).send({message  : "unauthorized access"});
       }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
          return res.status(401).send({message  : "unauthorized access"});
        }
        req.decoded = decoded;
        next()
      })
    }

    // Get all tests
    app.get('/tests', async(req, res) => {
      const currentDate = new Date().toISOString().split('T')[0];
      const result = await testsCollection.find({date : {$gte:currentDate}}).toArray();
      res.send(result);
    });

    app.get("/test/:id", async(req, res)=>{
      const result = await testsCollection.findOne({_id : new ObjectId(req.params.id)});
      res.send(result);
    })

    app.patch("/test/:id", async(req, res) =>{
      const id = req.params;
      const {slots} = req.body;
      const result = await testsCollection.updateOne({_id: new ObjectId(id)}, {
        $set: {
          slots : slots
        }
      })
      res.send(result)
    })

    app.get("/testsDate", async (req, res) =>{
      const {date} = req.query;
      const result = await testsCollection.find({date : {$regex : `^${date}`}}).toArray();
      res.send(result);
    })

    //post user

    app.post("/users", async(req, res)=>{
      const users = req.body;
      const query = {email: users.email}
      const existingEmail = await usersCollection.findOne(query);
      if(existingEmail){
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(users);
      res.send(result);
    })

    app.get("/users/:email", async(req, res)=> {
      const result = await usersCollection.findOne({email : req.params.email})
      res.send(result)
    })

    //get user

    app.get("/users",verifyToken , async(req, res)=> {
      const users = req.body
      const result = await usersCollection.find(users).toArray()
      res.send(result)
    })

    app.patch("/update/profile/:email",async(req,res) =>{
      const body = req.body;
      
      const email = {email : req.params.email};
      const data = {
        $set: {
          name: body.name, 
          photo_url: body.photo_url, 
          blood: body.blood, 
          districtName: body.districtName, 
          upazila: body.upazila}
      }
      const result = await usersCollection.updateOne(email, data);
      res.send(result)
    })

    app.patch("/users/active/:id", async(req, res)=>{
      const id = {_id : new ObjectId(req.params.id)};
      const data = {
        $set:{
          isActive : "Active"
        }
      }
      const result = await usersCollection.updateOne(id, data);
      res.send(result);
    })

    app.patch("/users/blocked/:id", async(req, res)=>{
      const id = {_id : new ObjectId(req.params.id)};
      const data = {
        $set:{
          isActive : "blocked"
        }
      }
      const result = await usersCollection.updateOne(id, data);
      res.send(result);
    })

    // Add a new test
    app.post("/tests", async (req, res) => {
      const tests = req.body;
      const result = await testsCollection.insertOne(tests);
      res.send(result);
    });

    //get banner data
    app.get("/banner", async(req, res)=>{
      const banner = req.body;
      const result = await bannerCollection.find(banner).toArray();
      res.send(result);
    })

    app.post("/booked", async(req,res)=>{
      const body = req.body;
      const result = await bookedCollection.insertOne(body);
      res.send(result);
    })

    app.get("/booked", async(req, res)=>{
      const query = req.query;
      const result = await bookedCollection.find(query).toArray();
      res.send(result);
    })

    app.delete("/booked/:id", async(req, res)=>{
      const id = req.params;
      const result = await bookedCollection.deleteOne({ _id : new ObjectId(id)});
      res.send(result);
    })
   
    
    


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("This is server site");
});

app.listen(port, (req, res) => {
  console.log(`The Port : ${port}`);
});
