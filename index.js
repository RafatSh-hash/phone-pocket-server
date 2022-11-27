const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 1000;
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { ObjectID, ObjectId } = require("bson");
const { query } = require("express");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5crvfi4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const usersCollection = client.db("phonepocket").collection("users");
    const productsCollection = client.db("phonepocket").collection("products");
    const bookingsCollection = client.db("phonepocket").collection("bookings");
    const wishCollection = client.db("phonepocket").collection("wishlist");
    const advertiseCollection = client
      .db("phonepocket")
      .collection("advertises");

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "7D",
        });
        return res.send({ accessToken: token });
      }
      console.log(user);
      res.status(403).send({ accessToken: "" });
    });

    const verifyJWT = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send("Unauthorized Access");
      }
      const token = authHeader.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
          return res.status(403).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.body.sellerEmail;
      console.log(decodedEmail);
      const query = { email: decodedEmail };
      console.log(query);
      const user = await usersCollection.findOne(query);
      console.log(user);
      if (user?.role !== "seller") {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    //01.Save Users Via Role
    app.put("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };

      const user = await usersCollection.findOne(query);

      res.send({ isAdmin: user?.role === "admin" });
    });

    app.get("/dbuser", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const dbuser = await usersCollection.findOne(query);
      console.log(dbuser);
      res.send(dbuser);
    });

    //02.Get Google Phones
    app.get("/google", async (req, res) => {
      const query = {};
      const allPhones = await productsCollection.find(query).toArray();
      const googlePhones = allPhones.filter(
        (googlePhones) => googlePhones.CatId === 1
      );

      res.send(googlePhones);
    });

    //Get Limited Samsung Phone
    app.get("/samsung", async (req, res) => {
      const query = {};
      const allPhones = await productsCollection.find(query).toArray();
      const samsungPhones = allPhones.filter(
        (googlePhones) => googlePhones.CatId === 2
      );

      res.send(samsungPhones);
    });
    //Get Iphones
    app.get("/iphone", async (req, res) => {
      const query = {};
      const allPhones = await productsCollection.find(query).toArray();
      const iPhones = allPhones.filter((iPhones) => iPhones.CatId === 3);

      res.send(iPhones);
    });

    app.get("/allproducts", async (req, res) => {
      const query = {};
      const allPhones = await productsCollection.find(query).toArray();

      res.send(allPhones);
    });

    app.get("/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = {};
      const allproduct = await productsCollection.find(query).toArray();
      const result = await allproduct.filter((product) => product.CatId == id);
      res.send(result);
    });

    app.post("/bookings", (req, res) => {
      const booking = req.body;
      const result = bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.put("/wishlist", verifyJWT, async (req, res) => {
      const product = req.body;
      const result = await wishCollection.insertOne(product);
      res.send(result);
    });

    app.get("/mywishes", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const wishes = await wishCollection.find(query).toArray();
      console.log(wishes);
      res.send(wishes);
    });

    app.get("/myorders", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const orders = await bookingsCollection.find(query).toArray();
      res.send(orders);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/products", verifySeller, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    app.get("/myproducts", async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail: email };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    app.post("/advertise", async (req, res) => {
      const product = req.body;
      const result = await advertiseCollection.insertOne(product);
      res.send(result);
    });

    app.get("/advertisedproducts", async (req, res) => {
      const query = {};
      const products = await advertiseCollection.find(query).toArray();
      res.send(products);
    });

    app.get("/users", async (req, res) => {
      const query = { role: "user" };
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });
    app.get("/sellers", async (req, res) => {
      const query = { role: "seller" };
      const sellers = await usersCollection.find(query).toArray();
      res.send(sellers);
    });

    app.delete("/sellers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/sellers/verify/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          status: "verified",
        },
      };
      const result = usersCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    });
  } finally {
  }
}
run().catch((error) => {
  console.log(error);
});

app.get("/", (req, res) => {
  res.send("Server in running successfully");
});

app.listen(port, () => {
  console.log(`Listening To port ${port}`);
});
