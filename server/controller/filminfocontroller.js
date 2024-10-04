import { supabase } from "../server.js";
import axios from "axios";

//this function will do the following:
//1. get each film from the film object
//2. starting from the generalinfo key, everything will be in vector form
//3. use the mapping to insert the vectors in the appropriate columns to reduce redundancy in columns
//4. this will create a big master table with all the film details in vector form along with the raw data

//a mapping of field to column in table to insert correctly
const columname_mapping = {
    "Plot": "plot",
    "Cast": "cast",
    "Production": "production",
    "Soundtrack": "soundtrack",
    "Music": "soundtrack",
    "Themes": "themes",
    "Trivia": "trivia",
    "Reception": "reception",
    "Release": "release",
    "Marketing": "marketing",
    "Sequel": "sequel",
    "Crew": "crew",
    "Controversies": "controversies",
    "Legacy": "legacy",
    "Accolades": "awards",
    "Remake": "remake",
    "Controversy": "controversies",
    "Synopsis": "synopsis",
    "Premise": "premise",
    "Remakes": "remake",
    "Summary": "summary",
    "Sources": "sources",
    "Receptions": "reception",
    "Future": "future",
    "Awards": "awards",
    "Songs": "songs",
    "Impact": "impact",
    "Background": "background",
    "Adaptation": "adaptation",
    "Storyline": "storyline",
    "Adaptations": "adaptations",
    "Availability": "availability",
    "Prequel": "prequel",
    "Re-release": "rerelease",
    "Inspiration": "inspiration",
    "Re-releases": "rerelease",
    "Sequels": "sequels",
    "Nominations": "nominations",
    "Title": "title",
    "Promotion": "promotion",
    "Filming": "filming",
    "Soundtracks": "soundtracks",
    "Spin-off": "spinoff",
    "Lawsuit": "lawsuit",
    "Festivals": "festivals",
    "Reviews": "reviews",
    "Development": "development",
    "Casting": "casting",
    "Tracklist": "tracklist",
    "Goofs": "goofs",
    "Litigation": "litigation",
    "Publicity": "publicity",
    "Installments": "installments",
    "Screenplay": "screenplay",
    "Box-office": "boxoffice",
    "Review": "review",
    "Delays": "delays",
    "Reappraisal": "reappraisal",
    "Certification": "certification",
    "Trailer": "trailer",
    "Anthologies": "anthologies",
    "Related": "related",
    "Premiere": "premiere",
    "Audience": "audience",
    "Censorship": "censorship",
    "Distribution": "distribution",
    "Installment": "installment",
    "Economics": "economics",
    "Post-release": "postrelease",
    "Miniseries": "miniseries",
    "Footnotes": "footnotes",
    "Film": "film",
    "Allegations": "allegations",
    "Theme": "theme",
    "Legend": "legend",
    "Colourisation": "colourisation",
    "Other": "other",
    "Influences": "influences",
    "generalinfo": "generalinfo"
}


export const writeFilmDetailsToDatabase = async (film) => {
    try{
        //extracting the data of each film to be written to the database
        const title = Object.keys(film)[0];
        const filmInfo = film[title];
        //a dictionary to get the data from generalinfo seperately
        let filmdetailsdict = {}
        //getting the keys and values of the filmInfo dictionary as an array of arrays
        const filmInfoArray = Object.entries(filmInfo);
        //a flag to know when the generalinfo field starts
        let flag = false;
        //first insert the title and entire structured data of a field
        const { data, error } = await supabase.rpc('insert_data_txt', {t_name: 'filminfo', col: 'title', val: title})
        for (let arr in filmInfoArray){
            if (filmInfoArray[arr][0] == 'generalinfo'){
                flag = true;
                filmdetailsdict[filmInfoArray[arr][0]] = filmInfoArray[arr][1]
            }
            if (flag) {
                //inserting the film details data
                filmdetailsdict[filmInfoArray[arr][0]] = filmInfoArray[arr][1]
                //now create a column with the field name in the  'filminfo' table in the database
                const col_string = `ADD COLUMN ${columname_mapping[filmInfoArray[arr][0]]} vector(384)`;
                const { data, error } = await supabase.rpc('add_cols', {t_name: 'filminfo', cols: col_string})
                //vectorize the data and store it in a variable
                const response = await axios.get(`http://127.0.0.1:8000/${filmInfoArray[arr][1]}`);
                const vec_data = response.data;
                try{
                    //now insert this data in to the newly created column above
                    const { data, error } = await supabase.rpc('insert_data_vec', {t_name: 'filminfo', col: columname_mapping[filmInfoArray[arr][0]], title: title, val: vec_data})
                } catch(err){
                    console.error(err)
                }               
            }
        }
        try{
            //inserting the structured data starting from generalinfo
            const { data, error } = await supabase.rpc('insert_data_json', {t_name: 'filminfo', col: 'rawdata', title: title, val: filmdetailsdict})
        } catch(err){
            console.error(err)
        }

    } catch(err){
        console.error(err)
    }
}