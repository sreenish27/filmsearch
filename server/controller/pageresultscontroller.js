import axios from "axios";
import { getfilmobject } from "./filmdetailscontroller.js";  // Import the getfilmobject function

// Searchengine function that manages pagination
export const getlistoffilmobjects = async (pagefilmidobject, pagenumber) => {

    let pagefilmobjectlist = []
    console.log(pagenumber)
    console.log(pagefilmidobject)
    const formattedPageNumber = String(pagenumber)
    //first get the filmlist to iterate over based on page number
    const pagefilmlist = pagefilmidobject[formattedPageNumber]

    //iterate through the filmlist and get the object for each of them and put it into a big list
    try {
        for (let film in pagefilmlist) {
            //get the filmobject
            const movieobject = await getfilmobject(pagefilmlist[film])
            pagefilmobjectlist.push(movieobject)
        }

        return pagefilmobjectlist

    } catch (error) {
        console.error("Search request failed:", error);
        throw error;
    }
}
