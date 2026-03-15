const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
require("dotenv").config()

const app = express()

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URL + "/" + process.env.DB_NAME)
.then(() => console.log("MongoDB conectado"))
.catch(err => console.log(err))

app.get("/", (req,res)=>{
    res.send("API CondoClub funcionando")
})

app.get("/api/products",(req,res)=>{
    res.json([
        {id:1,name:"Lavagem Automotiva",price:50},
        {id:2,name:"Cesta Orgânica",price:80},
        {id:3,name:"Manutenção de Ar",price:120}
    ])
})

app.listen(5000, ()=>{
    console.log("Servidor rodando em http://localhost:5000")
})
