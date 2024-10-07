import { supabase } from "../server.js";

//function to write all the films to the database
export const writeFilmsToDatabase = async (film) => {
    try{
        //extracting the data of each film to be written to the database
    const title = Object.keys(film)[0];
    const filmInfo = film[title];
    //a dictionary to store the data to be written to the 'films' table
    const filmDetails = {};
    //getting the keys and values of the filmInfo dictionary as an array of arrays
    const filmInfoArray = Object.entries(filmInfo);
    //extracting details till before the 'generalinfo' field to be written to the 'films' table
    for (let arr in filmInfoArray) {
        if (filmInfoArray[arr][0] === 'generalinfo') {
            break;
        }
        filmDetails[filmInfoArray[arr][0]] = filmInfoArray[arr][1]; 
    }
    //inserting the data to the 'films' table
    const { error } = await supabase
            .from('tamilfilms')
            .insert({ title: title, film_details: filmDetails });

        if (error) {
            console.error(`Error in inserting film "${title}":`, error);
            throw error;
        }

        console.log('Film inserted successfully:', title);
    } catch (error) {
        console.error(`Error in writing film to database:`, error);
        throw error;
    }
}

