const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.43vj3zh.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const classCollection = client.db("bandZoon").collection("classes")
        const instructorCollection = client.db("bandZoon").collection("Instructor")
        const bookingCollection = client.db("bandZoon").collection("class")
        //  classes data 
        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray()
            res.send(result)
        })
        // 
        app.get('/instructor', async (req, res) => {
            const result = await instructorCollection.find().toArray()
            res.send(result);
        })

        // Selected Class post
        // TO DO Soting
        app.get('/selected', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }
            const query = { email: email }
            const result = await bookingCollection.find(query).toArray();
            res.send(result)

        })
        // TO DO Soting
        app.post('/selected', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingCollection.insertOne(booking);
            res.send(result);

        })
        
// delete Operator. 
app.delete('/selected/:id',async(req,res)=>{
    const id = req.params.id
    const query ={_id:new ObjectId(id) }
    const result = await bookingCollection.deleteOne(query)
    res.send(result)

})


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("running")
})
app.listen(port, () => {
    console.log(`running on port,${port}`);
})