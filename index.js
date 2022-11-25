const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken")
const { MongoClient, ServerApiVersion } = require("mongodb");
const { query } = require("express");
require("dotenv").config();
const port = process.env.PORT || 8000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());

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

    //save user data and generate jwt 
    app.put("/users/:email", async(req, res)=>{
      const email = req.params.email;
      const user = req.body;
      const filter = {email: email};
      const options = {upsert: true};
      const updatedoc ={
        $set: user,
      }
      const result = await usersCollection.updateOne(filter, updatedoc, options);

      const token = jwt.sign(user, process.env.ACCESS_TOKEN,{
        expiresIn:'1d',
      })
      res.send({result,token});
    })
    //save bookings
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
    //get bookings
    app.get('/bookings', async(req, res)=>{
      const email = req.query.email;
      const query = {email: email};
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings); 
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
