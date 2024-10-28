import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import connectDB from './configs/mongodb.js'


// App configuration
const PORT = process.env.PORT || 4000
const app = express()

// MongoDB configuration
await connectDB()

// Initialize Middleware
app.use(express.json())
app.use(cors())

 // API routes
app.get('/',(req,res)=> res.send("API Working"))

app.listen(PORT, ()=> console.log("Server Running on port " + PORT ))
