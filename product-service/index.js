const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 7071;
const mongoose = require("mongoose");
const Product = require("./Product");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const isAuthenticated = require("../isAuthenticated");
var order;

var channel, connection;

app.use(express.json());

mongoose.connect(
    "mongodb://0.0.0.0/product-service",
    {
    useNewUrlParser: true, 
    useUnifiedTopology: true 
    })
    .then(() => 
    console.log('PRODUCT-SERVICE DB CONNECTED'))
    .catch((err) => { 
        console.error(err); 
    });

    async function connect() {
        const amqpServer = "amqp://localhost";
        connection = await amqp.connect(amqpServer);
        channel = await connection.createChannel();
        await channel.assertQueue("PRODUCT");
    }
    connect();

app.post("/product/create", isAuthenticated, async (req, res) => {
    const { name, description, price } = req.body;
    const newProduct = new Product({
        name,
        description,
        price,
    });
    newProduct.save();
    return res.json(newProduct);
});

app.post("/product/buy", isAuthenticated, async (req, res) => {

    const { ids } = req.body;
    const products = await Product.find({ _id: { $in: ids } });
    
    channel.sendToQueue(
        "ORDER",
        Buffer.from(
            JSON.stringify({
                products,
                userEmail: req.user.email,
            })
        )
    );
    channel.consume("PRODUCT", (data) => {
        order = JSON.parse(data.content);
    });
    return res.json(order);
});



app.listen(PORT, () => {
    console.log(`Product-Service at ${PORT}`);
});
