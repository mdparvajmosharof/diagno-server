
const express = require('express');
const cors = require("cors");
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51Px96vHMOBiiyLUHHi7RWoEDKomyxmKH8skYXBJ4JtDDN4xQ1EgUiz2vOxczm78WaxXeQS0aARNcZILPlu4LI8rx00cWHBH8dU');
// const stripe = Stripe(process.env.STRIPE_SK);
const port = process.env.PORT || 5000;
const app = express();

require("dotenv").config();
app.use(cors({
  origin: [
    'http://localhost:5173', "https://diagno-auth.web.app" //todo
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
    const recommendationCollection = client.db("testsdb").collection("recommendation");

    //jwt 
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token })
    })

    //midleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next()
      })
    }

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin })
    })

    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const data = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, data);
      res.send(result);
    })

    // Get all tests
    app.get('/tests', async (req, res) => {
      const currentDate = new Date().toISOString().split('T')[0];
      const result = await testsCollection.find({ date: { $gte: currentDate } }).toArray();
      res.send(result);
    });

    app.get("/test/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await testsCollection.findOne(query);
      res.send(result);
    })

    app.patch("/test/:id", async (req, res) => {
      const id = req.params.id;
      const { slots } = req.body;
      const result = await testsCollection.updateOne({ _id: new ObjectId(id) }, {
        $set: {
          slots: slots
        }
      })
      res.send(result)
    })

    app.patch("/test/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const data = req.body;
      const result = await testsCollection.updateOne(query, {
        $set: {
          image: data.image,
          date: data.date,
          slots: date.slots,
          title: data.title,
          short_description: data.short_description,
          price: data.price
        }
      })
      res.send(result);
    })

    app.get("/testsDate", async (req, res) => {
      const { date, minPrice, maxPrice, name } = req.query;

      // console.log(req.query);

      const searchCriteria = {};
      
      if(date){
        searchCriteria.date = {$regex : `^${date}`}
      }

      if(minPrice && maxPrice){
        searchCriteria.price = {
          $gte : parseFloat(minPrice),
          $lte : parseFloat(maxPrice)
        }
      }

      if(name)[
        searchCriteria.title = {$regex : name, $options : 'i'} 
      ]

      // console.log(searchCriteria)

      const result = await testsCollection.find(searchCriteria).toArray();

      res.send(result);
    })

    //post user

    app.post("/users", async (req, res) => {
      const users = req.body;
      const query = { email: users.email }
      const existingEmail = await usersCollection.findOne(query);
      if (existingEmail) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(users);
      res.send(result);
    })

    app.get("/users/:email", verifyToken, async (req, res) => {
      const result = await usersCollection.findOne({ email: req.params.email })
      res.send(result)
    })

    //get user

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const users = req.body
      const result = await usersCollection.find(users).toArray()
      res.send(result)
    })

    app.patch("/update/profile/:email", async (req, res) => {
      const body = req.body;

      const email = { email: req.params.email };
      const data = {
        $set: {
          name: body.name,
          photo_url: body.photo_url,
          blood: body.blood,
          districtName: body.districtName,
          upazila: body.upazila
        }
      }
      const result = await usersCollection.updateOne(email, data);
      res.send(result)
    })

    app.patch("/users/active/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = { _id: new ObjectId(req.params.id) };
      const data = {
        $set: {
          isActive: "Active"
        }
      }
      const result = await usersCollection.updateOne(id, data);
      res.send(result);
    })

    app.patch("/users/blocked/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = { _id: new ObjectId(req.params.id) };
      const data = {
        $set: {
          isActive: "blocked"
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

    app.delete('/test/:id', async (req, res) => {
      const id = req.params.id;
      const result = await testsCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(result)
    })



    //get banner data

    app.post("/banner", async (req, res) => {
      const banner = req.body;
      const result = await bannerCollection.insertOne(banner);
      res.send(result);
    })

    app.get("/banner", async (req, res) => {
      const banner = req.body;
      const result = await bannerCollection.find(banner).toArray();
      res.send(result);
    })

    app.patch("/banner/active/:id", async (req, res) => {
      const id = req.params.id;

      try {

        await bannerCollection.updateMany({}, {
          $set: {
            isActive: false
          }
        });

        const result = await bannerCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              isActive: true
            }
          }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update banner status", error });
      }
    });


    app.post("/booked", async (req, res) => {
      const body = req.body;
      const result = await bookedCollection.insertOne(body);
      res.send(result);
    })

    app.get("/booked", async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await bookedCollection.find(query).toArray();
      res.send(result);
    })

    app.get("/booked/test", async (req, res) => {
      const query = req.body
      const result = await bookedCollection.find(query).toArray();
      res.send(result);
    })

    app.get("/booked/delevered", async (req, res) => {
      const query = { report: "delivered" };
      const result = await bookedCollection.find(query).toArray();
      res.send(result);
    })

    app.get("/booked/:id", async (req, res) => {
      const id = req.params.id;
      const query = { testId: id }
      const result = await bookedCollection.find(query).toArray();
      res.send(result);
    })

    app.get("/booked/test/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookedCollection.findOne(query);
      res.send(result)
    })

    app.delete("/booked/:id", async (req, res) => {
      const id = req.params;
      const result = await bookedCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    })

    app.patch("/booked/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookedCollection.updateOne({ _id: new ObjectId(id) }, {
        $set: {
          report: "delivered",
          published: new Date().toLocaleDateString(),
          result: "All Good"
        }
      })
      res.send(result)
    })

    app.get("/featured", async (req, res) => {
      const featuredTest = await bookedCollection.aggregate([
        {
          $group: {
            _id: { $toObjectId: "$testId" },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 9 },
        {
          $lookup: {
            from: 'tests',
            localField: '_id',
            foreignField: '_id',
            as: 'testDetails'
          }
        },
        { $unwind: "$testDetails" }
      ]).toArray();

      res.send(featuredTest)

    })


    app.get("/recommendation", async (req, res) => {
      const result = await recommendationCollection.find().toArray();
      res.send(result)
    })

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100)
      console.log(amount)

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: [
          "card",
          "link"
        ],
      });
      res.send({
        clientSecret: paymentIntent.client_secret
        // // [DEV]: For demo purposes only, you should avoid exposing the PaymentIntent ID in the client-side code.
        // dpmCheckerLink: `https://dashboard.stripe.com/settings/payment_methods/review?transaction_id=${paymentIntent.id}`,
      });
    });


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
