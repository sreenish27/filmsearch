import { supabase } from "../server.js";
import axios from "axios";
import { frameworks_dict } from "../server.js";
import { jsonrepair } from 'jsonrepair';
import { queryprocessapiEndpoint, structureQueryEndpoint, concreteinfoEndpoint, unstructuredinfoEndpoint, encodeEndpoint } from "../config.js";
import pkg from 'body-parser';

const { json } = pkg;

// Film categories configuration
const film_categories = {
    "story": {
        "plot": "Plot",
        "synopsis": "General",
        "premise": "General",
        "summary": "General",
        "storyline": "General",
        "themes": "Themes",
        "adaptation": "General",
        "screenplay": "General"
    },
    "production": {
        "production": "Production",
        "development": "General",
        "filming": "General",
        "casting": "General",
        "crew": "General",
        "background": "General"
    },
    "cast": {
        "cast": "Cast"
    },
    "audio": {
        "soundtrack": "Soundtrack",
        "music": "Soundtrack",
        "songs": "Songs",
        "tracklist": "General"
    },
    "release": {
        "release": "Release",
        "distribution": "General",
        "premiere": "General",
        "rerelease": "General",
        "availability": "General",
        "certification": "General"
    },
    "marketing": {
        "marketing": "Marketing",
        "promotion": "General",
        "trailer": "General",
        "publicity": "General"
    },
    "reception": {
        "reception": "Reception",
        "reviews": "General",
        "awards": "Awards",
        "nominations": "General",
        "boxoffice": "General",
        "audience": "General",
        "impact": "General",
        "legacy": "Legacy"
    },
    "sequels": {
        "sequel": "Sequel",
        "prequel": "General",
        "remake": "Remake",
        "spinoff": "General",
        "adaptations": "General",
        "installments": "General",
        "anthologies": "General",
        "miniseries": "General"
    },
    "trivia": {
        "trivia": "Trivia",
        "goofs": "General",
        "influences": "General",
        "inspiration": "General"
    },
    "controversy": {
        "controversies": "Controversies",
        "lawsuit": "General",
        "litigation": "General",
        "allegations": "General",
        "censorship": "General"
    },
    "postrelease": {
        "reappraisal": "General",
        "colourisation": "General",
        "postrelease": "General"
    },
    "miscellaneous": {
        "title": "General",
        "generalinfo": "General",
        "other": "General",
        "related": "General",
        "sources": "General",
        "footnotes": "General",
        "future": "General"
    }
}

const categorylist = Object.keys(film_categories);

//a function to get the film details
const getfilmdetails = async (filmtitle) => {
    let film_dict = {}
    //get all the film details using supabase sql functions
    film_dict['title'] = filmtitle
                
    const film_details = await supabase.rpc('get_film_details', {
        table_name: 'tamilfilms',
        column_name: 'film_details',
        title: filmtitle
    });

                
    film_dict['b_details'] = film_details.data[0]['result']['film_details'];
                
    const rawdata = await supabase.rpc('get_film_details', {
        table_name: 'tamilfilminfo',
        column_name: 'rawdata',
        title: filmtitle
    });
                
    film_dict['o_details'] = rawdata.data[0]['result']['rawdata'];
    
    const image = await supabase.rpc('g_film_image', {
        table_name: 'films',
        column_name: 'image',
        title: filmtitle
    });

    if(image.data[0] == null || image.data[0] == {result : null}){
        film_dict['image'] = 'noimage'; 
    }  
    else {
        film_dict['image'] = image.data[0]['result']       
    }       

    return film_dict;
}

//a function to perform keyword search on a given list of words
const keywordsearch = async (concreteinfolist) => {
    //convert string to list
    let common_films = []
    for (let i in concreteinfolist) {
        let film_list = []
        const { data: movie_list_concrete, count } = await supabase.rpc('g_picture_keyword', {
            p_keyword: concreteinfolist[i]
        }, { count: 'exact' });
        //push the films to film_list
        movie_list_concrete.forEach(row => {
            film_list.push(row.title);
        });
        common_films.push(film_list)
    }
    //now perform an operation to get all the items from all the lists and create a seperate list
    const keywordfilms = common_films.reduce((common, arr) => common.filter(item => arr.includes(item)));
    return keywordfilms; 
}

