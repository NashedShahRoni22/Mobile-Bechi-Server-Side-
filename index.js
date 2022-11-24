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
    const productsCollection = client.db("mobileBechi").collection("mobileProducts");
    const productsCategorey = client.db("mobileBechi").collection("mobileCategorey");
    const usersCollection = client.db("mobileBechi").collection("mobileBechiUsers");

    app.get("/categorey", async (req, res) => {
      const query = {};
      const result = await productsCategorey.find(query).toArray();
      res.send(result);
    });

    app.get("/products", async(req, res)=>{
      const query = {};
      const result = await productsCollection.find(query).toArray();
      res.send(result);
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

  } finally {
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Mobile Bechi Server Running");
});

app.listen(port, () => console.log(`Mobile Bechi Server Running on ${port}`));
