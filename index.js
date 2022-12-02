const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

// Middle ware
app.use(
   cors({
      origin: true,
      optionsSuccessStatus: 200,
      credentials: true,
   })
);
app.use(express.json());

app.get("/", (req, res) => {
   res.send("Phone Garage Server is running");
});

app.post("/create-payment-intent", async (req, res) => {
   const booking = req.body;
   const price = booking.price;
   const amount = price * 100;

   const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      payment_method_types: ["card"],
   });
   res.send({
      clientSecret: paymentIntent.client_secret,
   });
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.DB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
   // console.log("token", req.headers.authorization);
   const authHeader = req.headers.authorization;
   if (!authHeader) {
      return res.status(401).send("Unauthorized Access");
   }
   const token = authHeader.split(" ")[1];

   jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
      if (err) {
         return res.status(403).send({ message: "Forbidden Access" });
      }
      req.decoded = decoded;
      next();
   });
}
async function verifyAdmin(req, res, next) {
   const decodedEmail = req.decoded.email;
   const query = { email: decodedEmail };
   const user = await usersCollection.findOne(query);
   if (user?.role !== "Admin") {
      return res.status(403).send({ message: "Forbidden Access" });
   }
   next();
}

async function run() {
   try {
      const productsCollection = client.db("phone-garage").collection("products");
      const usersCollection = client.db("phone-garage").collection("users");
      const ordersCollection = client.db("phone-garage").collection("orders");
      app.get("/jwt", async (req, res) => {
         const email = req.query.email;
         const query = { email: email };
         const user = await usersCollection.findOne(query);
         if (user) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "12h" });
            return res.send({ accessToken: token });
         }
         res.status(403).send({ accessToken: null });
      });
      app.get("/category/:name", async (req, res) => {
         const categoryName = req.params.name;
         const query = { category: categoryName, available: true };
         const products = await productsCollection.find(query).toArray();
         res.send(products);
      });
      app.get("/featured", async (req, res) => {
         const query = { available: true };
         const filter = { dateInMili: -1 };
         const products = await productsCollection.find(query).sort(filter).limit(10).toArray();
         res.send(products);
      });
      app.get("/category", async (req, res) => {
         const query = { available: true };
         const categories = await productsCollection.find(query).project({ category: 1, image: 1 }).toArray();
         const categoryName = [];
         categories.forEach((category) => {
            categoryName.push(category.category);
         });
         const allCategory = categoryName.filter((item, pos, self) => {
            return self.indexOf(item) == pos;
         });
         const finalResult = [];
         allCategory.forEach((singleCategory) =>
            categories.find((category) => {
               if (singleCategory === category.category) {
                  return finalResult.push(category);
               }
            })
         );
         res.send(finalResult);
      });
      app.get("/advertise", async (req, res) => {
         const query = { advertise: true, available: true };
         const advertisedProduct = await productsCollection.find(query).sort({ dateInMili: -1 }).project({ resale_price: 1, image: 1 }).toArray();
         res.send(advertisedProduct);
      });
      app.post("/users", async (req, res) => {
         const user = req.body;
         const query = { email: user.email };
         const matchFind = await usersCollection.findOne(query);
         if (matchFind) {
            return res.send({ message: "Authentication Successful" });
         }
         const result = await usersCollection.insertOne(user);
         res.send(result);
      });
      app.post("/users/orders", async (req, res) => {
         const product = req.body;
         const result = await ordersCollection.insertOne(product);
         res.send(result);
      });
      app.get("/users/admin/:email", async (req, res) => {
         const email = req.params.email;
         const query = { email };
         const user = await usersCollection.findOne(query);
         res.send({ isAdmin: user?.role === "Admin" });
      });
      app.post("/users/seller", async (req, res) => {
         const email = req.body.email;
         const query = { seller_email: email };
         const myProduct = await productsCollection.find(query).toArray();
         // console.log(query);
         res.send(myProduct);
      });
      app.delete("/users/seller/:id", async (req, res) => {
         const id = req.params.id;
         const filter = { _id: ObjectId(id) };
         const deleted = await productsCollection.deleteOne(filter);
         res.send(deleted);
      });
      app.put("/users/seller/ad/:id", async (req, res) => {
         const id = req.params.id;
         const filter = { _id: ObjectId(id) };
         const ad = await productsCollection.findOne(filter);
         const status = ad.advertise;
         const updatedDoc = {
            $set: {
               advertise: !status,
            },
         };
         const updated = await productsCollection.updateOne(filter, updatedDoc);
         res.send(updated);
      });
      app.get("/users/seller/:email", async (req, res) => {
         const email = req.params.email;
         const query = { email };
         const user = await usersCollection.findOne(query);
         res.send({ isSeller: user?.role === "Seller" });
      });
      app.post("/users/seller/addproduct", async (req, res) => {
         const product = req.body;
         const result = await productsCollection.insertOne(product);
         res.send(result);
      });

      /* app.get("/alldelete", async (req, res) => {
         const filter = {};
         const result = await productsCollection.deleteMany(filter);
         res.send(result);
      }); */
   } finally {
   }
}
run().catch((err) => {
   console.log(err);
});

app.listen(port, () => {
   console.log(`server is running on port: ${port}`);
});
