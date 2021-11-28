const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const ObjectId = require('mongodb').ObjectId;
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


async function run() {
    try {
        await client.connect();
        const database = client.db('niche_website_clockroach')
        const productsCollection = database.collection('products');
        const usersCollection = database.collection('users');
        const ordersCollection = database.collection('orders');
        const reviewsCollection = database.collection('reviews');
        const contactUsCollection = database.collection('contactUs');

        // GET all products + Products for home
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

        // Get All Reviews
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({})
            const products = await cursor.toArray();
            res.json(products);
        })

        // GET Single Product
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            // console.log('getting specific service', id)
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.json(product);
        })
        
        
        // return orders of a user based on his/her email
        app.get('/myOrders', async (req, res) => {
            // console.log(req.headers)
            // console.log(req.headers.authorization)
            const email = req.query.email;
            const query = { email: email}
            console.log(req.decodedEmail, email)
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.json(orders);    
        })
        
        // GET all orders
        app.get('/allOrders', async (req, res) => {
            const cursor = ordersCollection.find({});
            const orders = await cursor.toArray();
            res.json(orders);    
        }) 

        // GET pending orders
        app.get('/pendingOrders', async (req, res) => {
            const query = { orderStatus: 'pending'}
            const cursor = ordersCollection.find(query);
            const pendingOrders = await cursor.toArray();
            res.json(pendingOrders);    
        })    
        
        
        // POST Order (Place an order)
        app.post('/placeOrder', async (req, res) => {
            const orderDetails = req.body;
            orderDetails.orderStatus = "pending" 
            // console.log('hit the post api', orderDetails)
            const result = await ordersCollection.insertOne(orderDetails);
            // console.log(result)
            res.json(result)
        })
        
        // contact us form
        app.post('/contactUs', async (req, res) => {
            const contactUs = req.body;
            console.log(contactUs)
            const result = await contactUsCollection.insertOne(contactUs);
            console.log(result)
            res.json(result)
        })
      
        // check if the user is an admin
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
            isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })
      
        
        // POST / add new feedback by customer
        app.post('/giveReview', async (req, res) => {
            const feedback = req.body;
            // console.log('hit the post api', feedback)
            const result = await reviewsCollection.insertOne(feedback);
            // console.log(result);
            res.json(result);
        })
        
        // POST/add Product
        app.post('/addProduct', async (req, res) => {
            const productDetails = req.body;
            // console.log('hit the post api', feedback)
            const result = await productsCollection.insertOne(productDetails);
            // console.log(result);
            res.json(result);
        })
        
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
      
        // UPDATE Order Status
        app.put('/updateStatus/:id', async(req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            console.log(status);
            // in some doc query is written as filter
            const query = { _id: ObjectId(id) };
            // upsert: true means if the updated field doesn't exit it will insert a new one
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    orderStatus: status
                }
            }
            // const update = { orderStatus: status };
            const result = await ordersCollection.updateOne(query, updateDoc, options)
            // console.log('load user with id: ', id);
            res.json(result);
        })
        
        //   this will only update a existing array, it can't insert a new one (Make Admin)
        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            const requester = req.query.email;
            const requesterAccount = await usersCollection.findOne({ email: requester });
            console.log(requesterAccount)
            if (requesterAccount.role === 'admin') {
                const filter = { email: user.email };
                const updateDoc = { $set: { role: 'admin' } };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.json(result);
            }
            else {
            res.status(403).json({message: "You don't have access to the certain part of the website"});
            }
        })
        
        // DELETE API from MyOrders
        app.delete('/placeOrder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.json(result);
        })

        // DELETE API from Products
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.json(result);
        })

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
