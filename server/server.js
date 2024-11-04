import express from "express";
import session from "express-session";
import { port, supabaseUrl, supabaseKey, clientUrl, sessionSecret } from "./config.js";
import { createClient } from "@supabase/supabase-js";
import cors from 'cors';
import bodyParser from 'body-parser';
import { searchengine } from "./controller/searchcontroller.js";
import { getlistoffilmobjects } from "./controller/pageresultscontroller.js";

export const app = express();

const corsOptions = {
    origin: 'https://filmsearch-kappa.vercel.app/' || 'http://localhost:3000/',
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

//an endpoint to catch the query from the client side and give the list of films back, handled appropriately for multiple sessions
app.post('/api/userquery', async (req, res) => {
    req.setTimeout(300000); // 5 minutes
    try {
        let filmList;
        let noofpages;

        // Perform the initial search
        const { query } = req.body;
        console.log(`User query: ${query}`);
        const searchResult = await searchengine(query);
        req.session.film_list = searchResult;
        const filmobjects = searchResult.filmobject
        filmList = await getlistoffilmobjects(searchResult.filmobject, 1); // Get film objects for the first page
        noofpages = searchResult.noofpages;

        // Send both film list and the number of pages to the frontend
        res.json({ filmList, noofpages,  filmobjects});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred while processing your request." });
    }
});

//an endpoint which will take the page number and the filmobjectidlist and return a list of filmobjects for that page
app.post('/api/pagequery', async (req, res) => {
    req.setTimeout(300000); // 5 minutes
    try {
        let filmList;

        // Retrieve film objects for the requested page number
        const pageNumber = req.body.pageNumber
        const filmobjectlist = req.body.filmobjectlist
        filmList = await getlistoffilmobjects(filmobjectlist, pageNumber);
        // Send both film list and the number of pages to the frontend
        res.json({ filmList });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred while processing your request." });
    }
});



export default app;
