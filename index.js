const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");

const port = process.env.PORT || 5000

// middleware
app.use(cors());
app.use(express.json());

// firebase admin initialization
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rnw2g.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function veifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      
      try {
        const decodedUser = await admin.auth().verifyIdToken(token);
        req.decodedEmail = decodedUser.email;
      }
      catch(err) {
          console.log(err.message)
      }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('niche_website_clockroach')
        const productsCollection = database.collection('products');
        const usersCollection = database.collection('users');

      
        app.get('/products', async (req, res) => {
            const place = req.query.place;
            console.log(place);
            let cursor;
            if (place == 'homeProducts') {
                cursor = productsCollection.find({}).limit(6)
            }
            else {
                cursor = productsCollection.find({})
            }
            const products = await cursor.toArray();
            res.json(products);
        })
        
        
    //   app.get('/products', veifyToken, async (req, res) => {
    //     const email = req.query.email;
    //     // toLocaleString() to get the time + date
    //     if (req.decodedEmail === email) {
    //       const date = req.query.date;
    //       const query = { email: email, date: date }
    //       const cursor = productsCollection.find(query);
    //       const appointments = await cursor.toArray();
    //       res.json(appointments);
    //     }
        
    //     })    

        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await productsCollection.insertOne(appointment);
            res.json(result)
        })
      
    //   app.get('/users/:email', async (req, res) => {
    //     const email = req.params.email;
    //     const query = { email: email };
    //     const user = await usersCollection.findOne(query);
    //     let isAdmin = false;
    //     if (user?.role === 'admin') {
    //       isAdmin = true;
    //     }
    //     res.json({ admin: isAdmin });
    //   })
      
    // for normal registration
      app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        console.log(result);
        res.json(result);
      })
      
      // upsert (update or insert) for google sign in
      app.put('/users', async (req, res) => {
        const user = req.body;
        // filter and query almost same
        const filter = { email: user.email }
        const options = { upsert: true };
        const updateDoc = { $set: user };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.json(result);
      })
      
      // this will only update a existing array, it can't insert a new one (Make Admin)
    //   app.put('/users/admin', veifyToken, async (req, res) => {
    //     const user = req.body;
    //     const requester = req.decodedEmail;
    //     if (requester) {
    //       const requesterAccount = await usersCollection.findOne({ email: requester });
    //       if (requesterAccount.role === 'admin') {
    //         const filter = { email: user.email };
    //         const updateDoc = { $set: { role: 'admin' } };
    //         const result = await usersCollection.updateOne(filter, updateDoc);
    //         res.json(result);
    //       } 
    //     }
    //     else {
    //       res.status(403).json({message: "You don't have access to the certain part of the website"});
    //     }
    //   })

        }
        catch(error) {
            console.log(error.message)
        }
        finally {
            // await client.close();
        }
}
run().catch(console.dir);

  
app.get('/', (req, res) => {
    res.send('Hello CLOCKROACH!')
  })
  
app.listen(port, () => {
console.log(`listening at http://localhost:${port}`)
})