//a function to perform similarity search, with a list or without a list, have a case where if list is empty you just do similarity search for all the films
const vectorfilm_search = async (filmlist, unstructquery) => {
    //process the query and get the category 
    const response = await axios.post(queryprocessapiEndpoint, {
        content: unstructquery,
        categorylist: categorylist
        });

    const sel_categories = jsonrepair(response.data[0]);
    const sel_categories_list = JSON.parse(sel_categories.replace(/'/g, '"'));

    //as you are going to be using only one vector to check similarity between all columns
    const vec_response = await axios.post(encodeEndpoint, {
        sentence: unstructquery
    });

    let vectorfilmlist = []

    if (filmlist === null){
        //now loop through the list and get film list for each of the columns by using similarity search
        for (let i in sel_categories_list) {
            const category = sel_categories_list[i];
            //now get the columns in that category to perform a similarity search with each of them
            const category_cols = Object.keys(film_categories[category])
            //now loop through the columns and get the film list
            for (let j in category_cols) {
                const movie_list = await supabase.rpc('similarity_search', {
                t_name: 'tamilfilminfo',
                c_name: category_cols[j],
                q_embedding: vec_response.data,
                m_threshold: 0.3,
                m_count: 1
            });
                //pushing all the films into a single list
                for (let movie in movie_list.data) {
                    vectorfilmlist.push(movie_list.data[movie]);
                }
            }
        }
        //remove all duplicates
        const vectormovielist = [... new Set(vectorfilmlist)]

        return vectormovielist
    }
    else {
        //now loop through the list and get film list for each of the columns by using similarity search
        for (let i in sel_categories_list) {
            const category = sel_categories_list[i]
            //now get the columns in that category to perform a similarity search with each of them
            const category_cols = Object.keys(film_categories[category])
                //now loop through the columns and get the film list
                for (let j in category_cols) {
                    const movie_list = await supabase.rpc('targeted_similarity_search', {
                    t_name: 'tamilfilminfo',
                    c_name: category_cols[j],
                    q_embedding: vec_response.data,
                    m_threshold: 0.3,
                    m_count: 1,
                    title_list: filmlist
                });
                    //pushing all the films into a single list
                    for (let movie in movie_list.data) {
                        vectorfilmlist.push(movie_list.data[movie]);
                    }
                }
            }
            //remove all duplicates
            const vectormovielist = [... new Set(vectorfilmlist)]
    
            return vectormovielist       
    }
    
}
//this is the function which will process the queries and give the film list
const getfilmlist = async (query) => {
    //1. extract the concrete info like actors, directors or companies
    //2. extract the unstructured info
    //3. if 1 and 2 is true, then first do keyword search and then take that list and do similarity search within that
    //4. if only 2 is true, do only similarity search
    //5. if only 1 is true, do only keyword search
    
    //an endpoint to extract concrete info like actors, directors, production houses from the query
    const con_response = await axios.post(concreteinfoEndpoint, {
        content:query
    })

    const con_response_extracted = con_response.data[0]
    //has been convert into a list
    const con_response_cleaned = JSON.parse(con_response_extracted.replace(/'/g, '"'));

    console.log(`this is the concrete info: ${con_response_cleaned}`)

    //extract the unstructured info from the query, if there nothing then no need to process the query a simple keyword search will do
    const unstruct_response = await axios.post(unstructuredinfoEndpoint, {
        content: query,
    });

    const unstruct_response_extracted = unstruct_response.data[0]

    console.log(`this is the unstructured info: ${unstruct_response_extracted}`)

    //both keyword and similarity search
    if (con_response_cleaned[0] !== 'Nopeople' && unstruct_response_extracted !== 'Noinfo') {
        //first do keyword search
        const keywordfilms = await keywordsearch(con_response_cleaned)
        //use this list and do similarity search
        const vectorfilms = await vectorfilm_search(keywordfilms,unstruct_response_extracted)

        return vectorfilms;
    }

    //only keyword search
    else if (unstruct_response_extracted === 'Noinfo' && con_response_cleaned[0] !== 'Nopeople') {
        //do keyword search
        const keywordfilms = await keywordsearch(con_response_cleaned)
        return keywordfilms;
    }

    //only similarity search
    else if (con_response_cleaned[0] === 'Nopeople' && unstruct_response_extracted !== 'Noinfo') {
        //use this list and do similarity search
        const vectorfilms = await vectorfilm_search(null, unstruct_response_extracted)
        
        return vectorfilms;
    }
}

// A helper function to add a retry mechanism
const retry = async (fn, retries = 3, delay = 1000) => {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            // Attempt the function call
            return await fn();
        } catch (error) {
            // Log the error and try again
            console.error(`Attempt ${attempt + 1} failed:`, error);

            // If this was the last attempt, throw the error
            if (attempt === retries - 1) throw error;

            // Otherwise, wait for the specified delay before trying again
            await new Promise(res => setTimeout(res, delay));
        }
    }
};

// A function to take the getfilmlist function and return the film dictionary list
export const processquery = async (query) => {
    // Retry getting the film list if it fails
    const filmlist = await retry(() => getfilmlist(query), 4, 2000); // Retries 3 times with 1-second delay

    console.log(filmlist);

    // Initialize the final film dictionary list
    let final_film_dict = [];

    // Loop through the film list and retrieve details for each film
    for (let i in filmlist) {
        try {
            // Retry fetching the film details if it fails
            const filmdict = await retry(() => getfilmdetails(filmlist[i]), 4, 2000); // Retries 3 times with 1-second delay
            final_film_dict.push(filmdict);
        } catch (error) {
            console.error(`Failed to get details for film: ${filmlist[i]}`, error);
        }
    }

    return final_film_dict;
};
