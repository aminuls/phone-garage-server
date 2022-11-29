const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// Middle ware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
   res.send("Phone Garage Server is running");
});

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.DB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
   try {
      const productsCollection = client.db("phone-garage").collection("products");
      /* app.get("/test", async (req, res) => {
         const query = {};
         const result = await tempCollection.find(query).toArray();
         res.send(result);
      });
      app.get("/delete", async (req, res) => {
         const query = {};
         const result = await tempCollection.deleteMany(query);
         res.send(result);
      }); */
      app.get("/category/:name", async (req, res) => {
         const categoryName = req.params.name;
         const query = { category: categoryName };
         const products = await productsCollection.find(query).toArray();
         res.send(products);
      });
   } finally {
   }
}
run().catch((err) => {
   console.log(err);
});

app.listen(port, () => {
   console.log(`server is running on port: ${port}`);
});
