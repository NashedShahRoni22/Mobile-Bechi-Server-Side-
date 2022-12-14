const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken")
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { query } = require("express");
require("dotenv").config();
const port = process.env.PORT || 8000;
const stripe = require("stripe")(process.env.STRIPE_SECRET)

const app = express();

//middleware
app.use(cors());
app.use(express.json());

//stripe payments
app.post("/create-payment-intent", async (req, res) => {
  const  booking = req.body;
  const price = booking.price;
  const amount = price * 100;

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    "payment_method_types": [
      "card"
    ],
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

const verifyJWT =(req, res, next)=>{
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send('unauthorized access');
  }
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
    if(err){
      return res.status(403).send({message: 'forbidden access'})
    }
    req.decoded = decoded;
    next();
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.auieprw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const productsCategorey = client.db("mobileBechi").collection("mobileCategorey");
    const productsCollection = client.db("mobileBechi").collection("mobileProducts");
    const usersCollection = client.db("mobileBechi").collection("mobileBechiUsers");
    const bookingsCollection = client.db("mobileBechi").collection("bookings");
    const paymentsCollection = client.db("mobileBechi").collection("payments");

    //get categorey
    app.get("/categorey", async (req, res) => {
      const query = {};
      const result = await productsCategorey.find(query).toArray();
      res.send(result);
    });
    //get products
    app.get("/categorey/:id", async(req, res)=>{
      const id = req.params.id;
      const query = {categorey_id:id};
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });
    //post product
    app.post("/products", async(req, res)=>{
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    })
    //advertise product
    app.put("/products/:id", async(req, res)=>{
      const id = req.params.id;
      const filter ={_id: ObjectId(id)};
      const option = {upsert: true};
      const updatedDoc = {
        $set:{
          isAdvertise: true
        }
      }
      const result = await productsCollection.updateOne(filter, updatedDoc, option);
      res.send(result);
    })
    //report product
    app.put("/reportedProducts/:id", async(req, res)=>{
      const id = req.params.id;
      const filter ={_id: ObjectId(id)};
      const option = {upsert: true};
      const updatedDoc = {
        $set:{
          isReported: true
        }
      }
      const result = await productsCollection.updateOne(filter, updatedDoc, option);
      res.send(result);
    })
    
    //delete a product
    app.delete("/products/:id", async(req, res)=>{
      const id = req.params.id;
      const query = {_id:ObjectId(id)};
      const result = productsCollection.deleteOne(query);
      res.send(result);
    })
    //get seller specific product
    app.get('/products/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {sellerEmail:email};
      const products = await productsCollection.find(query).toArray();
      res.send(products); 
    })
    //create jwt for user
    app.get('/jwt', async(req, res)=>{
      const email = req.query.email;
      const query = {email : email};
      const user = await usersCollection.findOne(query);
      if(user){
        const token = jwt.sign({email},process.env.ACCESS_TOKEN,{expiresIn:'1d'})
        return res.send({accessToken: token});
      }
      res.status(403).send({accessToken: ''})
    })
    //save user info
    app.post("/user", async(req, res)=>{
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })
    //delete one user
    app.delete('/user/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id:ObjectId(id)};
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })
    //check admin
    app.get("/user/admin/:email", async(req, res)=>{
      const email = req.params.email;
      const query = {email:email}
      const user = await usersCollection.findOne(query);
      res.send({isAdmin: user?.role === 'admin'})
    })
    //check seller
    app.get("/user/seller/:email", async(req, res)=>{
      const email = req.params.email;
      const query = {email:email}
      const user = await usersCollection.findOne(query);
      res.send({isSeller: user?.role === 'Seller'})
    })
    //get all buyers
    app.get("/buyers", async(req, res)=>{
      const query = {role:"Buyer"}
      const result = await usersCollection.find(query).toArray();
      res.send(result); 
    })
    //get all sellers
    app.get("/sellers", async(req, res)=>{
      const query = {role:"Seller"}
      const result = await usersCollection.find(query).toArray();
      res.send(result); 
    })
    //verify buyers
    app.put("/sellers/verify/:id",verifyJWT, async(req, res)=>{
      const decodedEmail = req.decoded.email;
      const query = {email: decodedEmail};
      const user = await usersCollection.findOne(query);
      if(user?.role !== 'admin'){
        return res.status(403).send({message: 'forbidden access'})
      }
      const id = req.params.id;
      const filter = {_id : ObjectId(id)};
      const option = {upsert: true};
      const updatedDoc = {
        $set:{
          isVerify : true
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc, option);
      res.send(result);
    })
    //save user bookings
    app.post('/bookings', async(req, res)=>{
      const bookings = req.body;
      const query = {
        userEmail: bookings.userEmail,
        productId: bookings.productId,
      }

      const alreadyBooked = await bookingsCollection.find(query).toArray();
      if(alreadyBooked.length){
        const message = `You have already booked ${bookings.productName}`
        return res.send({acknowledged: false, message});
      }
      const result = await bookingsCollection.insertOne(bookings);
      res.send(result);
    })
    //get user bookings
    app.get('/bookings', verifyJWT, async(req, res)=>{
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      
      if(email !== decodedEmail){
        return res.status(403).send({message: 'forbidden access'});
      }

      const query = {email: email};
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings); 
    })

    //get specific booking details for payments
    app.get('/bookings/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    })

    //delete a bookings
    app.delete('/bookings/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id:ObjectId(id)};
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    })
    //get product from advertise
    app.get("/products", async(req, res)=>{
      const query = {isAdvertise: true};
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    })
    //get product from advertise
    app.get("/reportedProducts", async(req, res)=>{
      const query = {isReported: true};
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    })
    //store payments
    app.post("/payments", async(req, res)=>{
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = {_id: ObjectId(id)}
      const updatedDoc = {
        $set:{
          paid: true,
          transectionId: payment.transectionId
        }
      }
      const pId = payment.productId;
      const dQ = {_id: ObjectId(pId)};
      const deleteResult = await productsCollection.deleteOne(dQ);
      const updateResult = await bookingsCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })
  } 
  finally {
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Mobile Bechi Server Running");
});

app.listen(port, () => console.log(`Mobile Bechi Server Running on ${port}`));
