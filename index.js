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
      app.get("/category/:name", async (req, res) => {
         const categoryName = req.params.name;
         const query = { category: categoryName };
         const products = await productsCollection.find(query).toArray();
         res.send(products);
      });
      app.get("/featured", async (req, res) => {
         const query = {};
         const filter = { dateInMili: -1 };
         const products = await productsCollection.find(query).sort(filter).limit(10).toArray();
         res.send(products);
      });
      app.get("/category", async (req, res) => {
         const query = {};
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
         const query = { advertise: true };
         const advertisedProduct = await productsCollection.find(query).project({ resale_price: 1, image: 1 }).toArray();
         res.send(advertisedProduct);
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
