import { searchapiEndpoint, encodeEndpoint } from "../config.js";
import axios from "axios";
import { getfilmobject } from "./filmdetailscontroller.js";  // Import the getfilmobject function

// Searchengine function that manages pagination
export const searchengine = async (query) => {
    // Step 1: Retrieve the query vector using the encode endpoint
    const vec_response = await axios.post(encodeEndpoint, {
        sentence: query
    });
    const query_vector = vec_response.data;

    const pagefilmidobject = {}

    const no_films_perpage = 18

    try {
        // Step 2: Send the query and vector to the search API to get all film IDs
        const response = await axios.post(searchapiEndpoint, {
            query: query,
            vector: query_vector
        });
        const film_ids = response.data.results;  // Retrieve all film IDs from the search API

        const no_of_films = film_ids.length


        let no_of_pages = 1

        //a code to get the number of pages
        if (no_of_films < no_films_perpage || no_of_films == no_films_perpage) {
            no_of_pages = 1
        }

        else {
            const extrafilms = no_of_films%no_films_perpage
            no_of_pages = ((no_of_films - extrafilms) / no_films_perpage) + 1
        }

        // Step 3: Create a dictionary with page number as key and a list of filmids as the value
        for (let page = 0; page < no_of_pages; page++) {
            const extrafilms = no_of_films%no_films_perpage
            const startfilm = (page)*no_films_perpage
            const endfilm = (page)*no_films_perpage + no_films_perpage - 1
            const pagenumber = page+1
            if (pagenumber != no_of_pages) {
                pagefilmidobject[pagenumber] = film_ids.slice(startfilm, endfilm + 1)
            }
            else{
                pagefilmidobject[pagenumber] = film_ids.slice(startfilm, startfilm + extrafilms + 1)
            }
        }
        return {filmobject:pagefilmidobject, noofpages:no_of_pages}

    } catch (error) {
        console.error("Search request failed:", error);
        throw error;
    }
}
