const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')('sk_test_51NEuTtELahOmIjhrqAKSqrXEnJ8UWKZ5i4nW3jG4Ac9a7HVSLyfuxKge5wuEdwKeXMqzaUrCl5VJvASsAwl8YEFH00YNfpYJLR')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())


const verifyJWT = (req, res, next) => {

    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded
        next()
    })
}



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
        const paymentCollection = client.db("bandZoon").collection("payments")
        const instructorCollection = client.db("bandZoon").collection("Instructor")
        const bookingCollection = client.db("bandZoon").collection("class")
        const studentsCollection = client.db("bandZoon").collection("students")
        const newClassCollection = client.db("bandZoon").collection("newClass")


        // JWT
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '90h'
            })
            res.send({ token })
        })

        // students api
        //  admin
        app.get('/students/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                console.log(email);
                res.send({ admin: false })
            }

            const query = { email: email }
            const student = await studentsCollection.findOne(query);
            const result = { admin: student?.role === 'admin' }
            res.send(result);
        })

        // isInstructor

        app.get('/students/isInstructor/:email',verifyJWT, async (req, res) => {
            const email = req.params.email;
            if(req.decoded.email !==email){
                res.send({isInstructor:false})
            }

            const query = { email: email }
            const user = await studentsCollection.findOne(query)
            const result = { isInstructor: user?.role === 'isInstructor' }
            res.send(result);
        })
     

        app.patch('/students/isInstructor/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'isInstructor'
                }
            };
            const result = await studentsCollection.updateOne(filter, updateDoc);
            res.send(result);

        })


        // create payment 
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // payment api
        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);
            console.log(payment);
            const query = { _id: { $in: payment.selectedItems.map(id => new ObjectId(id)) } }

            const deleteResult = await bookingCollection.deleteMany(query)
            res.send({ insertResult, deleteResult })
        })



        app.patch('/students/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await studentsCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.get('/students', async (req, res) => {
            const result = await studentsCollection.find().toArray();
            res.send(result);
        })
        app.post('/students', async (req, res) => {
            const students = req.body;
            const query = { email: students.email }
            const existingStudent = await studentsCollection.findOne(query)
            if (existingStudent) {
                return res.send({ message: 'user already exists' })
            }
            const result = await studentsCollection.insertOne(students);
            res.send(result);

        })

        //  classes data 
        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray()
            res.send(result)
        })
        // instructor relates Operation
        app.get('/instructor', async (req, res) => {
            const result = await instructorCollection.find().toArray()
            res.send(result);
        })

        // Selected Class post
        // TO DO Soting
        app.get('/selected', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {

                res.send([])
            }
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                console.log(email, decodedEmail);
                return res.status(401).send({ error: true, message: ' forbidden. access' })
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
        // Add class
        app.get('/addClass', async (req, res) => {
            const cursor = newClassCollection.find()
            const result = await cursor.toArray()
            res.send(result)

        })
        app.post('/addClass', async (req, res) => {
            const newClass = req.body;
            console.log(newClass);
            const result = await newClassCollection.insertOne(newClass);
            res.send(result);

        })


        // delete Operator. 
        app.delete('/selected/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
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