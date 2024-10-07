import express from "express";
import session from "express-session";
import { port, supabaseUrl, supabaseKey, clientUrl, sessionSecret } from "./config.js";
import { createClient } from "@supabase/supabase-js";
import { writeFilmsToDatabase } from "./controller/filmscontroller.js";
import { writeFilmDetailsToDatabase } from "./controller/filminfocontroller.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { processquery } from "./controller/queryprocessorcontrollertamiltest.js";
import cors from 'cors';
import bodyParser from 'body-parser';

export const app = express();

const corsOptions = {
    origin: clientUrl || 'http://localhost:3000/',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));  // Correct way to use CORS with options

// Ensure OPTIONS preflight requests are handled correctly
app.options('*', cors(corsOptions));  // This line ensures CORS headers are sent in response to preflight requests

app.use(express.json())

//handling multiple sessions
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: '__Host-sid', // Use __Host- prefix for added security
    cookie: {
    //   secure: process.env.NODE_ENV === 'production', // True in production, false in development
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      path: '/'
    }
  }));

// Parse JSON bodies
app.use(bodyParser.json());
// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

//initializing the supabase client, through which we can interact with all of it's functionalities
export const supabase = createClient(supabaseUrl, supabaseKey);

app.get("/", (req, res) => {
    res.send("The backend of my film search engine is running!")
})

app.listen(port, () => {
    console.log(`We are live on port: ${port}`)
})

//loading the jsonl file which contains the film data in the format we want to store it in the database
const loadFilms = async (filePath) => {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const filmData = [];
    for await (const line of rl) {
        filmData.push(JSON.parse(line));
    }

    return filmData;
}

//creating a frameworks dictionary
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frameworksDir = path.join(__dirname, '../frameworks');
const frameworks = {};

fs.readdirSync(frameworksDir).forEach(file => {
  if (path.extname(file) === '.json') {
    const frameworkName = path.parse(file).name;
    frameworks[frameworkName] = JSON.parse(fs.readFileSync(path.join(frameworksDir, file), 'utf8'));
  }
});

export const frameworks_dict = frameworks;

export const frameworks_list = Object.keys(frameworks_dict);

// export const filmData = await loadFilms('../filmdata/tamilfilms.jsonl');

// //looping through all the films in the array and writing them to the database
// for (let i=0; i<filmData.length; i++) {
//     await writeFilmsToDatabase(filmData[i]);
//     await writeFilmDetailsToDatabase(filmData[i]);
// }

// const test = await processquery('films that talk about tamil nadu politics');

// export const filmsearch_list = test

//an endpoint to catch the query from the client side and give the list of films back, handled appropriately for multiple sessions
app.post('/api/userquery', async (req, res) => {
    req.setTimeout(300000); // 5 minutes
    try{
        //get the user query
        req.session.query = req.body;
        const {query} = req.session.query
        console.log(query)
        //now process the query and get the list of films
        req.session.film_list = await processquery(query);
        //now send the film list back to the user
        res.send(req.session.film_list);
    } catch(err) {
        console.error(err);
        res.status(500).json({error:"an error occured while processing your request."});
    }   
});

export default app;


